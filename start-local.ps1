$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$env:Path = 'C:\Program Files\nodejs;C:\Program Files\Git\cmd;' + $env:Path
$node = (Get-Command node.exe).Source
New-Item -ItemType Directory -Force (Join-Path $root 'logs') | Out-Null
if (-not (Get-NetTCPConnection -LocalPort 27017 -State Listen -ErrorAction SilentlyContinue)) {
    throw 'MongoDB belum berjalan. Jalankan service MongoDB terlebih dahulu.'
}
foreach ($app in @(
    @{ Name = 'backend'; Port = 5000; Args = '--import tsx src/index.ts' },
    @{ Name = 'frontend'; Port = 5173; Args = 'node_modules/vite/bin/vite.js --host 0.0.0.0 --port 5173 --strictPort' }
)) {
    if (Get-NetTCPConnection -LocalPort $app.Port -State Listen -ErrorAction SilentlyContinue) {
        Write-Host "$($app.Name): port $($app.Port) sudah digunakan; proses tidak dijalankan ulang."
        continue
    }
    $proc = Start-Process -FilePath $node -ArgumentList $app.Args -WorkingDirectory (Join-Path $root $app.Name) -WindowStyle Hidden -RedirectStandardOutput (Join-Path $root "logs/$($app.Name).log") -RedirectStandardError (Join-Path $root "logs/$($app.Name).error.log") -PassThru
    Write-Host "$($app.Name) dimulai, PID $($proc.Id)"
}
Write-Host 'Buka https://localhost:5173'
