param(
    [Parameter(Mandatory = $true)]
    [string]$BinaryPath,
    [Parameter(Mandatory = $true)]
    [string]$OutputDirectory
)

$ErrorActionPreference = 'Stop'
$binary = (Resolve-Path -LiteralPath $BinaryPath).Path
$root = Split-Path -Parent $PSScriptRoot
$stage = Join-Path $OutputDirectory 'OpenIDEA-windows-x64-portable'
$archive = Join-Path $OutputDirectory 'OpenIDEA-windows-x64-portable.zip'

New-Item -ItemType Directory -Path $stage -Force | Out-Null
Copy-Item -LiteralPath $binary -Destination (Join-Path $stage 'openidea.exe')
Get-ChildItem -LiteralPath (Split-Path -Parent $binary) -Filter '*.dll' -File |
    Copy-Item -Destination $stage
foreach ($license in @('LICENSE', 'NOTICE', 'THIRD_PARTY_LICENSES.md')) {
    Copy-Item -LiteralPath (Join-Path $root $license) -Destination $stage
}
Copy-Item -LiteralPath (Join-Path $root 'docs/windows-portable.txt') -Destination (Join-Path $stage 'README.txt')

Compress-Archive -LiteralPath $stage -DestinationPath $archive -Force
$hash = (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant()
"$hash  $(Split-Path -Leaf $archive)" | Set-Content -LiteralPath "$archive.sha256" -Encoding utf8
Write-Output $archive
