param([Parameter(Mandatory=$true)][ValidateSet('keycloak','backend','frontend')][string]$Servicio)
$ErrorActionPreference = 'Stop'
$raiz = Split-Path $PSScriptRoot -Parent
$java = Get-Command java.exe -ErrorAction SilentlyContinue | Select-Object -First 1
$maven = Get-Command mvn.cmd -ErrorAction SilentlyContinue | Select-Object -First 1
$node = Get-Command node.exe -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $java) { throw 'Falta Java 21 en PATH.' }
if (-not $maven) { throw 'Falta Maven en PATH.' }
if (-not $node) { throw 'Falta Node.js en PATH.' }
$env:JAVA_HOME = Split-Path (Split-Path $java.Source -Parent) -Parent
$env:Path = "$env:JAVA_HOME\bin;$(Split-Path $maven.Source -Parent);$(Split-Path $node.Source -Parent);$env:Path"
$env:JAVA_TOOL_OPTIONS = '-Duser.timezone=America/Lima'
switch ($Servicio) {
    'keycloak' {
        $linea = Get-Content "$raiz\bomerp-backend\.env" | Where-Object { $_ -match '^KC_ADMIN_PASSWORD=' } | Select-Object -First 1
        if (-not $linea) { throw 'Falta KC_ADMIN_PASSWORD en .env' }
        $env:KC_BOOTSTRAP_ADMIN_USERNAME = 'admin'
        $env:KC_BOOTSTRAP_ADMIN_PASSWORD = $linea.Substring($linea.IndexOf('=') + 1)
        $env:JAVA_OPTS_KC_HEAP = '-Xms64m -Xmx384m -XX:MaxMetaspaceSize=256m'
        Set-Location "$raiz\herramientas\keycloak-26.8.0"
        & .\bin\kc.bat start-dev --db=dev-file --http-host=127.0.0.1 --http-port=38080 --hostname=http://localhost:38080
    }
    'backend' {
        Set-Location "$raiz\bomerp-backend"
        & java -Xms64m -Xmx512m -jar target\bomerp-backend-0.0.1-SNAPSHOT.jar
    }
    'frontend' {
        Set-Location "$raiz\bomerp-frontend"
        $env:NG_CLI_ANALYTICS = 'false'
        & npm.cmd start -- --host 127.0.0.1
    }
}
exit $LASTEXITCODE
