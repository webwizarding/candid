Set-StrictMode -Version Latest

function Get-CandidSigningSettings {
  $names = @('AZURE_CLIENT_ID', 'AZURE_TENANT_ID', 'AZURE_SUBSCRIPTION_ID', 'AZURE_ARTIFACT_SIGNING_ENDPOINT', 'AZURE_ARTIFACT_SIGNING_ACCOUNT', 'AZURE_ARTIFACT_SIGNING_PROFILE', 'CANDID_WINDOWS_PUBLISHER')
  foreach ($name in $names) {
    if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($name))) {
      throw "Missing signing setting: $name. Complete docs/WINDOWS_SIGNING.md; unsigned release uploads are disabled."
    }
  }
  foreach ($name in @('AZURE_CLIENT_ID', 'AZURE_TENANT_ID', 'AZURE_SUBSCRIPTION_ID')) {
    $parsed = [guid]::Empty
    if (-not [guid]::TryParse([Environment]::GetEnvironmentVariable($name), [ref]$parsed)) { throw "Invalid GUID setting: $name" }
  }
  if ($env:AZURE_ARTIFACT_SIGNING_ENDPOINT -notmatch '^https://[a-z0-9]+\.codesigning\.azure\.net/?$') {
    throw 'Use the HTTPS regional endpoint shown by your Microsoft Artifact Signing account.'
  }
  foreach ($name in @('AZURE_ARTIFACT_SIGNING_ACCOUNT', 'AZURE_ARTIFACT_SIGNING_PROFILE')) {
    if ([Environment]::GetEnvironmentVariable($name) -notmatch '^[A-Za-z0-9-]{3,100}$') { throw "Invalid signing resource name: $name" }
  }
  return @{
    Endpoint = $env:AZURE_ARTIFACT_SIGNING_ENDPOINT
    CodeSigningAccountName = $env:AZURE_ARTIFACT_SIGNING_ACCOUNT
    CertificateProfileName = $env:AZURE_ARTIFACT_SIGNING_PROFILE
    Publisher = $env:CANDID_WINDOWS_PUBLISHER
  }
}

function Assert-CandidSignature {
  param([Parameter(Mandatory)][string]$FilePath, [Parameter(Mandatory)][string]$Publisher)
  $signature = Get-AuthenticodeSignature -LiteralPath $FilePath
  if ($signature.Status -ne 'Valid' -or $null -eq $signature.SignerCertificate) {
    throw "Invalid or missing trusted Authenticode signature: $FilePath ($($signature.Status))"
  }
  $certificate = $signature.SignerCertificate
  $name = $certificate.GetNameInfo([System.Security.Cryptography.X509Certificates.X509NameType]::SimpleName, $false)
  if (-not [string]::Equals($name, $Publisher, [StringComparison]::OrdinalIgnoreCase)) { throw "Unexpected publisher on $FilePath" }
  $usages = @($certificate.Extensions | Where-Object { $_.Oid.Value -eq '2.5.29.37' } | ForEach-Object { $_.EnhancedKeyUsages } | ForEach-Object { $_.Value })
  if ('1.3.6.1.5.5.7.3.3' -notin $usages -or '1.3.6.1.4.1.311.97.1.0' -notin $usages) {
    throw "A Microsoft Artifact Signing Public Trust code-signing certificate is required: $FilePath"
  }
  if ($null -eq $signature.TimeStamperCertificate) { throw "Missing trusted timestamp: $FilePath" }
  return $signature
}
