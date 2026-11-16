-- Ruta: bomerp-backend/migracion_recepcion_parcial_compras.sql
-- CAMBIO SOLICITADO: guardar el avance de recepción por línea de compra.
-- Ejecutar una sola vez en instalaciones existentes con ddl-auto=validate (producción).
-- Las filas antiguas ya sumaron todas sus unidades al stock al registrar la compra; se marcan completas.

ALTER TABLE DETALLE_COMPRA
    ADD (CANTIDAD_RECIBIDA NUMBER(10) DEFAULT 0 NOT NULL);

UPDATE DETALLE_COMPRA
   SET CANTIDAD_RECIBIDA = CANTIDAD;

COMMIT;

-- Las compras nuevas comienzan con CANTIDAD_RECIBIDA = 0 desde CompraService.
-- Las recepciones posteriores incrementan esta columna y el stock por la misma cantidad; no actualizan
-- TOTAL, SUBTOTAL, IGV, pagos ni saldo. El estado de entrega se calcula como PENDIENTE/PARCIAL/COMPLETA.
