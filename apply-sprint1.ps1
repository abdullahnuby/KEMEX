$ErrorActionPreference = 'Stop'

$PatchRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = (Get-Location).Path

if (-not (Test-Path (Join-Path $RepoRoot 'package.json'))) {
  throw 'Run this script from the KEMEX repository root.'
}

$targets = @(
  'scripts/backup/kemex-backup.mjs',
  '.github/workflows/backup.yml',
  'tests/enterprise/data-protection.test.mjs',
  'scripts/verify-migrations.mjs',
  'package.json',
  'DATA_PROTECTION_IMPLEMENTATION.md'
)

foreach ($target in $targets) {
  $dest = Join-Path $RepoRoot $target
  $source = Join-Path $PatchRoot $target
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $dest) | Out-Null
  Copy-Item -Force $source $dest
}

Write-Host 'Sprint 1 patch files copied. Migration numbering is preserved exactly from the repository.'
Write-Host 'Next: run npm run test:data-protection and npm run verify:migrations.'
