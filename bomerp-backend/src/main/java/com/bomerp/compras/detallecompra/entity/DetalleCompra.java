/*
 * Ruta: bomerp-backend/src/main/java/com/bomerp/compras/detallecompra/entity/DetalleCompra.java
 * CAMBIO SOLICITADO: persistir cuántas unidades de cada línea ya fueron recibidas.
 */
package com.bomerp.compras.detallecompra.entity;
import com.bomerp.compras.compra.entity.Compra;

import com.bomerp.catalogo.producto.entity.Producto;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(name = "DETALLE_COMPRA")
@Getter
@Setter
@NoArgsConstructor
public class DetalleCompra {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "compra_id", nullable = false)
    private Compra compra;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "producto_id", nullable = false)
    private Producto producto;

    @Column(nullable = false)
    private Integer cantidad;

    /** Unidades recepcionadas. Null en filas antiguas equivale a cantidad completa ya ingresada al stock. */
    @Column(name = "cantidad_recibida")
    private Integer cantidadRecibida = 0;

    @Column(name = "precio_unitario_compra", nullable = false, precision = 12, scale = 2)
    private BigDecimal precioUnitarioCompra;

    /* Explicación del cambio: las compras previas ya aumentaron el stock completo; el fallback evita
       mostrarlas pendientes antes de ejecutar la migración SQL. Las compras nuevas comienzan en cero. */
    public Integer getCantidadRecibida() {
        return cantidadRecibida != null ? cantidadRecibida : cantidad;
    }
}
