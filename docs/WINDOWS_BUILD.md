# Windows Build Prerequisite

`@sveltejs/adapter-vercel` membuat directory symlink saat menyusun `.vercel/output`. Windows dapat menolak langkah ini dengan `EPERM` walaupun kompilasi SSR dan client sudah berhasil.

Gunakan Windows Developer Mode atau jalankan terminal dengan hak yang mengizinkan pembuatan symlink. WSL bukan bagian dari workflow proyek ini.

## Verify

```powershell
$probe = Join-Path $env:TEMP 'leps-symlink-probe'
Remove-Item -LiteralPath $probe -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path (Join-Path $probe 'target') -Force | Out-Null
try {
  New-Item -ItemType SymbolicLink -Path (Join-Path $probe 'link') -Target (Join-Path $probe 'target') -ErrorAction Stop | Out-Null
  Write-Output 'Symlink capability: OK'
} finally {
  Remove-Item -LiteralPath $probe -Recurse -Force -ErrorAction SilentlyContinue
}

bun run build
```

Expected result: the probe succeeds and `bun run build` exits 0 with Vercel function output under `.vercel/output/functions`.

If the probe fails with `UnauthorizedAccessException` or `EPERM`, enable Developer Mode in Windows Settings or use an approved elevated build environment before treating the Vercel build as a code failure.
