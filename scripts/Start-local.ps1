$ErrorActionPreference = 'Stop'
$repoPath = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$frontendPath = Join-Path $repoPath 'frontend'
$taskPython = Join-Path $repoPath 'backend/.venv/Scripts/python.exe'
$logPath = Join-Path $repoPath 'backend/data/logs'
New-Item -ItemType Directory -Path $logPath -Force | Out-Null
if (!(Test-Path -LiteralPath $taskPython)) {
    & python -m venv (Join-Path $repoPath 'backend/.venv')
    if ($LASTEXITCODE -ne 0) { throw 'Python environment creation failed.' }
}
$requirementsPath = Join-Path $repoPath 'backend/requirements.txt'
$requirementsStamp = Join-Path $repoPath 'backend/.venv/requirements.sha256'
$requirementsHash = (Get-FileHash -LiteralPath $requirementsPath -Algorithm SHA256).Hash
if (!(Test-Path -LiteralPath $requirementsStamp) -or (Get-Content -LiteralPath $requirementsStamp -Raw).Trim() -ne $requirementsHash) {
    & $taskPython -m pip install -r (Join-Path $repoPath 'backend/requirements.txt')
    if ($LASTEXITCODE -ne 0) { throw 'Python setup failed.' }
    Set-Content -LiteralPath $requirementsStamp -Value $requirementsHash
}
foreach ($envFiles in @(@('backend/.env.example', 'backend/.env'), @('frontend/.env.example', 'frontend/.env.local'))) {
    $envTarget = Join-Path $repoPath $envFiles[1]
    if (!(Test-Path -LiteralPath $envTarget)) { Copy-Item -LiteralPath (Join-Path $repoPath $envFiles[0]) -Destination $envTarget }
}
if (!(Test-Path -LiteralPath (Join-Path $frontendPath 'node_modules/next'))) {
    Push-Location $frontendPath
    try { & npm ci; if ($LASTEXITCODE -ne 0) { throw 'Frontend setup failed.' } } finally { Pop-Location }
}
if (!(Get-NetTCPConnection -State Listen -LocalPort 8000 -ErrorAction SilentlyContinue)) {
    $service = Start-Process -FilePath $taskPython -ArgumentList '-m', 'backend.app' -WorkingDirectory $repoPath -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logPath 'backend.log') -RedirectStandardError (Join-Path $logPath 'backend-error.log')
    Write-Output "Backend started (PID $($service.Id)): http://127.0.0.1:8000"
} else { Write-Output 'Port 8000 is already listening; existing service retained.' }
if (!(Get-NetTCPConnection -State Listen -LocalPort 3000 -ErrorAction SilentlyContinue)) {
    $nodePath = (Get-Command node).Source
    $service = Start-Process -FilePath $nodePath -ArgumentList 'node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', '3000' -WorkingDirectory $frontendPath -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logPath 'frontend.log') -RedirectStandardError (Join-Path $logPath 'frontend-error.log')
    Write-Output "Frontend started (PID $($service.Id)): http://localhost:3000/planner"
} else { Write-Output 'Port 3000 is already listening; existing service retained.' }
