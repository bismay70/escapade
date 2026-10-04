param([string]$Label = 'snapshot')
$ErrorActionPreference = 'Stop'
$repoPath = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$backupBase = Join-Path (Split-Path $repoPath -Parent) 'backups'
$safeLabel = $Label -replace '[^a-zA-Z0-9-]', '-'
$backupPath = Join-Path $backupBase ("escapade-" + (Get-Date -Format 'yyyyMMdd-HHmmss') + '-' + $safeLabel)
New-Item -ItemType Directory -Path $backupPath -Force | Out-Null
& robocopy $repoPath $backupPath /E /XD node_modules .next .git .venv __pycache__ .pytest_cache data /NFL /NDL /NJH /NJS
if ($LASTEXITCODE -ge 8) { throw 'Source backup failed.' }
$taskPython = Join-Path $repoPath 'backend/.venv/Scripts/python.exe'
if (Test-Path -LiteralPath $taskPython) {
    Push-Location $repoPath
    try { $taskDatabase = & $taskPython -c 'from backend.config import database_path; print(database_path())' } finally { Pop-Location }
    if ($taskDatabase -and (Test-Path -LiteralPath $taskDatabase)) {
        $backupData = Join-Path $backupPath 'backend/data'
        New-Item -ItemType Directory -Path $backupData -Force | Out-Null
        & $taskPython -c 'import sqlite3, sys; source = sqlite3.connect(sys.argv[1]); target = sqlite3.connect(sys.argv[2]); source.backup(target); target.close(); source.close()' $taskDatabase (Join-Path $backupData 'vacanes.sqlite3')
        if ($LASTEXITCODE -ne 0) { throw 'Database backup failed.' }
    }
}
Write-Output "Backup saved: $backupPath"
