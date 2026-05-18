# Licensing Engine for PHP Script (LEPS)

LEPS adalah aplikasi admin panel dan API verifikasi lisensi untuk mengamankan distribusi script PHP proprietary. Sistem ini membantu pemilik produk membatasi penggunaan script berdasarkan license key, domain, path instalasi, Telegram bot token, dan Telegram chat ID.

Aplikasi ini dirancang untuk berjalan di Vercel dengan PostgreSQL sebagai sumber data utama dan Upstash Redis sebagai cache serta rate limiter. Untuk development lokal, Redis bersifat opsional.

## Fungsi Utama

- Mengelola license key dari dashboard admin.
- Membatasi license berdasarkan domain absolut dan path instalasi.
- Mengikat license ke Telegram bot token dan chat ID.
- Menyediakan endpoint publik untuk verifikasi license dari script PHP.
- Menyimpan audit log setiap percobaan verifikasi.
- Mendukung suspend, extend, delete, dan purge cache license.
- Menggunakan Redis cache-aside agar verifikasi license lebih cepat.
- Tetap bisa berjalan tanpa Redis di lokal, dengan fallback ke database.

## Stack Teknologi

- Next.js 15 App Router
- React
- TypeScript
- Tailwind CSS
- shadcn/ui style components berbasis Radix UI
- TanStack Table
- Better Auth
- Prisma ORM
- PostgreSQL, direkomendasikan Neon untuk production
- Upstash Redis REST API untuk cache dan rate limiting
- Zod untuk validasi payload
- Bun sebagai package manager dan runtime script lokal

## Struktur Project

```txt
app/
  api/
    admin/                 API internal dashboard admin
    auth/[...all]/          Route Better Auth
    v1/license/verify/      API publik verifikasi lisensi
  dashboard/                Halaman dashboard admin
  login/                    Halaman login admin
components/                 Komponen UI dan halaman dashboard
lib/
  server/                   Helper server, Prisma, Redis, auth, schema
  auth.ts                   Konfigurasi Better Auth
prisma/
  migrations/               Migration PostgreSQL
  schema.prisma             Prisma data model
  seed.ts                   Seeder admin dan data contoh
```

## User Flow

### Admin

1. Admin membuka `/login`.
2. Admin login menggunakan email dan password.
3. Setelah berhasil, admin diarahkan ke `/dashboard`.
4. Admin dapat melihat ringkasan license aktif, audit log, dan sinyal verifikasi gagal.
5. Admin masuk ke menu `Licenses` untuk membuat license baru.
6. Admin mengisi domain, path, Telegram bot token, Telegram chat ID, status, dan tanggal expired.
7. Sistem membuat license key otomatis.
8. Admin dapat melakukan:
   - suspend atau aktifkan license
   - extend masa aktif 14 hari
   - edit binding license
   - purge cache Redis
   - delete license
9. Setiap perubahan license akan menghapus cache terkait agar verifikasi berikutnya membaca data terbaru.

### Script PHP Client

1. Script PHP mengirim request ke `/api/v1/license/verify`.
2. API melakukan rate limit berdasarkan IP.
3. API mencari data license di Redis dengan key `lic:<license_key>`.
4. Jika cache hit, API langsung mengevaluasi binding license.
5. Jika cache miss, API membaca data dari PostgreSQL lalu menyimpan hasilnya ke Redis selama 24 jam.
6. API mengecek:
   - license key terdaftar
   - status license aktif
   - belum expired
   - domain cocok
   - request path cocok
   - Telegram bot token dan chat ID cocok
7. API mengembalikan status `VALID`, `INVALID`, `SUSPENDED`, `EXPIRED`, `RATE_LIMITED`, atau `UNAVAILABLE`.

## Instalasi Local

### 1. Clone Repository

```bash
git clone https://github.com/barkahistigozah/Licensing-Engine-for-PHP-Script.git
cd Licensing-Engine-for-PHP-Script
```

Jika project sudah ada di lokal:

```bash
cd C:\Dev\LEPS
```

### 2. Install Dependency

Pastikan Bun sudah terinstall.

```bash
bun install
```

### 3. Siapkan PostgreSQL

Buat database lokal bernama `leps`.

Contoh connection string lokal:

```env
DATABASE_URL="postgresql://postgres:root@localhost:5432/leps?schema=public"
```

Sesuaikan username, password, host, dan port PostgreSQL dengan mesin lokal kamu.

### 4. Buat File Environment

Copy `.env.example` menjadi `.env`.

```bash
cp .env.example .env
```

Di Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Isi minimal:

```env
DATABASE_URL="postgresql://postgres:root@localhost:5432/leps?schema=public"
BETTER_AUTH_SECRET="ganti-dengan-secret-panjang-minimal-32-karakter"
BETTER_AUTH_URL="http://localhost:3000"
ADMIN_EMAIL="admin@leps.local"
ADMIN_NAME="Admin"
ADMIN_PASSWORD="admin"
```

Redis optional untuk local:

```env
KV_REST_API_URL=""
KV_REST_API_TOKEN=""
```

Jika Redis kosong, aplikasi tetap berjalan. API akan menggunakan database dan fallback in-memory untuk rate limit selama proses server lokal aktif.

### 5. Jalankan Migration

```bash
bun node_modules/prisma/build/index.js migrate dev
```

Atau gunakan script:

```bash
bun run db:migrate
```

### 6. Generate Prisma Client

```bash
bun run db:generate
```

### 7. Seed Admin dan Data Contoh

```bash
bun run db:seed
```

Seeder akan membuat admin berdasarkan env:

```txt
Email: admin@leps.local
Password: admin
```

### 8. Jalankan Development Server

```bash
bun run dev
```

Buka:

```txt
http://localhost:3000/login
```

## Setting Redis / Upstash

Redis digunakan untuk:

- menyimpan cache license selama 24 jam
- mempercepat endpoint verifikasi
- rate limit request verifikasi publik
- purge cache ketika admin mengubah license

Di production, gunakan Upstash Redis. Jika kamu connect Redis lewat Vercel Marketplace, Vercel biasanya membuat env berikut secara otomatis:

```env
KV_REST_API_URL="https://..."
KV_REST_API_TOKEN="..."
KV_REST_API_READ_ONLY_TOKEN="..."
KV_URL="..."
REDIS_URL="..."
```

Aplikasi ini memakai:

```env
KV_REST_API_URL
KV_REST_API_TOKEN
```

`KV_REST_API_READ_ONLY_TOKEN`, `KV_URL`, dan `REDIS_URL` boleh tetap ada, tetapi tidak dipakai oleh aplikasi ini. Kita butuh token write karena API melakukan `SET`, `DEL`, `INCR`, dan `EXPIRE`.

Jika kamu setup langsung dari dashboard Upstash, aplikasi juga mendukung nama env klasik:

```env
UPSTASH_REDIS_REST_URL="https://..."
UPSTASH_REDIS_REST_TOKEN="..."
```

Key cache license menggunakan format:

```txt
lic:<license_key>
```

Key rate limit menggunakan format:

```txt
rl:verify:<client_ip>
```

## API Verifikasi License

Endpoint:

```txt
POST /api/v1/license/verify
```

Payload:

```json
{
  "license_key": "lic_9f83b27c51a04e3ab11c33f2",
  "domain": "orbitpay.id",
  "request_path": "/modules/telegram_bot",
  "telegram_bot_token": "718293812:AAH38xJkl921zP_wM192skdW",
  "telegram_chat_id": "88291029"
}
```

Contoh response valid:

```json
{
  "status": "VALID",
  "message": "Authorization granted.",
  "expires_at": "2026-06-01T00:00:00.000Z",
  "signature": "sha256-signature",
  "cache": "MISS"
}
```

Response header penting:

```txt
X-LEPS-Cache: HIT | MISS | BYPASS
X-RateLimit-Remaining: <number>
```

Kemungkinan status:

- `VALID`: license valid dan semua binding cocok
- `INVALID`: license tidak ditemukan atau binding tidak cocok
- `SUSPENDED`: license ditangguhkan admin
- `EXPIRED`: license sudah expired
- `RATE_LIMITED`: request melebihi limit
- `UNAVAILABLE`: database tidak tersedia dan cache belum ada

## Admin API

Semua endpoint admin membutuhkan session login Better Auth.

```txt
GET    /api/admin/licenses
POST   /api/admin/licenses
GET    /api/admin/licenses/:id
PATCH  /api/admin/licenses/:id
DELETE /api/admin/licenses/:id
POST   /api/admin/licenses/:id/extend
POST   /api/admin/licenses/:id/purge-cache
GET    /api/admin/audit-logs
GET    /api/admin/stats
GET    /api/admin/auth/me
```

## Deployment ke Vercel

### Environment Variables

Set env berikut di Vercel:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"
BETTER_AUTH_SECRET="secret-production-yang-panjang-dan-acak"
BETTER_AUTH_URL="https://domain-production-kamu.com"
ADMIN_EMAIL="admin@domain.com"
ADMIN_NAME="Admin"
ADMIN_PASSWORD="password-awal-yang-kuat"
UPSTASH_REDIS_REST_URL="https://..."
UPSTASH_REDIS_REST_TOKEN="..."
```

Jika Redis kamu berasal dari Vercel Marketplace dan env yang muncul adalah `KV_REST_API_URL` dan `KV_REST_API_TOKEN`, kamu tidak perlu menambahkan `UPSTASH_REDIS_REST_URL` dan `UPSTASH_REDIS_REST_TOKEN`.

Gunakan Neon PostgreSQL untuk database production dan Upstash Redis dari Vercel Marketplace atau dashboard Upstash.

### Build Command

```bash
bun run build
```

### Seed Production

Jalankan seed hanya saat setup awal atau ketika memang ingin membuat admin/data awal.

```bash
bun run db:seed
```

Setelah admin dibuat, ganti password default menjadi password yang kuat.

## Security Notes

- Public signup Better Auth dimatikan secara default.
- Hanya seeder yang mengaktifkan signup internal sementara lewat `LEPS_ALLOW_SIGNUP=true`.
- `.env`, `.next`, `node_modules`, dan database lokal tidak boleh dicommit.
- Endpoint verifier menggunakan validasi Zod.
- Query database menggunakan Prisma parameterized queries.
- Redis dianggap acceleration layer; database tetap menjadi sumber data utama.
- Admin route dilindungi oleh session Better Auth.
- Security headers dikonfigurasi di `next.config.ts`.

## Script NPM/Bun

```bash
bun run dev          # menjalankan Next.js dev server
bun run build        # production build
bun run start        # menjalankan hasil production build
bun run lint         # linting
bun run db:generate  # generate Prisma client
bun run db:migrate   # migration development
bun run db:seed      # seed admin dan data contoh
```

## Troubleshooting

### Internal Server Error saat local

Pastikan:

- PostgreSQL aktif
- `DATABASE_URL` benar
- migration sudah dijalankan
- Prisma client sudah digenerate
- dev server direstart setelah perubahan schema/env

Perintah cepat:

```bash
bun node_modules/prisma/build/index.js migrate status
bun run db:generate
bun run dev
```

### Prisma generate gagal di Windows

Jika muncul error `EPERM rename query_engine-windows.dll.node`, hentikan dev server lebih dulu, lalu jalankan ulang:

```bash
bun run db:generate
```

### Redis belum diisi

Redis tidak perlu diisi manual. Cache dibuat otomatis saat `/api/v1/license/verify` dipanggil. Jika license diubah admin, cache terkait akan dihapus otomatis.

## License Lifecycle

```txt
CREATE LICENSE
  -> API VERIFY
    -> Redis HIT
      -> evaluate binding
    -> Redis MISS
      -> read PostgreSQL
      -> SET Redis TTL 24h
      -> evaluate binding
  -> Admin UPDATE/SUSPEND/EXTEND/DELETE
    -> DEL Redis cache
```

## Status Project

Project ini sudah memiliki:

- dashboard admin
- login session
- CRUD license
- audit log
- API verifier
- Redis cache-aside
- rate limiting
- Prisma migration
- seeder admin
- production build config
