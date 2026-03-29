$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$sourceDir = Join-Path $root 'dist\win-unpacked'
$outputZip = Join-Path $root 'dist\capslock-win-unpacked.zip'

if (-not (Test-Path $sourceDir)) {
  Write-Host '[package-win-unpacked] ERROR: dist/win-unpacked not found. Build first.' -ForegroundColor Red
  exit 1
}

$exePath = Join-Path $sourceDir 'capslock.exe'
$ffmpegPath = Join-Path $sourceDir 'ffmpeg.dll'
if (-not (Test-Path $exePath) -or -not (Test-Path $ffmpegPath)) {
  Write-Host '[package-win-unpacked] ERROR: capslock.exe or ffmpeg.dll missing in win-unpacked.' -ForegroundColor Red
  exit 1
}

if (Test-Path $outputZip) {
  Remove-Item $outputZip -Force
}

Compress-Archive -Path (Join-Path $sourceDir '*') -DestinationPath $outputZip -CompressionLevel Optimal
Write-Host "[package-win-unpacked] Success: $outputZip" -ForegroundColor Green
