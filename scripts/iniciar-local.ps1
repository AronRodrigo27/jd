param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$raiz = Split-Path $PSScriptRoot -Parent
New-Item -ItemType Directory -Force "$raiz\logs" | Out-Null
function Disponible([string]$Url) {
    try { $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3; return $r.StatusCode -eq 200 } catch { return $false }
}
function ProcesoEscuchando([int]$Puerto) {
    $lineas = & netstat.exe -ano -p tcp
    foreach ($linea in $lineas) {
        if ($linea -match "^\s*TCP\s+127\.0\.0\.1:$Puerto\s+\S+\s+LISTENING\s+(\d+)\s*$") {
            return Get-Process -Id ([int]$Matches[1]) -ErrorAction Stop
        }
    }
    throw "No se encontro el proceso que escucha en el puerto $Puerto."
}
function Iniciar([string]$Nombre, [string]$Url, [int]$Puerto) {
    if (Disponible $Url) { Write-Host "$Nombre ya responde."; return }
    $ps = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
    $p = Start-Process -FilePath $ps -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File',"`"$PSScriptRoot\servicio-local.ps1`"",'-Servicio',$Nombre) -WorkingDirectory $raiz -WindowStyle Hidden -RedirectStandardOutput "$raiz\logs\$Nombre.log" -RedirectStandardError "$raiz\logs\$Nombre-error.log" -PassThru
    @{ Id=$p.Id; Inicio=$p.StartTime.ToUniversalTime().ToString('o') } | ConvertTo-Json | Set-Content "$raiz\logs\$Nombre-proceso.json"
    for ($i=0; $i -lt 120; $i++) {
        if (Disponible $Url) {
            $servidor = ProcesoEscuchando $Puerto
            @{ Id=$p.Id; Inicio=$p.StartTime.ToUniversalTime().ToString('o'); ServidorId=$servidor.Id; ServidorInicio=$servidor.StartTime.ToUniversalTime().ToString('o') } | ConvertTo-Json | Set-Content "$raiz\logs\$Nombre-proceso.json"
            Write-Host "$Nombre listo."
            return
        }
        if ($p.HasExited) { throw "$Nombre termino. Consulte logs\$Nombre-error.log y logs\$Nombre.log" }
        Start-Sleep -Seconds 2
    }
    throw "Tiempo de espera agotado para $Nombre. Consulte la carpeta logs."
}
Iniciar 'keycloak' 'http://127.0.0.1:38080/realms/master/.well-known/openid-configuration' 38080
if (-not (Disponible 'http://127.0.0.1:38080/realms/bomerp/.well-known/openid-configuration')) {
    $python = Get-Command python.exe -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -First 1
    if (-not $python) { $python = 'C:\Users\T460s\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' }
    if (-not (Test-Path $python)) { throw 'Falta Python para configurar el realm inicial de Keycloak.' }
    $env:PYTHONIOENCODING='utf-8'
    & $python "$raiz\bomerp-backend\keycloak\configurar_realm.py"
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo configurar Keycloak.' }
}
Iniciar 'backend' 'http://127.0.0.1:8080/actuator/health' 8080
Iniciar 'frontend' 'http://127.0.0.1:4200/' 4200
Write-Host 'Sistema disponible: http://localhost:4200'
if (-not $NoBrowser) { Start-Process 'http://localhost:4200' }
