/*
 * Ruta: bomerp-frontend/src/app/features/compras/compra/compra.model.ts
 * CAMBIO SOLICITADO: reflejar cantidades recibidas/pendientes y enviar recepciones de una compra existente.
 */
export interface DetalleCompraRequest {
  productoId: number;
  cantidad: number;
  precioUnitarioCompra: number;
}

export interface CompraRequest {
  proveedorId: number;
  fechaCompra: string;
  /** Obligatorio, formato SERIE-NÚMERO (F001-123). La misma factura del mismo proveedor no se acepta dos veces. */
  numeroFactura: string;
  moneda: 'SOLES' | 'DOLARES';
  /** Referencial: el backend recalcula el total con las líneas. */
  total: number;
  detalles: DetalleCompraRequest[];
  /** CONTADO (por defecto) o CREDITO: a crédito queda en Cuentas por pagar. */
  tipoPago: 'CONTADO' | 'CREDITO';
  /** Solo a crédito: 1 a 365. */
  diasCredito: number | null;
}

export interface CompraResponse {
  id: number;
  proveedor?: { id: number; nombreORazonSocial: string };
  fechaCompra: string;
  numeroFactura?: string;
  moneda: 'SOLES' | 'DOLARES';
  total: number;
  detalles: {
    id: number;
    producto: { id: number; nombre: string };
    cantidad: number;
    cantidadRecibida: number;
    cantidadPendiente: number;
    precioUnitarioCompra: number;
  }[];
  estadoEntrega: 'PENDIENTE' | 'PARCIAL' | 'COMPLETA';
  tipoPago: 'CONTADO' | 'CREDITO';
  diasCredito: number | null;
  fechaVencimiento: string | null;
  estadoPago: 'PAGADA' | 'PENDIENTE';
  /** Pagado al proveedor (al contado = total). */
  pagado: number | null;
  saldo: number | null;
  registradoPor: string | null;
  /** Total sin IGV y el IGV de la compra (auditoría M2; el total ya lo incluye). */
  subtotal?: number | null;
  igv?: number | null;
}

export interface RecepcionCompraRequest {
  lineas: { detalleCompraId: number; cantidad: number }[];
}

/* Flujo: las cantidades de recepción se registran aparte de la compra original; el estado de entrega
   informa el avance físico y no reemplaza ni modifica los campos financieros de CompraResponse. */
