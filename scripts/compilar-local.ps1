$ErrorActionPreference='Stop'
$raiz=Split-Path $PSScriptRoot -Parent
$env:MAVEN_OPTS="-Xmx512m -Duser.home=$($raiz.Replace('\','/'))/.cache/maven-home -Dmaven.repo.local=$($raiz.Replace('\','/'))/.cache/m2"
$env:npm_config_cache="$raiz\.cache\npm"
Push-Location "$raiz\bomerp-backend"
try { & mvn.cmd -B -ntp '-DexcludedGroups=oracle' verify; if($LASTEXITCODE -ne 0){throw 'Fallo la verificacion del backend'} } finally { Pop-Location }
Push-Location "$raiz\bomerp-frontend"
try {
    & npm.cmd test -- --watch=false
    if($LASTEXITCODE -ne 0){throw 'Fallaron las pruebas del frontend'}
    & npm.cmd run build:prod
    if($LASTEXITCODE -ne 0){throw 'Fallo la compilacion del frontend'}
} finally { Pop-Location }
