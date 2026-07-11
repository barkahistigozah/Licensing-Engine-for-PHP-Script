# Product Requirements Document — LEPS Rewrite

**Status:** Draft for review  
**Date:** 2026-07-11  
**Product:** Licensing Engine for PHP Scripts (LEPS)

## 1. Ringkasan

LEPS adalah aplikasi monolit untuk mengelola lisensi script PHP dan memverifikasi apakah sebuah instalasi diizinkan berjalan. Produk terdiri dari public web, login admin, dashboard admin, dan API verifikasi lisensi.

Rewrite mengganti frontend Next.js/React dengan SvelteKit dan backend route handlers dengan Elysia. Prisma, PostgreSQL, Better Auth, Redis, dan Vercel tetap digunakan. Rewrite juga mengganti tampilan lama dengan desain Soft Brutal yang responsive dan tidak terasa seperti template AI generik.

## 2. Latar Belakang

Implementasi saat ini memakai Next.js untuk public web, dashboard, dan API. Kebutuhan LEPS lebih berat pada backend dan tidak bergantung pada SEO atau React Server Components. Aplikasi juga belum memiliki client aktif dan database production telah dikosongkan, sehingga rewrite dapat dilakukan tanpa backward compatibility atau migrasi data.

## 3. Tujuan

1. Menghasilkan monolit SvelteKit + Elysia dalam satu repository, domain, dan deployment Vercel.
2. Mempertahankan seluruh kemampuan bisnis LEPS yang sudah ada.
3. Menempatkan seluruh API bisnis di satu Elysia app dengan batas modul yang jelas.
4. Mempertahankan Prisma ORM agar rewrite tidak sekaligus menjadi migrasi data layer.
5. Mempertahankan Better Auth dengan public signup dinonaktifkan.
6. Menghasilkan public web, login, dan dashboard responsive dengan gaya Soft Brutal.
7. Memperbaiki penyimpanan Telegram bot token dan keaslian signature response.
8. Menyediakan pengujian, dokumentasi environment, dan proses deployment yang dapat diulang.

## 4. Non-goals

- Microservices atau deployment frontend/backend terpisah.
- Multi-tenant, organisasi, RBAC, atau role selain administrator.
- Public signup, password reset, social login, 2FA, atau passkey.
- Billing, subscription, pricing, atau customer portal.
- Offline-first, realtime dashboard, WebSocket, atau event streaming.
- TanStack Router, TanStack DB, TanStack Query, atau global state library.
- Migrasi Prisma ke ORM lain.
- Backward compatibility dengan API atau database lama.
- SEO campaign, CMS, blog, testimonial, atau marketing analytics.

## 5. Pengguna

### 5.1 Administrator

Pemilik produk PHP yang membuat, memperbarui, menangguhkan, memperpanjang, dan menghapus lisensi serta meninjau aktivitas verifikasi.

### 5.2 PHP License Client

Script PHP yang mengirim data instalasi ke API LEPS dan menggunakan response untuk mengizinkan atau menolak eksekusi.

### 5.3 Pengunjung Public Web

Pengguna yang ingin memahami fungsi LEPS dan menuju login admin. Public web tidak menyediakan signup.

## 6. User Journey

### 6.1 Admin

1. Admin membuka public web atau langsung menuju `/login`.
2. Admin login dengan email dan password.
3. Session valid mengarahkan admin ke `/dashboard`.
4. Admin melihat ringkasan lisensi dan aktivitas verifikasi.
5. Admin membuat atau mengubah lisensi.
6. Setiap perubahan lisensi menghapus cache terkait.
7. Admin meninjau audit log atau melakukan suspend, activate, extend, purge cache, dan delete.
8. Admin logout dan session berakhir.

### 6.2 PHP Client

1. Client mengirim request ke `/api/v1/license/verify`.
2. API memvalidasi payload dan menerapkan rate limit.
3. API membaca lisensi dari Redis atau PostgreSQL.
4. API mengevaluasi status, expiry, domain, path, dan Telegram binding.
5. API menulis audit log.
6. API mengembalikan status terstruktur dan, untuk response valid, signature Ed25519.

## 7. Functional Requirements

### 7.1 Public Web

- **FR-PUB-01:** `/` menampilkan value proposition LEPS.
- **FR-PUB-02:** Halaman menjelaskan alur create → verify → allow/block.
- **FR-PUB-03:** Halaman menampilkan fitur nyata tanpa statistik, testimonial, atau klaim buatan.
- **FR-PUB-04:** CTA mengarah ke login admin.
- **FR-PUB-05:** Public web dapat diprerender menjadi aset statis.

### 7.2 Authentication

- **FR-AUTH-01:** Admin dapat login memakai email dan password.
- **FR-AUTH-02:** Public signup dinonaktifkan.
- **FR-AUTH-03:** Route dashboard melakukan server-side session guard.
- **FR-AUTH-04:** Seluruh admin API memvalidasi session secara independen.
- **FR-AUTH-05:** Admin dapat logout.
- **FR-AUTH-06:** Seeder dapat membuat administrator awal secara eksplisit.

### 7.3 Dashboard Overview

- **FR-DASH-01:** Dashboard menampilkan jumlah license aktif.
- **FR-DASH-02:** Dashboard menampilkan license yang akan kedaluwarsa.
- **FR-DASH-03:** Dashboard menampilkan ringkasan verification result.
- **FR-DASH-04:** Dashboard menampilkan aktivitas terbaru dari data nyata.

### 7.4 License Management

- **FR-LIC-01:** Admin dapat melihat daftar license dengan pagination.
- **FR-LIC-02:** Admin dapat mencari berdasarkan license key atau domain.
- **FR-LIC-03:** Admin dapat memfilter berdasarkan status.
- **FR-LIC-04:** Admin dapat membuat license baru.
- **FR-LIC-05:** License key dibuat oleh server dan unik.
- **FR-LIC-06:** Admin dapat mengubah domain, path, Telegram binding, status tersimpan, dan expiry.
- **FR-LIC-07:** Admin dapat suspend atau activate license.
- **FR-LIC-08:** Admin dapat memperpanjang expiry.
- **FR-LIC-09:** Admin dapat menghapus license setelah konfirmasi.
- **FR-LIC-10:** Admin dapat melakukan purge cache manual.
- **FR-LIC-11:** Setiap mutation license otomatis melakukan purge cache.
- **FR-LIC-12:** Telegram bot token tidak pernah ditampilkan kembali setelah disimpan.

### 7.5 License Verification

- **FR-VER-01:** API menerima license key, domain, path instalasi, Telegram bot token, dan Telegram chat ID.
- **FR-VER-02:** API menerapkan validation dan rate limit sebelum query database.
- **FR-VER-03:** API memakai Redis cache-aside untuk license lookup.
- **FR-VER-04:** API mengevaluasi status tersimpan, status efektif dari expiry, domain, path, dan Telegram binding.
- **FR-VER-05:** API mengembalikan status `VALID`, `INVALID`, `SUSPENDED`, `EXPIRED`, `RATE_LIMITED`, atau `UNAVAILABLE`.
- **FR-VER-06:** Response `VALID` ditandatangani dengan Ed25519.
- **FR-VER-07:** Public key dapat dibagikan kepada PHP client tanpa membocorkan private key.
- **FR-VER-08:** API menyediakan header cache dan rate-limit yang terdokumentasi.

### 7.6 Audit Logs

- **FR-AUD-01:** Setiap upaya verification dicatat, termasuk license tidak ditemukan.
- **FR-AUD-02:** Log tidak menyimpan license key atau Telegram bot token lengkap.
- **FR-AUD-03:** Admin dapat melihat log dengan pagination.
- **FR-AUD-04:** Admin dapat memfilter berdasarkan status, domain, dan rentang waktu.
- **FR-AUD-05:** Kegagalan penulisan audit tidak mengubah hasil verification yang sudah dapat ditentukan.

### 7.7 Responsive dan Accessibility

- **FR-UX-01:** Seluruh halaman usable pada viewport mulai 360 px.
- **FR-UX-02:** Sidebar menjadi drawer pada mobile.
- **FR-UX-03:** Table tetap dapat dibaca melalui horizontal scroll terkontrol.
- **FR-UX-04:** Seluruh fungsi utama dapat dioperasikan dengan keyboard.
- **FR-UX-05:** Focus indicator terlihat dan status tidak disampaikan melalui warna saja.
- **FR-UX-06:** UI menyediakan loading, empty, error, success, dan disabled state.

## 8. Non-functional Requirements

### 8.1 Security

- Seluruh input pada trust boundary divalidasi.
- Password dikelola Better Auth dan tidak ditangani manual oleh LEPS.
- Telegram bot token disimpan sebagai keyed HMAC, bukan plaintext.
- Response valid memakai Ed25519 dengan private key hanya di server.
- Public signup selalu disabled pada production.
- Cookie memakai konfigurasi secure yang sesuai environment.
- Admin endpoint menolak request tanpa session valid.
- Error response tidak memuat stack trace, query, credential, atau secret.

### 8.2 Reliability

- PostgreSQL adalah source of truth.
- Redis adalah cache dan rate-limit store, bukan source of truth.
- Cache failure dapat fallback ke PostgreSQL.
- Database failure dengan cache hit tetap dapat melayani verification.
- Database failure dengan cache miss menghasilkan `503`.

### 8.3 Maintainability

- Business logic license tidak bergantung pada SvelteKit atau Elysia.
- API schema menjadi single source of truth untuk validation dan Eden type inference.
- Exact dependency versions dikunci di `bun.lock`; package manifest tidak memakai `latest`.
- Tidak ada abstraction satu-implementasi atau infrastructure spekulatif.

### 8.4 Deployment

- Satu Vercel project dan satu production domain.
- Bun digunakan untuk install, scripts, test, dan development lokal.
- Vercel production memakai Node.js runtime stabil.
- PostgreSQL dan Redis ditempatkan dekat region function.

## 9. Success Criteria

Rewrite dinyatakan berhasil ketika:

1. Seluruh functional requirements lulus acceptance test.
2. Production build SvelteKit berhasil.
3. Prisma migration dan seed dapat dijalankan dari database kosong.
4. Login, CRUD license, verification, audit log, dan logout lulus browser smoke.
5. Verification signature dapat diverifikasi menggunakan public key terpisah.
6. Tidak ada temuan security severity tinggi atau kritis yang belum diselesaikan.
7. Public web, login, dan dashboard lulus QA pada 360, 768, 1024, dan 1440 px.
8. Vercel preview terhubung ke PostgreSQL dan Redis serta lulus smoke test.

## 10. Cutover

- Tidak ada migrasi data lama.
- Database target dapat di-reset.
- API contract lama tidak dipertahankan.
- Deployment baru menggantikan deployment lama setelah preview smoke lulus.
- Rollback dilakukan melalui deployment Vercel sebelumnya dan bukan melalui compatibility code.

## 11. Risiko

| Risiko | Mitigasi |
|---|---|
| Rewrite memutus fitur yang sudah bekerja | Acceptance criteria dan batch verification menjaga parity |
| Integrasi SvelteKit–Elysia menambah boundary | Satu catch-all route dan satu Elysia app saja |
| Secret crypto salah konfigurasi | Startup validation dan documented key-generation procedure |
| Rate limiter Redis tidak tersedia | Memory fallback hanya local; production mengembalikan 503 |
| UI responsive rusak pada table/dialog | Viewport matrix dan browser smoke pada batch final |
