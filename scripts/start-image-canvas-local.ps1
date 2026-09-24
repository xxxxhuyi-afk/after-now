$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $repoRoot ".env.local"
$dataSetting = if (Test-Path $envFile) { Get-Content $envFile | Where-Object { $_ -match '^AFTER_NOW_LOCAL_DATA=' } | Select-Object -First 1 }
$dataRoot = if ($dataSetting) { [Environment]::ExpandEnvironmentVariables(($dataSetting -replace '^AFTER_NOW_LOCAL_DATA=', '').Trim()) } else { Join-Path $repoRoot ".local-image-runtime" }
$runtimeRoot = if ($dataSetting) { Join-Path $dataRoot ".local-image-runtime" } else { $dataRoot }
$python = Join-Path $runtimeRoot "venv\Scripts\python.exe"
if (-not (Test-Path $python)) { throw "请先运行 scripts\setup-image-canvas-local.ps1 安装本地模型运行环境。" }
New-Item -ItemType Directory -Force -Path (Join-Path $runtimeRoot "cache") | Out-Null
$env:HF_HOME = Join-Path $runtimeRoot "cache"
$env:HF_HUB_DISABLE_TELEMETRY = "1"
$env:HF_HUB_DISABLE_SYMLINKS_WARNING = "1"
$env:AFTER_NOW_LOCAL_DATA = $dataRoot
& $python (Join-Path $repoRoot "scripts\local-image-server.py")
