$databaseLine = Get-Content .env | Where-Object { $_ -match '^DATABASE_URL=' } | Select-Object -First 1
if (-not $databaseLine) { throw 'DATABASE_URL is required for e2e smoke tests.' }

$baseUrl = ($databaseLine -split '=', 2)[1].Trim('"') -replace '\?schema=[^&]+', '' -replace '&schema=[^&]+', ''
'CREATE SCHEMA IF NOT EXISTS leps_e2e;' | bunx prisma db execute --url $baseUrl --stdin
if ($LASTEXITCODE) { exit $LASTEXITCODE }

$env:DATABASE_URL = "${baseUrl}?schema=leps_e2e"
$env:BETTER_AUTH_URL = 'http://127.0.0.1:4173'
$env:ADMIN_EMAIL = 'smoke@leps.test'
$env:ADMIN_PASSWORD = 'smoke-password-2026'

bun run db:deploy
if ($LASTEXITCODE) { exit $LASTEXITCODE }
bun run db:seed
if ($LASTEXITCODE) { exit $LASTEXITCODE }
bun run dev --host 127.0.0.1 --port 4173
