$ErrorActionPreference = 'Stop'

function Test-IsAdmin {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($identity)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Test-DeveloperModeEnabled {
  try {
    $keyPath = 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\AppModelUnlock'
    $value = Get-ItemProperty -Path $keyPath -Name AllowDevelopmentWithoutDevLicense -ErrorAction Stop
    return ($value.AllowDevelopmentWithoutDevLicense -eq 1)
  } catch {
    return $false
  }
}

Write-Host '[build-portable] Checking local permissions...'
$isAdmin = Test-IsAdmin
$devMode = Test-DeveloperModeEnabled

if (-not $isAdmin -and -not $devMode) {
  Write-Host '[build-portable] ERROR: Missing symlink privilege for electron-builder cache extraction.' -ForegroundColor Red
  Write-Host '[build-portable] Fix one of the following and retry:' -ForegroundColor Yellow
  Write-Host '  1) Run PowerShell as Administrator' -ForegroundColor Yellow
  Write-Host '  2) Enable Windows Developer Mode (Settings > For developers)' -ForegroundColor Yellow
  exit 1
}

$env:CSC_IDENTITY_AUTO_DISCOVERY = 'false'
Write-Host '[build-portable] Building portable EXE...'

npm run build:portable:raw
if ($LASTEXITCODE -ne 0) {
  Write-Host '[build-portable] Build failed. See logs above for details.' -ForegroundColor Red
  exit $LASTEXITCODE
}

Write-Host '[build-portable] Success. Check dist/ for the portable EXE.' -ForegroundColor Green
