param([Parameter(Mandatory)][string]$OutputPath)
$ErrorActionPreference = 'Stop'
. "$PSScriptRoot/Signing.ps1"
$null = Get-CandidSigningSettings
$signer = (Resolve-Path -LiteralPath "$PSScriptRoot/sign-file.ps1").Path
$config = @{
  bundle = @{
    windows = @{
      digestAlgorithm = 'SHA256'
      signCommand = @{
        cmd = 'pwsh'
        args = @('-NoLogo', '-NoProfile', '-NonInteractive', '-File', $signer, '-FilePath', '%1')
      }
    }
  }
}
$config | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $OutputPath -Encoding utf8
Write-Host 'Prepared required Windows signing hook. No unsigned fallback is configured.'
