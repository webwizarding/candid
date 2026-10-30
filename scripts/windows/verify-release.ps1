param(
  [Parameter(Mandatory)][string]$AppPath,
  [Parameter(Mandatory)][string]$InstallerPath,
  [Parameter(Mandatory)][string]$AuditPath
)
$ErrorActionPreference = 'Stop'
. "$PSScriptRoot/Signing.ps1"
$settings = Get-CandidSigningSettings
$records = @(Get-Content -LiteralPath $AuditPath | Where-Object { $_.Trim() } | ForEach-Object { $_ | ConvertFrom-Json })
foreach ($file in @($AppPath, $InstallerPath)) {
  $path = (Resolve-Path -LiteralPath $file).Path
  $null = Assert-CandidSignature -FilePath $path -Publisher $settings.Publisher
  $hash = (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash
  if (-not @($records | Where-Object { $_.Path -ieq $path -and $_.SHA256 -eq $hash -and $_.Publisher -eq $settings.Publisher }).Count) {
    throw "Missing matching signing receipt for $file"
  }
}
# NSIS calls the same hook for its temporary uninstaller before embedding it.
# Its temporary filename need not end in .exe, so the hook checks the MZ header.
if (-not @($records | Where-Object { $_.Kind -eq 'embedded-executable' -and $_.Publisher -eq $settings.Publisher -and $_.SHA256 -match '^[0-9A-Fa-f]{64}$' -and $_.Certificate -and $_.TimestampCertificate }).Count) {
  throw 'No verified embedded-uninstaller signing receipt. Release upload is blocked.'
}
Write-Host 'Application, setup, and embedded-uninstaller signatures verified.'
