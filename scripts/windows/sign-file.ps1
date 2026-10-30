param([Parameter(Mandatory)][string]$FilePath)
$ErrorActionPreference = 'Stop'
. "$PSScriptRoot/Signing.ps1"
$settings = Get-CandidSigningSettings
$path = (Resolve-Path -LiteralPath $FilePath).Path
if ([string]::IsNullOrWhiteSpace($env:CANDID_SIGNING_AUDIT)) { throw 'Missing signing audit path.' }
$stream = [IO.File]::OpenRead($path)
try {
  if ($stream.ReadByte() -ne 0x4d -or $stream.ReadByte() -ne 0x5a) { throw 'Only Windows executable content can be signed.' }
} finally { $stream.Dispose() }
Import-Module ArtifactSigning -RequiredVersion 0.1.20 -ErrorAction Stop
$parameters = @{
  Endpoint = $settings.Endpoint
  CodeSigningAccountName = $settings.CodeSigningAccountName
  CertificateProfileName = $settings.CertificateProfileName
  Files = $path
  FileDigest = 'SHA256'
  TimestampRfc3161 = 'http://timestamp.acs.microsoft.com'
  TimestampDigest = 'SHA256'
  Description = 'Candid'
  DescriptionUrl = 'https://github.com/webwizarding/candid'
  ExcludeEnvironmentCredential = $true
  ExcludeWorkloadIdentityCredential = $true
  ExcludeManagedIdentityCredential = $true
  ExcludeSharedTokenCacheCredential = $true
  ExcludeVisualStudioCredential = $true
  ExcludeVisualStudioCodeCredential = $true
  ExcludeAzureCliCredential = $false
  ExcludeAzurePowerShellCredential = $true
  ExcludeAzureDeveloperCliCredential = $true
  ExcludeInteractiveBrowserCredential = $true
}
Invoke-ArtifactSigning @parameters
$signature = Assert-CandidSignature -FilePath $path -Publisher $settings.Publisher
$leaf = [IO.Path]::GetFileName($path)
$kind = if ($leaf -ieq 'candid.exe') { 'app' } elseif ($leaf -like '*-setup.exe') { 'installer' } elseif ([IO.Path]::GetExtension($path) -ieq '.dll') { 'helper' } else { 'embedded-executable' }
@{
  Path = $path
  Kind = $kind
  SHA256 = (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash
  Publisher = $settings.Publisher
  Certificate = $signature.SignerCertificate.Thumbprint
  TimestampCertificate = $signature.TimeStamperCertificate.Thumbprint
} | ConvertTo-Json -Compress | Add-Content -LiteralPath $env:CANDID_SIGNING_AUDIT -Encoding utf8
