# SGE-JD local con H2

Carpeta de instalacion: `E:\upeu\lp2\empresa`.

## Uso diario

1. Haga doble clic en `INICIAR.bat` y espere el mensaje de sistema disponible.
2. Abra http://localhost:4200 e inicie sesion.
3. Al terminar, use `DETENER.bat`. Los datos se conservan.

Las claves estan en `bomerp-backend\.env`:

- Usuario `lisandro` (ADMIN): valor de `SGEJD_CLAVE_LISANDRO`.
- Usuario `lucy` (ASISTENTE): valor de `SGEJD_CLAVE_LUCY`.
- Consola Keycloak, usuario `admin`: valor de `KC_ADMIN_PASSWORD`.

Son credenciales de desarrollo local. Los servicios escuchan solo en 127.0.0.1.

## Servicios y almacenamiento

- Web Angular: http://localhost:4200.
- API: http://localhost:8080. Estado: http://localhost:8080/actuator/health.
- Swagger: http://localhost:8080/swagger-ui.html.
- Keycloak: http://localhost:38080.
- Datos de negocio H2: `bomerp-backend\data\sge-jd.mv.db`.
- Usuarios y roles: `herramientas\keycloak-26.8.0\data\h2\` (H2 de Keycloak).
- Registros de ejecucion y resultados: carpeta `logs`.

Esta instalacion usa Java directamente para Keycloak. No requiere Docker,
Oracle ni PostgreSQL. El Compose original conserva la configuracion Oracle
del repositorio.

La configuracion H2 se encuentra en
`bomerp-backend\src\main\resources\application-local.properties`, ignorada por Git.
Hibernate crea las tablas al arrancar. Las migraciones PL/SQL, procedimientos y
disparadores academicos de Oracle se conservan como fuentes, pero no se ejecutan
en H2. H2 es para desarrollo local; no equivale a validar el despliegue Oracle.

RUC/DNI y facturacion estan en modo simulado. No se configuraron correo SMTP real,
certificados digitales ni envio de comprobantes a SUNAT.
La consola web de H2 esta deshabilitada; los datos se administran desde la aplicacion.

## Compilar y repetir pruebas

Desde PowerShell en esta carpeta:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\compilar-local.ps1
node .\scripts\probar-api.mjs
```

El primer comando ejecuta pruebas de backend independientes de Oracle, pruebas
Angular y compilacion de produccion con verificacion CSP. El segundo requiere
los tres servicios encendidos, usa usuarios reales y crea registros identificados
con `PRUEBA H2`. El resultado aparece en la terminal.

Las pruebas originales etiquetadas `oracle` requieren una base Oracle poblada
con sus fixtures originales. Las pruebas SUNAT beta requieren activacion y un
certificado; no se activan en este entorno.

## Respaldo y recursos

Detenga los servicios antes de copiar las carpetas de datos indicadas arriba.
No borre esas carpetas: contienen los registros y usuarios guardados.
El backend tiene un limite de heap de 512 MB y Keycloak de 384 MB; el consumo
total de cada proceso es mayor porque incluye memoria adicional de Java.
Angular y el navegador consumen memoria aparte.

Los scripts usan el Java 21, Maven y Node ya instalados en este equipo. El script
original de configuracion de Keycloak solo requiere Python si el realm se
pierde y hay que crearlo de nuevo. Las caches Maven y npm quedan en `.cache`.
Si cambia la ubicacion de Java, ajuste su ruta en `scripts`.
