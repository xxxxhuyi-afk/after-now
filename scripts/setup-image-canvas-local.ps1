$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $repoRoot ".env.local"
$dataSetting = if (Test-Path $envFile) { Get-Content $envFile | Where-Object { $_ -match '^AFTER_NOW_LOCAL_DATA=' } | Select-Object -First 1 }
$dataRoot = if ($dataSetting) { [Environment]::ExpandEnvironmentVariables(($dataSetting -replace '^AFTER_NOW_LOCAL_DATA=', '').Trim()) } else { Join-Path $repoRoot ".local-image-runtime" }
$runtimeRoot = if ($dataSetting) { Join-Path $dataRoot ".local-image-runtime" } else { $dataRoot }
$venv = Join-Path $runtimeRoot "venv"
$python = $null

if (Get-Command py -ErrorAction SilentlyContinue) {
  try { & py -3.11 -c "import sys; print(sys.executable)" 2>$null | ForEach-Object { if ($_ -match "python.exe$") { $python = $_ } } } catch {}
  if (-not $python) {
    try { & py -3.12 -c "import sys; print(sys.executable)" 2>$null | ForEach-Object { if ($_ -match "python.exe$") { $python = $_ } } } catch {}
  }
}
if (-not $python -and (Get-Command python -ErrorAction SilentlyContinue)) {
  $candidate = (Get-Command python).Source
  if ($candidate -notmatch "WindowsApps") { $python = $candidate }
}
if (-not $python) {
  $bundledPython = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
  if (Test-Path $bundledPython) { $python = $bundledPython }
}
if (-not $python) {
  throw "未找到可用的 Python 3.11 或 3.12。请从 python.org 安装 Python（勾选 Add Python to PATH），再重新运行此脚本。"
}

New-Item -ItemType Directory -Force -Path $runtimeRoot | Out-Null
$env:PIP_CACHE_DIR = Join-Path $runtimeRoot "pip-cache"
$env:HF_HOME = Join-Path $runtimeRoot "cache"
$existingVenvPython = Join-Path $venv "Scripts\python.exe"
if (!(Test-Path $existingVenvPython)) { & $python -m venv $venv }
$venvPython = Join-Path $venv "Scripts\python.exe"
& $venvPython -m pip install --upgrade pip
& $venvPython -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cu128
& $venvPython -m pip install "diffusers>=0.36.0" "transformers>=4.57.0" accelerate safetensors sentencepiece protobuf pillow
Write-Host "安装完成。本地运行环境与模型缓存位置：$runtimeRoot"
Write-Host "现在运行 scripts\start-image-canvas-local.ps1 启动本机模型服务。"
