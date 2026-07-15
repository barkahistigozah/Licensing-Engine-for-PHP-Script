param([switch]$ValidateOnly)

$testDatabaseUrl = $env:TEST_DATABASE_URL
$message = 'TEST_DATABASE_URL must target a database ending in _test'

try {
  $uri = [Uri]$testDatabaseUrl
  $databaseName = [Uri]::UnescapeDataString($uri.AbsolutePath.Trim('/'))
} catch {
  $uri = $null
  $databaseName = ''
}

if (
  -not $uri -or
  ($uri.Scheme -ne 'postgresql' -and $uri.Scheme -ne 'postgres') -or
  $databaseName -notmatch '^[^/]+_test$'
) {
  [Console]::Error.WriteLine($message)
  exit 1
}

if ($ValidateOnly) { exit 0 }

$env:DATABASE_URL = $testDatabaseUrl

bunx prisma migrate reset --force
if ($LASTEXITCODE) { exit $LASTEXITCODE }

bun run db:seed
if ($LASTEXITCODE) { exit $LASTEXITCODE }

bun run db:seed
if ($LASTEXITCODE) { exit $LASTEXITCODE }

bunx prisma migrate status
exit $LASTEXITCODE
