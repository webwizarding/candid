$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
. "$PSScriptRoot/Signing.ps1"
$temporary = Join-Path ([IO.Path]::GetTempPath()) ([guid]::NewGuid().ToString())
$null = New-Item -ItemType Directory -Path $temporary
function Assert-True([bool]$Condition, [string]$Message) {
  if (-not $Condition) { throw $Message }
}
function Assert-Fails([scriptblock]$Action, [string]$Pattern) {
  $failed = $false
  try { & $Action } catch {
    if ($_.Exception.Message -notlike "*$Pattern*") { throw }
    $failed = $true
  }
  Assert-True $failed "Expected failure: $Pattern"
}
function New-TestCertificate([bool]$PublicTrust) {
  $rsa = [Security.Cryptography.RSA]::Create(2048)
  try {
    $request = [Security.Cryptography.X509Certificates.CertificateRequest]::new('CN=Candid test publisher', $rsa, [Security.Cryptography.HashAlgorithmName]::SHA256, [Security.Cryptography.RSASignaturePadding]::Pkcs1)
    $oids = [Security.Cryptography.OidCollection]::new()
    $null = $oids.Add([Security.Cryptography.Oid]::new('1.3.6.1.5.5.7.3.3'))
    if ($PublicTrust) { $null = $oids.Add([Security.Cryptography.Oid]::new('1.3.6.1.4.1.311.97.1.0')) }
    $request.CertificateExtensions.Add([Security.Cryptography.X509Certificates.X509EnhancedKeyUsageExtension]::new($oids, $false))
    return $request.CreateSelfSigned([DateTimeOffset]::UtcNow.AddMinutes(-1), [DateTimeOffset]::UtcNow.AddMinutes(5))
  } finally { $rsa.Dispose() }
}
try {
  foreach ($script in Get-ChildItem -LiteralPath $PSScriptRoot -Filter '*.ps1') {
    $parseErrors = $null
    $null = [Management.Automation.Language.Parser]::ParseFile($script.FullName, [ref]$null, [ref]$parseErrors)
    Assert-True ($parseErrors.Count -eq 0) "PowerShell syntax errors in $($script.Name): $parseErrors"
  }
  $env:AZURE_CLIENT_ID = '11111111-1111-1111-1111-111111111111'
  $env:AZURE_TENANT_ID = '22222222-2222-2222-2222-222222222222'
  $env:AZURE_SUBSCRIPTION_ID = '33333333-3333-3333-3333-333333333333'
  $env:AZURE_ARTIFACT_SIGNING_ENDPOINT = 'https://eus.codesigning.azure.net'
  $env:AZURE_ARTIFACT_SIGNING_ACCOUNT = 'candid-test'
  $env:AZURE_ARTIFACT_SIGNING_PROFILE = 'public-test'
  $env:CANDID_WINDOWS_PUBLISHER = 'Candid test publisher'
  $null = Get-CandidSigningSettings
  $env:CANDID_WINDOWS_PUBLISHER = ''
  Assert-Fails { Get-CandidSigningSettings } 'Missing signing setting'
  $env:CANDID_WINDOWS_PUBLISHER = 'Candid test publisher'
  $env:AZURE_ARTIFACT_SIGNING_ENDPOINT = 'https://example.com'
  Assert-Fails { Get-CandidSigningSettings } 'HTTPS regional endpoint'
  $env:AZURE_ARTIFACT_SIGNING_ENDPOINT = 'https://eus.codesigning.azure.net'
  $config = Join-Path $temporary 'config with spaces.json'
  & "$PSScriptRoot/prepare-signing.ps1" -OutputPath $config
  $generated = Get-Content -LiteralPath $config -Raw | ConvertFrom-Json
  Assert-True ($generated.bundle.windows.signCommand.cmd -eq 'pwsh') 'Wrong signing command'
  Assert-True ($generated.bundle.windows.signCommand.args -contains '%1') 'Missing Tauri file placeholder'
  Assert-True ($generated.bundle.windows.signCommand.args -contains (Join-Path $PSScriptRoot 'sign-file.ps1')) 'Signing path must be absolute'

  $app = Join-Path $temporary 'candid.exe'
  $installer = Join-Path $temporary 'Candid_0.1.5_x64-setup.exe'
  $embedded = Join-Path $temporary 'nsu123.tmp'
  foreach ($path in @($app, $installer, $embedded)) { [IO.File]::WriteAllBytes($path, [byte[]](77, 90, 0, 0)) }
  # Actual Windows signature validation rejects an unsigned fixture.
  Assert-Fails { Assert-CandidSignature -FilePath $app -Publisher $env:CANDID_WINDOWS_PUBLISHER } 'signature'

  # The remaining fixtures test policy/receipt checks, not real CA signing.
  $public = New-TestCertificate $true
  $private = New-TestCertificate $false
  $global:CandidTestSignature = [pscustomobject]@{ Status = 'Valid'; SignerCertificate = $public; TimeStamperCertificate = $public }
  function Get-AuthenticodeSignature { param([string]$LiteralPath) return $global:CandidTestSignature }
  $null = Assert-CandidSignature -FilePath $app -Publisher $env:CANDID_WINDOWS_PUBLISHER
  Assert-Fails { Assert-CandidSignature -FilePath $app -Publisher 'Another publisher' } 'Unexpected publisher'
  $global:CandidTestSignature.TimeStamperCertificate = $null
  Assert-Fails { Assert-CandidSignature -FilePath $app -Publisher $env:CANDID_WINDOWS_PUBLISHER } 'timestamp'
  $global:CandidTestSignature.TimeStamperCertificate = $public
  $global:CandidTestSignature.SignerCertificate = $private
  Assert-Fails { Assert-CandidSignature -FilePath $app -Publisher $env:CANDID_WINDOWS_PUBLISHER } 'Public Trust'
  $global:CandidTestSignature.SignerCertificate = $public
  $global:CandidTestSignature.Status = 'HashMismatch'
  Assert-Fails { Assert-CandidSignature -FilePath $app -Publisher $env:CANDID_WINDOWS_PUBLISHER } 'signature'
  $global:CandidTestSignature.Status = 'Valid'
  $audit = Join-Path $temporary 'audit.jsonl'
  $records = @(
    @{ Path = $app; Kind = 'app' },
    @{ Path = $installer; Kind = 'installer' },
    @{ Path = $embedded; Kind = 'embedded-executable' }
  ) | ForEach-Object {
    $_.SHA256 = (Get-FileHash -LiteralPath $_.Path).Hash
    $_.Publisher = $env:CANDID_WINDOWS_PUBLISHER
    $_.Certificate = $public.Thumbprint
    $_.TimestampCertificate = $public.Thumbprint
    $_ | ConvertTo-Json -Compress
  }
  $records | Set-Content -LiteralPath $audit
  & "$PSScriptRoot/verify-release.ps1" -AppPath $app -InstallerPath $installer -AuditPath $audit
  $records[0..1] | Set-Content -LiteralPath $audit
  Assert-Fails { & "$PSScriptRoot/verify-release.ps1" -AppPath $app -InstallerPath $installer -AuditPath $audit } 'embedded-uninstaller'
  $records | Set-Content -LiteralPath $audit
  [IO.File]::AppendAllText($app, 'tampered')
  Assert-Fails { & "$PSScriptRoot/verify-release.ps1" -AppPath $app -InstallerPath $installer -AuditPath $audit } 'receipt'

  Import-Module ArtifactSigning -RequiredVersion 0.1.20
  $command = Get-Command Invoke-ArtifactSigning
  foreach ($parameter in @('Endpoint', 'CodeSigningAccountName', 'CertificateProfileName', 'Files', 'FileDigest', 'TimestampRfc3161', 'TimestampDigest', 'Description', 'DescriptionUrl', 'ExcludeEnvironmentCredential', 'ExcludeWorkloadIdentityCredential', 'ExcludeManagedIdentityCredential', 'ExcludeSharedTokenCacheCredential', 'ExcludeVisualStudioCredential', 'ExcludeVisualStudioCodeCredential', 'ExcludeAzureCliCredential', 'ExcludeAzurePowerShellCredential', 'ExcludeAzureDeveloperCliCredential', 'ExcludeInteractiveBrowserCredential')) {
    Assert-True ($command.Parameters.ContainsKey($parameter)) "Microsoft module missing parameter: $parameter"
  }
  Write-Host 'Signing checks passed: syntax, configuration, unsigned rejection, publisher, Public Trust, timestamp, tampering, receipts, and Microsoft module compatibility.'
} finally {
  Remove-Variable -Name CandidTestSignature -Scope Global -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $temporary -Recurse -Force
}
