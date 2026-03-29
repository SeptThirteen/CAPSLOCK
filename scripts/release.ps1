$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Invoke-NpmScript([string]$name) {
  Write-Host "[release] Running: npm run $name"
  npm run $name | Out-Host
  return $LASTEXITCODE
}

function Test-PortableOutput {
  $dist = Join-Path $root 'dist'
  if (-not (Test-Path $dist)) { return $null }

  $portable = Get-ChildItem -Path $dist -Filter '*portable*.exe' -File -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($portable) { return $portable.FullName }

  $fallback = Get-ChildItem -Path $dist -Filter '*.exe' -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -notmatch 'Setup|setup|unins|installer' } |
    Select-Object -First 1
  if ($fallback) { return $fallback.FullName }

  return $null
}

function Test-WinUnpackedReady {
  $exe = Join-Path $root 'dist\win-unpacked\capslock.exe'
  $ffmpeg = Join-Path $root 'dist\win-unpacked\ffmpeg.dll'
  return (Test-Path $exe) -and (Test-Path $ffmpeg)
}

Write-Host '[release] Starting release pipeline...'

$portableExit = Invoke-NpmScript 'build:portable'
if ($portableExit -eq 0) {
  $portablePath = Test-PortableOutput
  if ($portablePath) {
    Write-Host "[release] SUCCESS (portable): $portablePath" -ForegroundColor Green
    exit 0
  }
}

Write-Host '[release] Portable build unavailable. Falling back to win-unpacked zip...' -ForegroundColor Yellow

if (-not (Test-WinUnpackedReady)) {
  $dirExit = Invoke-NpmScript 'build:dir'
  if ($dirExit -ne 0) {
    Write-Host '[release] ERROR: build:dir failed, cannot prepare fallback package.' -ForegroundColor Red
    exit $dirExit
  }
}

$zipExit = Invoke-NpmScript 'package:win-unpacked'
if ($zipExit -ne 0) {
  Write-Host '[release] ERROR: package:win-unpacked failed.' -ForegroundColor Red
  exit $zipExit
}

$zipPath = Join-Path $root 'dist\capslock-win-unpacked.zip'
if (Test-Path $zipPath) {
  Write-Host "[release] SUCCESS (fallback zip): $zipPath" -ForegroundColor Green
  exit 0
}

Write-Host '[release] ERROR: zip output not found after packaging.' -ForegroundColor Red
exit 1
