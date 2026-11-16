/*
 * Ruta: bomerp-backend/src/main/java/com/bomerp/compras/compra/dto/CompraResponseDTO.java
 * CAMBIO SOLICITADO: exponer cantidades recibidas, pendientes y estado de entrega sin alterar el total.
 */
package com.bomerp.compras.compra.dto;

import com.bomerp.compras.compra.entity.Compra;
import com.bomerp.compras.detallecompra.entity.DetalleCompra;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record CompraResponseDTO(
        Long id,
        ProveedorDTO proveedor,
        LocalDate fechaCompra,
        String numeroFactura,
        String moneda,
        BigDecimal total,
        List<DetalleCompraResponseDTO> detalles,
        String tipoPago,
        Integer diasCredito,
        LocalDate fechaVencimiento,
        String estadoPago,
        /** Suma de los pagos vigentes (al contado = total). */
        BigDecimal pagado,
        BigDecimal saldo,
        String registradoPor,
        /** Total sin IGV y el IGV de la compra (auditoría M2; el total ya lo incluye). */
        BigDecimal subtotal,
        BigDecimal igv,
        String estadoEntrega
) {
    public record ProveedorDTO(
            Long id,
            String nombreORazonSocial
    ) {}

    public record ProductoDTO(
            Long id,
            String nombre
    ) {}

    public record DetalleCompraResponseDTO(
            Long id,
            ProductoDTO producto,
            Integer cantidad,
            Integer cantidadRecibida,
            Integer cantidadPendiente,
            BigDecimal precioUnitarioCompra
    ) {}

    /** Sin pagos cargados: al contado el saldo es 0; a crédito se usa el estado (detalle en Cuentas por pagar). */
    public static CompraResponseDTO desdeEntidad(Compra c) {
        BigDecimal pagado = c.getTipoPago() == Compra.TipoPago.CREDITO && c.getEstadoPago() == Compra.EstadoPago.PENDIENTE
                ? null : c.getTotal();
        return desdeEntidad(c, pagado);
    }

    /** @param pagado lo pagado al proveedor (null = no se calculó) */
    public static CompraResponseDTO desdeEntidad(Compra c, BigDecimal pagado) {
        ProveedorDTO provDto = c.getProveedor() != null
                ? new ProveedorDTO(c.getProveedor().getId(), c.getProveedor().getNombreORazonSocial())
                : null;

        List<DetalleCompraResponseDTO> detalles = c.getDetalles() != null
                ? c.getDetalles().stream()
                .map(d -> new DetalleCompraResponseDTO(
                        d.getId(),
                        d.getProducto() != null ? new ProductoDTO(d.getProducto().getId(), d.getProducto().getNombre()) : null,
                        d.getCantidad(),
                        d.getCantidadRecibida(),
                        Math.max(0, d.getCantidad() - d.getCantidadRecibida()),
                        d.getPrecioUnitarioCompra()
                ))
                .toList()
                : List.of();

        // Estado de entrega derivado: no se confunde con el pago ni recalcula el total de la factura.
        int unidadesCompradas = c.getDetalles().stream().mapToInt(DetalleCompra::getCantidad).sum();
        int unidadesRecibidas = c.getDetalles().stream().mapToInt(DetalleCompra::getCantidadRecibida).sum();
        String estadoEntrega = unidadesRecibidas == 0 ? "PENDIENTE"
                : unidadesRecibidas >= unidadesCompradas ? "COMPLETA" : "PARCIAL";

        return new CompraResponseDTO(
                c.getId(),
                provDto,
                c.getFechaCompra(),
                c.getNumeroFactura(),
                c.getMoneda() != null ? c.getMoneda().name() : null,
                c.getTotal(),
                detalles,
                c.getTipoPago() != null ? c.getTipoPago().name() : Compra.TipoPago.CONTADO.name(),
                c.getDiasCredito(),
                c.getFechaVencimiento(),
                c.getEstadoPago() != null ? c.getEstadoPago().name() : Compra.EstadoPago.PAGADA.name(),
                pagado,
                pagado == null ? null : c.getTotal().subtract(pagado).max(BigDecimal.ZERO),
                c.getRegistradoPor(),
                c.getSubtotal(),
                c.getIgv(),
                estadoEntrega
        );
    }
}

/* Flujo: cada detalle muestra pedido/recibido/pendiente; la cabecera resume la entrega.
   Total, pagado y saldo permanecen independientes de la mercancía recibida. */
