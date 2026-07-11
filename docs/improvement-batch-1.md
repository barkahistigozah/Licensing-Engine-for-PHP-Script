# Improvement Review — Batch 1

Status: review dan implementasi Batch 1 selesai; satu environment prerequisite dan satu low advisory masih terbuka.

Scope review dibatasi pada foundation SvelteKit + Elysia Batch 1: manifest dan lockfile, konfigurasi SvelteKit/Vercel, API catch-all dan health bootstrap, test/typecheck/format/build, serta baseline OWASP A02/A03/A08. Batch 2–7 tidak disentuh.

## Ringkasan

Batch 1 sudah memiliki skeleton yang dapat ditest dan dikompilasi. Empat improvement ditindaklanjuti; dua sudah diperbaiki di source, satu dimitigasi lewat dependency override, dan satu memerlukan prerequisite Windows.

1. P1 — Build Windows memerlukan kemampuan symlink untuk menghasilkan artifact adapter Vercel (didokumentasikan di `docs/WINDOWS_BUILD.md`).
2. P1 — API `/api/*` kini membawa security headers melalui catch-all bridge.
3. P1 — Advisory high `effect` dimitigasi dengan override `3.20.0`; advisory low `cookie` masih terbuka karena batas versi framework.
4. P2 — Test bridge SvelteKit ditambahkan dan memverifikasi request/headers.

## Temuan

### IMP-1 — Build Vercel gagal di Windows pada langkah packaging

- Severity: P1 / release-blocking untuk verifikasi lokal Windows.
- Area: build, deployment, A02/A08.
- Evidence: `bun run build` di Windows menyelesaikan SSR/client compilation, lalu gagal dengan `EPERM: operation not permitted, symlink` pada `@sveltejs/adapter-vercel/index.js:477`, target `.vercel/output/functions/index.func`.
- Dampak: output wajib Batch 1 menyatakan `bun run build` berhasil, tetapi developer Windows tanpa izin symlink tidak dapat memverifikasi artifact Vercel.
- Tindakan:
  - Dokumentasikan dan verifikasi prerequisite Windows yang memang diperlukan adapter (Developer Mode atau privilege symlink) pada setup proyek; atau
  - pilih konfigurasi adapter/toolchain yang menghasilkan Build Output API tanpa symlink bila versi yang dikunci mendukungnya.
  - Prerequisite dan check PowerShell dicatat di `docs/WINDOWS_BUILD.md`; adapter Vercel dan target deployment tetap dipertahankan.
- Acceptance check:
  - `bun run build` exit 0 dari PowerShell Windows pada environment developer yang didukung.
  - `.vercel/output` berisi function artifact dan tidak hanya hasil compile `.svelte-kit`.

### IMP-2 — Security headers tidak berlaku pada API catch-all

- Severity: P1.
- Area: security, A02/A08.
- Evidence: request nyata Windows ke `http://127.0.0.1:5173/api/health` mengembalikan `200` dan `{"status":"BOOTSTRAPPED"}`, tetapi `Content-Security-Policy` dan `X-Content-Type-Options` kosong. `svelte.config.js:9-19` hanya mengonfigurasi CSP SvelteKit; `src/routes/api/[...slugs]/+server.ts:4` meneruskan request langsung ke Elysia tanpa header policy bersama.
- Dampak: security header yang dikonfigurasi untuk halaman tidak otomatis menjadi header response API. Endpoint API publik dapat keluar tanpa baseline `nosniff`/cache policy dan policy header yang konsisten.
- Tindakan:
  - Tambahkan satu middleware/header policy terpusat untuk response Elysia atau SvelteKit `handle` yang mencakup `/api/*`.
  - Pertahankan health bootstrap tanpa detail database, credential, stack, atau hostname internal.
  - `src/routes/api/[...slugs]/+server.ts` kini menambahkan `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`, dan `Referrer-Policy: no-referrer` pada seluruh response API.
  - Regression test ditambahkan di `tests/api/bootstrap.test.ts`.
- Acceptance check:
  - Request `/api/health` memuat minimal `X-Content-Type-Options: nosniff` dan policy cache yang sesuai endpoint health.
  - Header tidak membocorkan secret atau detail runtime.
  - Test API bridge memverifikasi policy header pada response yang benar-benar dikirim ke client.

### IMP-3 — Dependency audit gagal pada dependency transitive terkunci

- Severity: P1 untuk supply-chain gate; mitigasi dapat menunggu keputusan versi yang kompatibel.
- Area: dependency, A03.
- Evidence dari `bun audit` di Windows:
  - `effect <3.20.0` — high, jalur `prisma@6.19.0 -> @prisma/config@6.19.0 -> effect@3.18.4`.
  - `cookie <0.7.0` — low, jalur `@sveltejs/kit@2.69.2 -> cookie@0.6.0`.
- Dampak: Batch 1 belum memiliki audit supply-chain yang bersih. Versi utama sengaja exact sesuai kontrak, sehingga upgrade sembarang dapat melanggar plan atau memicu perubahan major.
- Tindakan:
  - `package.json` kini mengunci override transitive `effect: 3.20.0`; Prisma tetap `6.19.0` dan `bun.lock` diperbarui.
  - Audit ulang menghapus advisory high. Advisory low `cookie@0.6.0` dari `@sveltejs/kit@2.69.2` tetap dicatat sebagai exception sampai framework dapat dinaikkan dalam batch/toolchain yang disetujui.
  - `bun.lock` tetap committed; audit menjadi evidence release.
- Acceptance check:
  - `bun audit` exit 0, atau exception terdokumentasi dan disetujui sebelum release.
  - Tidak ada dependency `latest`, range caret, atau lockfile yang berubah tanpa review.

### IMP-4 — Test belum mencakup SvelteKit catch-all HTTP bridge

- Severity: P2.
- Area: test/integrity, A08/A10.
- Evidence: `tests/api/bootstrap.test.ts:5-11` memanggil `treaty(app)` langsung. `src/routes/api/[...slugs]/+server.ts:4` tidak pernah dipanggil melalui test atau request server nyata.
- Dampak: test dapat lulus walaupun route file, fallback export, path matching, atau integrasi SvelteKit berubah dan `/api/health` tidak lagi reachable.
- Tindakan:
  - `tests/api/bootstrap.test.ts` kini memanggil fallback handler dengan `Request` `/api/health` dan memverifikasi payload serta headers.
  - In-memory Eden test tetap dipertahankan untuk logic Elysia.
- Acceptance check:
  - Fallback bridge atau request nyata `GET /api/health` melalui SvelteKit menghasilkan status `200` dan payload bootstrap yang disepakati.
  - Request non-health tidak memberi akses ke route Batch berikutnya atau detail internal.

## Database, SQL, dan UI/UX

- Database dan query SQL: tidak ada finding Batch 1. Prisma schema/query sengaja tidak diubah; review database dimulai pada Batch 2 sesuai batasan plan.
- UI/UX final: tidak ada finding Batch 1. Root page adalah bootstrap minimal yang diizinkan; Soft Brutal public/login/dashboard baru menjadi scope Batch 5–6.
- Health payload `BOOTSTRAPPED` bukan finding pada batch ini karena keputusan Pra-Implementasi memang menyatakan payload sementara tersebut diganti pada Batch 3.

## Verification evidence

Perintah Windows/Bun yang dijalankan saat review:

```text
bun audit                 -> FAIL (1 low transitive advisory; high effect sudah dimitigasi)
bun test                  -> PASS (2 tests, 7 assertions)
bun run check             -> PASS (0 errors, 0 warnings)
bun run format:check      -> PASS
bun run build             -> FAIL pada adapter Vercel symlink EPERM setelah compile SSR/client; prerequisite dicatat di docs/WINDOWS_BUILD.md
GET /api/health           -> 200, payload bootstrap, no-store/nosniff/referrer headers tersedia
```

## Batasan review

Dokumen ini hanya mencatat improvement untuk Batch 1. Tidak ada perubahan schema Prisma, query SQL, UI final, atau batch lain yang diterapkan sebagai bagian dari improvement ini.
