import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const require=createRequire('C:/Users/T460s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/');
const { chromium }=require('playwright');
const env=Object.fromEntries((await readFile(new URL('../bomerp-backend/.env',import.meta.url),'utf8'))
  .split(/\r?\n/).filter(l=>l&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i),l.slice(i+1)];}));
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
const results=[];
try {
  const ctx=await browser.newContext();
  const page=await ctx.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(`JS ${e.message}`));
  page.on('response',r=>{if(r.status()>=500&&r.url().startsWith('http://127.0.0.1:8080/'))errors.push(`${r.status()} ${new URL(r.url()).pathname}`)});
  await page.goto('http://localhost:4200/ventas',{waitUntil:'domcontentloaded'});
  try { await page.locator('#username').waitFor({timeout:15000}); }
  catch(e) { console.error('URL',page.url(),'TITLE',await page.title(),'BODY',(await page.locator('body').innerText()).slice(0,500),'ERRORS',errors); throw e; }
  await page.locator('#username').fill('lisandro');
  await page.locator('#password').fill(env.SGEJD_CLAVE_LISANDRO);
  await page.locator('#kc-login').click();
  await page.waitForURL('http://localhost:4200/ventas',{timeout:30000});
  results.push({pantalla:'login PKCE',ok:true});
  for(const path of ['','catalogo/categorias','catalogo/productos','clientes','proveedores','proformas','ventas','cobranza','compras','compras/por-pagar','inventario/ajustes','postventa','servicios/agenda','servicios/agenda-mantenimientos','servicios/ordenes','servicios/equipos','servicios/contratos','reportes/rentabilidad','configuracion','configuracion/permisos','configuracion/historial']) {
    await page.goto('http://localhost:4200/'+path,{waitUntil:'domcontentloaded'});
    await page.waitForTimeout(500);
    const ok=page.url().startsWith('http://localhost:4200/'+path)&&!((await page.locator('body').innerText()).includes('Cannot GET'));
    results.push({pantalla:path||'inicio',ok,titulo:await page.title()});
    console.log(`${ok?'OK':'FALLO'} ${path||'inicio'}`);
    assert.ok(ok,`Pantalla ${path}`);
  }
  assert.equal(errors.length,0,`Errores API: ${errors.join(', ')}`);
  console.log(`Navegacion: ${results.length} comprobaciones, API 5xx: ${errors.length}`);
} finally { await browser.close(); }
