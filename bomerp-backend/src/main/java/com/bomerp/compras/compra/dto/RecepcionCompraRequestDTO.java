/*
 * Ruta: bomerp-backend/src/main/java/com/bomerp/compras/compra/dto/RecepcionCompraRequestDTO.java
 * CAMBIO SOLICITADO: recibir unidades por línea en una compra ya registrada, sin duplicar la factura.
 */
package com.bomerp.compras.compra.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record RecepcionCompraRequestDTO(
        @NotEmpty(message = "Indique al menos una línea que llegó")
        List<@Valid LineaRecepcionDTO> lineas
) {
    public record LineaRecepcionDTO(
            @NotNull Long detalleCompraId,
            @NotNull @Min(value = 1, message = "La cantidad recibida debe ser al menos 1") Integer cantidad
    ) {}
}

/* Flujo: el frontend envía solo lo que llegó ahora; el backend compara contra el saldo pendiente,
   actualiza el stock dentro de la transacción y conserva el total original de la factura. */
