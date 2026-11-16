import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

// Prueba real de desarrollo: conserva registros claramente marcados PRUEBA H2.
// Usa JWT firmados por Keycloak y la base persistente local, sin enviar correos ni SUNAT.
const root = new URL('../', import.meta.url);
const env = Object.fromEntries((await readFile(new URL('bomerp-backend/.env', root), 'utf8'))
  .split(/\r?\n/).filter(l => l && !l.startsWith('#')).map(l => {const i=l.indexOf('=');return [l.slice(0,i),l.slice(i+1)];}));
const checks = [];
const stamp = Date.now().toString().slice(-8);
const today = new Intl.DateTimeFormat('en-CA', {timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
let admin;
async function login(user) {
  const r = await fetch('http://127.0.0.1:38080/realms/bomerp/protocol/openid-connect/token', {
    method:'POST', body:new URLSearchParams({grant_type:'password',client_id:'sgejd-pruebas',username:user,password:env['SGEJD_CLAVE_'+user.toUpperCase()]}), signal:AbortSignal.timeout(15000)
  });
  assert.equal(r.status,200,'Login '+user);
  const t=await r.json(); checks.push({prueba:'Login real '+user,ok:true}); return t.access_token;
}
async function api(method,path,data,token=admin,expected=[200,201,204]) {
  const url=path.startsWith('/api/')||path.startsWith('/actuator/')||path.startsWith('/v3/')?path:'/api/v1/admin'+path;
  const r=await fetch('http://127.0.0.1:8080'+url,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(data!==undefined?{'Content-Type':'application/json'}:{})},body:data===undefined?undefined:JSON.stringify(data),signal:AbortSignal.timeout(30000)});
  const buffer=Buffer.from(await r.arrayBuffer());
  const content=r.headers.get('content-type')||'';
  const body=content.includes('json')&&buffer.length?JSON.parse(buffer.toString()):buffer;
  const ok=expected.includes(r.status);
  checks.push({prueba:method+' '+path,status:r.status,ok});
  assert.ok(ok, `${method} ${path}: HTTP ${r.status} ${JSON.stringify(body).slice(0,700)}`);
  return body;
}
function verify(name,condition){checks.push({prueba:name,ok:!!condition});assert.ok(condition,name);}
let created={};
try {
  verify('Health UP',(await api('GET','/actuator/health',undefined,null)).status==='UP');
  admin=await login('lisandro');
  const assistant=await login('lucy');
  await api('GET','/api/v1/auth/perfil');
  await api('GET','/clientes',undefined,null,[401]);
  await api('POST','/categorias',{nombre:'No permitido'},assistant,[403]);
  await api('POST','/categorias',{},admin,[400]);
  const cat=await api('POST','/categorias',{nombre:'PRUEBA H2 '+stamp,descripcion:'Verificacion local'});
  const client=await api('POST','/clientes',{tipo:'PERSONA_NATURAL',nombreORazonSocial:'PRUEBA H2 Cliente '+stamp,dni:stamp,agenteRetencion:false});
  const supplier=await api('POST','/proveedores',{tipo:'PERSONA_NATURAL',nombreORazonSocial:'PRUEBA H2 Proveedor '+stamp,dni:stamp});
  const product=await api('POST','/productos',{nombre:'PRUEBA H2 Material '+stamp,categoriaId:cat.id,sector:'MATERIAL_SERVICIO',costoBase:100,margenPorcentaje:20,moneda:'SOLES',stockActual:10,stockMinimo:2,visibleEnCatalogo:true});
  const equipment=await api('POST','/productos',{nombre:'PRUEBA H2 Equipo '+stamp,categoriaId:cat.id,sector:'CLIMATIZACION',costoBase:1000,margenPorcentaje:20,moneda:'SOLES',stockActual:null,stockMinimo:0,visibleEnCatalogo:true});
  created={categoriaId:cat.id,clienteId:client.id,proveedorId:supplier.id,productoId:product.id,equipoProductoId:equipment.id};
  await api('GET','/api/v1/publico/catalogo',undefined,null);
  const proforma=await api('POST','/proformas',{clienteId:client.id,moneda:'SOLES',diasVigencia:15,tipoCambio:3.5,items:[{productoId:equipment.id,cantidad:1},{productoId:product.id,cantidad:3}]});
  await api('POST',`/proformas/${proforma.id}/aceptar`);
  const sale=await api('POST',`/ventas/desde-proforma/${proforma.id}?tipoPago=CREDITO&diasCredito=30`,{rutinaMantenimiento:{frecuenciaMeses:3,visitas:4,primeraVisita:null}});
  created.ventaId=sale.id;
  verify('Venta descuenta stock',(await api('GET',`/productos/${product.id}`)).stockActual===7);
  const visits=await api('GET',`/mantenimientos?vista=TODOS&clienteId=${client.id}`);
  verify('Venta programa 4 mantenimientos',visits.filter(v=>v.ventaId===sale.id).length===4);
  const bill=(await api('GET',`/facturacion/estados?ventaIds=${sale.id}`))[0].comprobante;
  verify('Facturacion genera comprobante',!!bill);
  const pdf=await api('GET',`/facturacion/ventas/${sale.id}/pdf`);
  verify('PDF valido',Buffer.isBuffer(pdf)&&pdf.subarray(0,4).toString()==='%PDF');
  for(const monto of [Number((sale.total/2).toFixed(2)),Number((sale.total-sale.total/2).toFixed(2))]) {
    await api('POST','/cobranza/cobros',{clienteId:client.id,moneda:'SOLES',metodoPago:'EFECTIVO',abonos:[{ventaId:sale.id,monto}]});
  }
  verify('Cobranza completa salda venta',!(await api('GET',`/cobranza/por-cobrar?clienteId=${client.id}`)).some(x=>x.ventaId===sale.id));
  await api('PATCH',`/ventas/${sale.id}/anular`,{motivo:'Prueba local H2: anular y verificar stock'},assistant,[403]);
  await api('PATCH',`/ventas/${sale.id}/anular`,{motivo:'Prueba local H2: anular y verificar stock'});
  verify('Anulacion restaura stock',(await api('GET',`/productos/${product.id}`)).stockActual===10);
  verify('Anulacion genera devolucion',(await api('GET','/cobranza/devoluciones')).some(x=>x.ventaId===sale.id));
  const buy=await api('POST','/compras',{proveedorId:supplier.id,fechaCompra:today,numeroFactura:'F001-'+stamp,moneda:'SOLES',tipoPago:'CREDITO',diasCredito:30,detalles:[{productoId:product.id,cantidad:5,precioUnitarioCompra:100}]});
  created.compraId=buy.id;
  verify('Compra incrementa stock',(await api('GET',`/productos/${product.id}`)).stockActual===15);
  const payment=await api('POST','/cuentas-por-pagar/pagos',{compraId:buy.id,monto:50,metodo:'EFECTIVO',observacion:'PRUEBA H2'});
  await api('POST',`/cuentas-por-pagar/pagos/${payment.id}/anular`,{motivo:'Verificacion local de anulacion'});
  await api('POST','/inventario/ajustes',{productoId:product.id,motivo:'CONTEO_FISICO',stockContado:14,observacion:'PRUEBA H2 conteo'});
  verify('Ajuste modifica stock',(await api('GET',`/productos/${product.id}`)).stockActual===14);
  const installed=await api('POST','/equipos',{clienteId:client.id,productoId:equipment.id,numeroSerie:'H2-'+stamp,fechaInstalacion:today,mesesGarantia:12,frecuenciaMeses:3});
  await api('GET',`/equipos/${installed.id}`);
  const order=await api('POST','/ordenes',{tipo:'MANTENIMIENTO',clienteId:client.id,equipoId:installed.id,fechaProgramada:today,horaInicio:'09:00',duracionMinutos:60,tecnico:'PRUEBA H2 '+stamp,descripcion:'Verificacion de mantenimiento local'});
  await api('POST',`/ordenes/${order.id}/cancelar`,{motivo:'Fin de prueba de programacion'});
  const end=new Date(today+'T12:00:00Z');end.setUTCFullYear(end.getUTCFullYear()+1);
  const contract=await api('POST','/contratos',{clienteId:client.id,fechaInicio:today,fechaFin:end.toISOString().slice(0,10),frecuenciaMeses:3,montoVisita:150,moneda:'SOLES',descripcion:'PRUEBA H2 contrato'});
  await api('POST',`/contratos/${contract.id}/cancelar`,{motivo:'Fin de prueba de contrato'});
  await api('GET','/permisos');
  await api('GET','/permisos',undefined,assistant,[403]);
  // Recorre las consultas sin parametros obligatorios del contrato OpenAPI.
  const spec=await api('GET','/v3/api-docs',undefined,null);
  for(const [path,ops] of Object.entries(spec.paths)) {
    if(!path.startsWith('/api/v1/admin/')||path.includes('{')||!ops.get)continue;
    if((ops.get.parameters||[]).some(p=>p.required))continue;
    if(path.includes('tipo-cambio'))continue;
    try {await api('GET',path);}catch(e){console.error(e.message);}
  }
} catch(e) {
  checks.push({prueba:'Flujo completo',ok:false,error:e.message});
  console.error(e.stack);
} finally {
  const report={fecha:new Date().toISOString(),motor:'H2 persistente',created,passed:checks.filter(c=>c.ok).length,failed:checks.filter(c=>!c.ok).length,checks};
  console.log(JSON.stringify(report,null,2));
  if(report.failed)process.exitCode=1;
}
