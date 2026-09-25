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
  'supabase/migrations/029_live_gps_tracking.sql',
  'DATA_PROTECTION_IMPLEMENTATION.md'
)

foreach ($target in $targets) {
  $dest = Join-Path $RepoRoot $target
  $source = Join-Path $PatchRoot $target
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $dest) | Out-Null
  Copy-Item -Force $source $dest
}

$old = Join-Path $RepoRoot 'supabase/migrations/028_live_gps_tracking.sql'
$new = Join-Path $RepoRoot 'supabase/migrations/029_live_gps_tracking.sql'
if ((Test-Path $old) -and (Test-Path $new)) {
  $backup = Join-Path $RepoRoot 'supabase/migrations/028_live_gps_tracking.sql.conflict-backup'
  Move-Item -Force $old $backup
  Write-Host "Moved historical-looking 028 GPS file to: $backup"
  Write-Warning 'Inspect this file against production before deleting it. The canonical repository GPS migration is now 029.'
}

Write-Host 'Sprint 1 patch files copied. Next: run npm run test:data-protection and npm run verify:migrations.'
