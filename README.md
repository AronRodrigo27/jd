# SGE-JD

Respaldo reproducible del entorno de desarrollo, formado por el backend Spring Boot,
el frontend Angular y los scripts de inicio y pruebas.

## Contenido excluido deliberadamente

No se versionan datos locales, contraseñas, tokens, dependencias descargadas ni
artefactos compilados. En particular, no están incluidos `bomerp-backend/.env`,
`bomerp-backend/data/`, `.cache/`, `node_modules/`, `target/`, `logs/` ni la
distribución descargada de Keycloak. Esto evita publicar credenciales y permite
recrear el entorno de forma limpia.

## Preparación en otra máquina

1. Clone este repositorio.
2. Instale Java 21, Maven y Node.js.
3. Cree `bomerp-backend/.env` a partir de los archivos de ejemplo y proporcione
   las credenciales locales requeridas.
4. Descargue y extraiga Keycloak 26.8.0 en `herramientas/keycloak-26.8.0`.
5. Ejecute `INICIAR.bat` y consulte [INICIO-LOCAL-H2.md](INICIO-LOCAL-H2.md)
   para los detalles del entorno local.

Para trasladar datos de desarrollo, detenga los servicios y realice una copia
privada y segura de las bases H2 fuera de Git.
