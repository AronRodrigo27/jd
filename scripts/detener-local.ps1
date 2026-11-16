$ErrorActionPreference = 'Stop'
$raiz = Split-Path $PSScriptRoot -Parent
$errores = @()
foreach ($nombre in @('frontend','backend','keycloak')) {
    $archivo = "$raiz\logs\$nombre-proceso.json"
    if (-not (Test-Path $archivo)) { continue }
    $guardado = Get-Content $archivo -Raw | ConvertFrom-Json
    foreach ($objetivo in @(@{ Id=$guardado.ServidorId; Inicio=$guardado.ServidorInicio }, @{ Id=$guardado.Id; Inicio=$guardado.Inicio })) {
        if (-not $objetivo.Id) { continue }
        try {
            $p = Get-Process -Id $objetivo.Id -ErrorAction SilentlyContinue
            if ($p -and $p.StartTime.ToUniversalTime().ToString('o') -eq $objetivo.Inicio) {
                Stop-Process -Id $p.Id -Force -ErrorAction Stop
            }
        } catch {
            $errores += "$nombre ($($objetivo.Id)): $($_.Exception.Message)"
        }
    }
}
if ($errores.Count -gt 0) { throw "No se pudieron detener todos los procesos: $($errores -join '; ')" }
Write-Host 'Servicios locales detenidos. Las bases de datos se conservan.'
