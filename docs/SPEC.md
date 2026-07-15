# Functional Specification — LEPS Rewrite

**Status:** Draft for review  
**Date:** 2026-07-11

## 1. Conventions

- API base path: `/api`.
- Public API version: `v1`.
- JSON field naming: `snake_case` untuk seluruh API.
- Timestamp: ISO 8601 UTC.
- Pagination: 1-based `page` dan bounded `limit`.
- Empty response list selalu berupa array kosong, bukan `null`.
- Secret atau hash tidak pernah muncul dalam response.

## 2. Route Matrix

### Pages

| Method | Path                    | Access | Fungsi                   |
| ------ | ----------------------- | ------ | ------------------------ |
| GET    | `/`                     | Public | Product Story public web |
| GET    | `/login`                | Public | Admin login              |
| GET    | `/dashboard`            | Admin  | Overview                 |
| GET    | `/dashboard/licenses`   | Admin  | License management       |
| GET    | `/dashboard/audit-logs` | Admin  | Audit logs               |

### API

| Method           | Path                             | Access      |
| ---------------- | -------------------------------- | ----------- |
| GET              | `/api/health`                    | Public      |
| GET/POST         | `/api/auth/*`                    | Better Auth |
| GET              | `/api/admin/auth/me`             | Admin       |
| GET              | `/api/admin/stats`               | Admin       |
| GET/POST         | `/api/admin/licenses`            | Admin       |
| GET/PATCH/DELETE | `/api/admin/licenses/:id`        | Admin       |
| POST             | `/api/admin/licenses/:id/extend` | Admin       |
| GET              | `/api/admin/audit-logs`          | Admin       |
| POST             | `/api/v1/license/verify`         | Public      |

## 3. Health Endpoint

### `GET /api/health`

Response `200`:

```json
{
  "status": "READY",
  "database": "AVAILABLE",
  "redis": "AVAILABLE"
}
```

Response `503` ketika konfigurasi wajib, PostgreSQL, atau Redis production tidak tersedia:

```json
{
  "status": "UNAVAILABLE",
  "error_code": "ERR_DATABASE_CONNECTION_FAILED",
  "message": "Database connection failed.",
  "request_id": "req_..."
}
```

Health response tidak mengembalikan URL, credential, stack, atau nama host internal.

## 4. Authentication

### Login

- Form menerima email dan password.
- Submit disabled selama request aktif.
- Login berhasil mengarahkan ke `/dashboard`.
- Login gagal menampilkan satu pesan aman tanpa membedakan email tidak ada dan password salah.
- Pengguna dengan session aktif yang membuka `/login` diarahkan ke `/dashboard`.
- Password administrator minimum 12 karakter; seed menolak password yang lebih lemah.
- Better Auth rate limiting aktif dengan database storage; email sign-in dibatasi 3 percobaan per 10 detik per client identity/IP yang ditentukan Better Auth.

### Dashboard Guard

- Request halaman dashboard tanpa session diarahkan ke `/login`.
- Admin API tanpa session mengembalikan `401` JSON dan tidak redirect HTML.
- Session invalid atau expired diperlakukan sama dengan session tidak ada.

### Signup

- Endpoint public signup disabled.
- Seeder admin hanya digunakan pada setup eksplisit.
- Production startup tidak otomatis membuat akun.

## 5. Admin Stats

### `GET /api/admin/stats`

Response `200`:

```json
{
  "active_licenses": 128,
  "expiring_soon": 9,
  "verification_total_24h": 2400,
  "verification_failed_24h": 21,
  "recent_verifications": []
}
```

Definition:

- `active_licenses`: status `ACTIVE` dan `expiresAt` di masa depan.
- `expiring_soon`: active license yang berakhir dalam 14 hari.
- Verification metrics memakai rolling 24 jam.
- Recent verifications dibatasi jumlah kecil untuk overview.

## 6. License Listing

### `GET /api/admin/licenses`

Query:

| Field    |           Default | Constraint                                        |
| -------- | ----------------: | ------------------------------------------------- |
| `page`   |                 1 | Integer ≥ 1                                       |
| `limit`  |                20 | Integer 1–100                                     |
| `search` |            kosong | Maksimum 200 karakter                             |
| `status` |            kosong | Effective status `ACTIVE`, `SUSPENDED`, `EXPIRED` |
| `sort`   | `created_at_desc` | Whitelist value                                   |

Response `200`:

```json
{
  "items": [
    {
      "id": "uuid",
      "license_key": "lic_...",
      "allowed_domain": "example.com",
      "allowed_path": "/modules/bot",
      "telegram_chat_id": "88291029",
      "has_telegram_bot_token": true,
      "status": "ACTIVE",
      "expires_at": "2027-06-01T00:00:00.000Z",
      "created_at": "2026-07-11T00:00:00.000Z",
      "updated_at": "2026-07-11T00:00:00.000Z"
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 1,
  "total_pages": 1
}
```

Search mencocokkan license key atau allowed domain. Telegram token hash tidak ikut dipilih dari database untuk listing bila tidak dibutuhkan.

## 7. Create License

### `POST /api/admin/licenses`

Request:

```json
{
  "allowed_domain": "example.com",
  "allowed_path": "/modules/bot",
  "telegram_bot_token": "718293812:secret",
  "telegram_chat_id": "88291029",
  "status": "ACTIVE",
  "expires_at": "2027-06-01T00:00:00.000Z"
}
```

Rules:

- `license_key` dibuat server.
- Format license key: prefix `lic_` diikuti 24 karakter hex lowercase dari secure random identifier.
- Domain dan path dinormalisasi sebelum disimpan.
- Telegram bot token wajib pada create dan disimpan sebagai HMAC hash.
- Stored status hanya `ACTIVE` atau `SUSPENDED`; `EXPIRED` dihitung dari expiry.
- Expiry harus berada di masa depan ketika status `ACTIVE`.
- Duplicate license key diulang dengan generated key baru dalam bounded retry.

Response `201` mengembalikan license tanpa token/hash.

## 8. Get dan Update License

### `GET /api/admin/licenses/:id`

- `404` bila id tidak ada.
- Response tidak memuat token hash.
- `has_telegram_bot_token` menunjukkan apakah binding tersedia.

### `PATCH /api/admin/licenses/:id`

Semua field opsional, tetapi body kosong ditolak.

```json
{
  "allowed_domain": "new.example.com",
  "allowed_path": "/app",
  "telegram_bot_token": "replacement-token",
  "telegram_chat_id": "88291029",
  "status": "SUSPENDED",
  "expires_at": "2027-08-01T00:00:00.000Z"
}
```

Rules:

- Token yang tidak dikirim mempertahankan hash lama.
- Token string kosong ditolak dan tidak berarti hapus.
- Update domain/path/chat/token/status/expiry langsung menjadi sumber keputusan verification berikutnya.
- Response mengembalikan state setelah update tanpa secret.

## 9. Extend, Purge, dan Delete

### `POST /api/admin/licenses/:id/extend`

Request:

```json
{ "days": 14 }
```

- `days` integer 1–365.
- Perpanjangan dihitung dari nilai terbesar antara waktu sekarang dan expiry saat ini.
- Endpoint tidak otomatis mengubah `SUSPENDED` menjadi `ACTIVE`.
- PostgreSQL menjadi sumber keputusan verification berikutnya.

### `DELETE /api/admin/licenses/:id`

- UI wajib meminta confirmation.
- Audit history dipertahankan; relasi log berubah menjadi `licenseId: null` melalui `onDelete: SetNull`.
- Delete database langsung berlaku pada verification berikutnya.
- Response `204` tanpa body.

## 10. Audit Log Listing

### `GET /api/admin/audit-logs`

Query:

| Field       | Default | Constraint                      |
| ----------- | ------: | ------------------------------- |
| `page`      |       1 | Integer ≥ 1                     |
| `limit`     |      50 | Integer 1–100                   |
| `status`    |  kosong | Known result code               |
| `domain`    |  kosong | Maksimum 253 karakter           |
| `date_from` |  kosong | ISO timestamp                   |
| `date_to`   |  kosong | ISO timestamp dan ≥ `date_from` |

Response item:

```json
{
  "id": "uuid",
  "license_id": "uuid-or-null",
  "license_key_fingerprint": "lk_7c1f...",
  "request_ip": "203.0.113.10",
  "request_host": "example.com",
  "request_path": "/modules/bot",
  "status_result": "SUCCESS",
  "created_at": "2026-07-11T12:30:00.000Z"
}
```

## 11. Public Verification

### `POST /api/v1/license/verify`

Request:

```json
{
  "license_key": "lic_9f83b27c51a04e3ab11c33f2",
  "domain": "example.com",
  "request_path": "/modules/bot",
  "telegram_bot_token": "718293812:secret",
  "telegram_chat_id": "88291029"
}
```

Constraints:

- JSON only.
- Body size dibatasi ke kebutuhan payload kecil.
- Unknown fields ditolak.
- License key mengikuti format server.
- Domain berupa hostname tanpa scheme/path/port.
- Request path absolute dan tidak mengandung query/fragment.
- Telegram values memiliki batas panjang eksplisit.

### `VALID`

HTTP `200`:

```json
{
  "version": 1,
  "status": "VALID",
  "message": "Authorization granted.",
  "license_key": "lic_9f83b27c51a04e3ab11c33f2",
  "domain": "example.com",
  "request_path": "/modules/bot",
  "expires_at": "2027-06-01T00:00:00.000Z",
  "issued_at": "2026-07-11T12:30:00.000Z",
  "signature_algorithm": "Ed25519",
  "signed_payload": "base64url-encoded-utf8-json",
  "signature": "base64url-signature",
  "cache": "BYPASS"
}
```

Signature dibuat atas byte hasil decode `signed_payload`. Payload tersebut adalah compact UTF-8 JSON dengan field `version`, `status`, `license_key`, `domain`, `request_path`, `expires_at`, dan `issued_at` dalam urutan stabil. `message` dan `cache` tidak ikut ditandatangani karena tidak menentukan authorization.

PHP client harus memverifikasi signature, memastikan binding pada signed payload sama dengan instalasi lokal, dan menolak `issued_at` yang berselisih lebih dari 5 menit dari waktu client.

### Domain Results

| Result                   | HTTP | Error Code                      |
| ------------------------ | ---: | ------------------------------- |
| License tidak ditemukan  |  403 | `ERR_LICENSE_NOT_FOUND`         |
| Suspended                |  403 | `ERR_LICENSE_REVOKED`           |
| Expired                  |  403 | `ERR_LICENSE_EXPIRED`           |
| Domain/path mismatch     |  403 | `ERR_DOMAIN_PATH_MISMATCH`      |
| Telegram mismatch        |  403 | `ERR_TELEGRAM_BINDING_MISMATCH` |
| Rate limited             |  429 | `ERR_RATE_LIMITED`              |
| Store unavailable        |  503 | `ERR_LICENSE_STORE_UNAVAILABLE` |
| Rate limiter unavailable |  503 | `ERR_RATE_LIMITER_UNAVAILABLE`  |

Invalid response tidak ditandatangani.

### Headers

```text
Cache-Control: no-store
X-Content-Type-Options: nosniff
X-LEPS-Cache: HIT | MISS | BYPASS
X-RateLimit-Remaining: <number>
X-Request-ID: req_...
```

## 12. Verification Evaluation Order

1. Request validation.
2. Rate limit.
3. License lookup.
4. Stored status `SUSPENDED`.
5. Effective status `EXPIRED` ketika `expiresAt <= now`.
6. Domain match.
7. Path match.
8. Telegram bot token HMAC match.
9. Telegram chat ID exact match.
10. Audit.
11. Signature untuk hasil valid.

Urutan dibuat deterministik agar satu request menghasilkan satu primary error code.

## 13. UI Behavior Specification

### Public Web

- Header tetap sederhana dan tidak wajib sticky.
- Primary CTA menuju `/login`.
- Section muncul dalam urutan Product Story yang telah dipilih.
- Tidak ada data atau klaim palsu.

### Login

- Centered card.
- Enter dapat submit form.
- Focus berpindah ke error summary/field invalid setelah kegagalan yang relevan.
- Password tidak disimpan dalam state persistent.

### Dashboard Shell

- Desktop: sidebar terbuka.
- Tablet: sidebar compact atau collapsible.
- Mobile: menu button membuka drawer modal.
- Active navigation memiliki text dan visual indicator.

### License Page

- Search menggunakan debounce pendek atau submit eksplisit; implementation memilih yang paling sederhana.
- Pagination tidak memuat seluruh dataset.
- Create/edit memakai dialog desktop dan near-fullscreen sheet/dialog mobile.
- Token field pada edit kosong dan berlabel “replace token”; nilai lama tidak ditampilkan.
- Destructive action meminta confirmation dengan nama/key target.

### Audit Page

- Filter tidak melakukan query tidak terbatas.
- Loading mempertahankan layout agar tidak melompat.
- Empty state membedakan “belum ada log” dan “filter tidak menemukan hasil”.

## 14. Accessibility Acceptance

- Satu `h1` per page dan hierarchy heading berurutan.
- Form field mempunyai label programmatic.
- Error terhubung melalui `aria-describedby` bila relevan.
- Drawer dan dialog mengelola focus trap, Escape, dan restore focus.
- Focus indicator tidak dihapus.
- Touch target utama sekitar 44 × 44 px.
- Status badge memiliki text, bukan warna saja.
- Motion dinonaktifkan atau dikurangi melalui `prefers-reduced-motion`.
- Tabel memakai markup table semantik.

## 15. Verification Matrix

| Area      | Check                            | Expected                                            |
| --------- | -------------------------------- | --------------------------------------------------- |
| Auth      | Invalid credentials              | Safe error, no account enumeration                  |
| Auth      | Unauthorized dashboard           | Redirect login                                      |
| Admin API | Missing session                  | 401 JSON                                            |
| License   | Create valid                     | 201, key generated, token hidden                    |
| License   | Invalid domain/path              | 400 validation                                      |
| License   | Update                           | Persisted and immediately authoritative             |
| License   | Extend                           | Correct date and immediately authoritative          |
| License   | Delete                           | 204 and immediately unavailable                     |
| Verify    | Current license                  | Fresh PostgreSQL lookup, BYPASS header              |
| Verify    | Unknown key                      | 403 and audit with nullable license                 |
| Verify    | Suspended/expired                | Deterministic 403 code                              |
| Verify    | Binding mismatch                 | Deterministic 403 code                              |
| Verify    | Valid                            | Ed25519 signature verifies                          |
| Failure   | DB down                          | 503                                                 |
| Failure   | Redis rate limit down production | 503                                                 |
| UI        | 360/768/1024/1440                | No inaccessible controls or clipped primary content |
| Build     | Fresh database                   | Migration + seed + production build pass            |

### OWASP Top 10:2025 Verification

| Category | Acceptance check                                                                                          |
| -------- | --------------------------------------------------------------------------------------------------------- |
| A01      | Semua admin endpoint mengembalikan 401 tanpa session; object ID invalid tidak membocorkan data            |
| A02      | Production headers/cookies aman; debug detail dan stack tidak muncul; missing secret menggagalkan startup |
| A03      | Dependency dipin, lockfile committed, dependency vulnerability audit direkam                              |
| A04      | Ed25519 tamper/wrong-key gagal; token plaintext tidak muncul di DB, response, atau log                    |
| A05      | Injection payload pada body/search/filter tidak mengubah query atau menghasilkan executable output        |
| A06      | Abuse cases rate limit, replay freshness, stale authorization, dan failure modes memiliki test            |
| A07      | Login tidak melakukan account enumeration; signup disabled; session expired ditolak                       |
| A08      | Signed payload yang berubah gagal diverifikasi; migration/build hanya memakai repository artifact         |
| A09      | Security event memiliki request ID, secret tersensor, dan production alert/monitor dapat menerima event   |
| A10      | Seluruh exceptional condition menghasilkan response deterministik tanpa crash atau detail sensitif        |

## 16. Definition of Done

- Requirement dan acceptance checks pada dokumen ini lulus.
- Test, typecheck/lint, dan build lulus.
- Tidak ada secret plaintext pada database, response, atau logs.
- UI sesuai `UI_UX.md` dan responsive matrix.
- Preview deployment lulus smoke test.
- OWASP Top 10:2025 matrix memiliki evidence `PASS` atau alasan `NOT APPLICABLE`; tidak ada `FAIL` severity tinggi/kritis yang terbuka.
- README dan environment example sesuai implementasi final.
