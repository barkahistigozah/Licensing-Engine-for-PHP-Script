# LEPS SvelteKit + Elysia Rewrite Implementation Plan

> **Superseded security note (2026-07-14):** `docs/superpowers/specs/2026-07-14-leps-security-remediation-design.md` removes license-record caching and manual purge. Cache-related steps later in this original rewrite plan are retained only as historical batch instructions and are not the current runtime contract.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite LEPS menjadi monolit SvelteKit + Elysia yang aman, responsive, dan dapat dideploy sebagai satu project Vercel tanpa mempertahankan compatibility dengan aplikasi lama.

**Architecture:** SvelteKit menangani public web, login, dashboard, dan server-side page guard. Satu Elysia app menangani seluruh `/api/*`, memakai Better Auth, Prisma/PostgreSQL, Upstash Redis, HMAC untuk secret binding, dan Ed25519 untuk response signature. Public page diprerender; dashboard memakai Eden Treaty untuk server dan browser calls.

**Tech Stack:** Svelte 5.56.4, SvelteKit 2.69.2, Elysia 1.4.29, Eden 1.4.10, Better Auth 1.6.23, Prisma 6.19.0, PostgreSQL, Upstash Redis REST, Bun 1.3.14, Vite 8.1.4, TypeScript 5.9.3, Playwright 1.61.1, Vercel Node.js 24.

## Source Documents

- `docs/PRD.md`
- `docs/TECHNICAL_DESIGN.md`
- `docs/SPEC.md`
- `docs/UI_UX.md`

Jika plan dan dokumen sumber berbeda, dokumen sumber menang. Perubahan requirement harus memperbarui dokumen sumber dan plan dalam commit yang sama sebelum implementation dilanjutkan.

## Global Constraints

- Belum ada backward compatibility atau data migration requirement; database boleh di-reset.
- Satu repository, satu domain, dan satu Vercel deployment.
- Bun dipakai untuk install, scripts, tests, dan development lokal; production memakai Vercel Node.js 24.
- Gunakan SvelteKit router; jangan memasang TanStack Router, TanStack Query, TanStack DB, global state library, Tailwind, shadcn, atau UI framework.
- Gunakan plain CSS, system fonts, dan native platform elements terlebih dahulu.
- Prisma 6.19.0 dipertahankan; jangan melakukan upgrade major selama rewrite.
- Package versions harus exact dan `bun.lock` wajib committed; jangan memakai `latest` atau range caret.
- Public signup disabled; password admin minimum 12 karakter.
- Stored license status hanya `ACTIVE` dan `SUSPENDED`; `EXPIRED` adalah effective status dari `expiresAt`.
- Telegram bot token disimpan sebagai HMAC-SHA256; Ed25519 private key hanya berada di server.
- PostgreSQL selalu menentukan authorization license; production Redis rate-limit failure menghasilkan `503`.
- API JSON memakai `snake_case`; unknown request fields ditolak.
- OWASP Top 10:2025 menjadi baseline minimum. Setiap batch menyimpan evidence untuk kategori yang disentuh.
- UI utama berbahasa Indonesia; stable API status/error codes tetap berbahasa teknis.
- Responsive QA wajib pada 360, 768, 1024, dan 1440 px.
- TDD: tulis check yang gagal, jalankan, implement minimal, jalankan kembali, lalu commit.
- Sebelum setiap commit, jalankan Prettier hanya pada file yang disentuh (`bunx prettier --write <paths>`) lalu ulangi narrow test.
- Kerjakan hanya batch aktif. Jangan mengambil pekerjaan batch berikutnya untuk “sekalian”.
- Jangan stage atau menghapus perubahan pengguna di luar file batch aktif.

## Pre-implementation Repository Safety

Current `dev` worktree memiliki perubahan pengguna pada `app/api/v1/license/verify/route.ts` dan `package.json`. Implementation tidak boleh dimulai langsung di worktree tersebut.

- [ ] Gunakan `superpowers:using-git-worktrees` saat execution dimulai.
- [ ] Buat branch `dev/leps-svelte-rewrite` dari commit dokumentasi terakhir.
- [ ] Pastikan worktree baru bersih sebelum Batch 1.

```powershell
git status --short
git log -3 --oneline
```

Expected: worktree execution tidak memuat perubahan uncommitted milik user.

## Batch Summary

| Batch | Deliverable                                              | Dependency |
| ----- | -------------------------------------------------------- | ---------- |
| 1     | SvelteKit/Elysia foundation yang buildable               | None       |
| 2     | Prisma baseline, crypto, Better Auth, dan session guard  | Batch 1    |
| 3     | Public license verification API                          | Batch 2    |
| 4     | Authenticated admin API                                  | Batch 3    |
| 5     | Soft Brutal public web dan centered login                | Batch 2, 4 |
| 6     | Responsive dashboard workspace                           | Batch 4, 5 |
| 7     | Global verification, cleanup, docs, dan Vercel readiness | Batch 1–6  |

## Target File Map

| Path                        | Responsibility                                          |
| --------------------------- | ------------------------------------------------------- |
| `src/lib/api/app.ts`        | Compose one`/api`-prefixed Elysia application           |
| `src/lib/api/auth.ts`       | Better Auth HTTP handler only                           |
| `src/lib/api/health.ts`     | Safe dependency readiness response                      |
| `src/lib/api/verify.ts`     | Public verification HTTP schema/headers                 |
| `src/lib/api/admin.ts`      | Authenticated admin HTTP routes                         |
| `src/lib/server/env.ts`     | Validate server configuration                           |
| `src/lib/server/prisma.ts`  | One Prisma client singleton                             |
| `src/lib/server/auth.ts`    | Better Auth config and session lookup                   |
| `src/lib/server/crypto.ts`  | HMAC, fingerprint, payload, Ed25519 primitives          |
| `src/lib/server/license.ts` | Normalization and deterministic evaluation              |
| `src/lib/server/redis.ts`   | Upstash REST cache/rate-limit states                    |
| `src/lib/server/verify.ts`  | Framework-independent verification orchestration        |
| `src/lib/server/admin.ts`   | Admin query/mutation helpers and safe serializers       |
| `src/lib/eden.ts`           | Direct server and same-origin browser Eden clients      |
| `src/routes/**`             | SvelteKit pages, loads, guard, and catch-all API bridge |
| `src/lib/components/**`     | Minimum reusable Soft Brutal UI behavior                |
| `tests/domain/**`           | Pure logic and failure-mode tests                       |
| `tests/api/**`              | Elysia/service contract tests                           |
| `tests/smoke/**`            | Authenticated and unauthenticated Playwright flows      |

## Requirement Coverage

| Requirement group            | Batch                           |
| ---------------------------- | ------------------------------- |
| PRD public/auth              | 2, 5                            |
| PRD overview/license/audit   | 4, 6                            |
| PRD verification/signature   | 3                               |
| Technical runtime/deployment | 1, 7                            |
| Technical data/Redis/crypto  | 2, 3, 4                         |
| UI/UX public/login/dashboard | 5, 6                            |
| Responsive/accessibility     | 5, 6, 7                         |
| OWASP A01–A10                | Per batch, globally closed in 7 |

---

# Batch 1 — Foundation Rewrite

## Tujuan

Menghasilkan skeleton SvelteKit + Elysia yang dapat di-install, typecheck, test, dan build tanpa menghapus legacy code lebih awal.

## Scope

- Exact package manifest dan Bun lockfile.
- SvelteKit, adapter Vercel, Vite, dan TypeScript config.
- Minimal Elysia app pada `/api/health`.
- Catch-all SvelteKit API route.
- Minimal root layout/page agar build berjalan.

## Pra-Implementasi / Default Decisions

- Legacy `app/`, `components/`, `lib/`, Next config, dan Tailwind config tetap ada tetapi tidak dipakai sampai Batch 7.
- Tidak memasang CSS framework atau component library.
- Bootstrap health response sementara adalah `{ status: "BOOTSTRAPPED" }` dan diganti pada Batch 3.

## Output Wajib

- `bun install`, `bun test`, `bun run check`, dan `bun run build` berhasil.
- `/api/health` dapat dipanggil melalui Elysia in-memory test.
- SvelteKit build memakai adapter Vercel.

## OWASP Coverage

- A02 Security Misconfiguration.
- A03 Software Supply Chain Failures.
- A08 Software or Data Integrity Failures.

## Batasan

- Jangan mengubah Prisma schema, Better Auth, license logic, atau UI final.
- Jangan menghapus legacy files.

### Task 1.1: Pin Toolchain dan SvelteKit Configuration

**Files:**

- Modify: `package.json`
- Create: `svelte.config.js`
- Create: `vite.config.ts`
- Modify: `tsconfig.json`
- Create: `.prettierrc`
- Create: `src/app.d.ts`

**Interfaces:**

- Produces scripts `dev`, `build`, `check`, `format:check`, `test`, dan database scripts.
- Produces `$lib/*` alias yang dipakai semua batch berikutnya.

- [ ] **Step 1: Replace package manifest dengan exact dependencies**

```json
{
  "name": "leps",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "packageManager": "bun@1.3.14",
  "engines": { "node": "24.x" },
  "scripts": {
    "dev": "vite dev",
    "build": "bun run db:generate && vite build",
    "preview": "vite preview",
    "check": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "test": "bun test",
    "postinstall": "bun run db:generate",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:deploy": "prisma migrate deploy",
    "db:reset": "prisma migrate reset",
    "db:seed": "bun prisma/seed.ts"
  },
  "dependencies": {
    "@better-auth/prisma-adapter": "1.6.23",
    "@elysia/eden": "1.4.10",
    "@prisma/client": "6.19.0",
    "better-auth": "1.6.23",
    "elysia": "1.4.29"
  },
  "devDependencies": {
    "@playwright/test": "1.61.1",
    "@sveltejs/adapter-vercel": "6.3.4",
    "@sveltejs/kit": "2.69.2",
    "@sveltejs/vite-plugin-svelte": "7.2.0",
    "@types/bun": "1.3.14",
    "@types/node": "24.13.3",
    "prettier": "3.9.5",
    "prettier-plugin-svelte": "4.1.1",
    "prisma": "6.19.0",
    "svelte": "5.56.4",
    "svelte-check": "4.7.2",
    "typescript": "5.9.3",
    "vite": "8.1.4"
  }
}
```

- [ ] **Step 2: Install dan verify exact lockfile**

Run:

```powershell
bun install --exact
bun pm ls
```

Expected: install sukses, `bun.lock` berubah, dan package utama sesuai versi di atas.

- [ ] **Step 3: Create framework config**

```js
// svelte.config.js
import adapter from '@sveltejs/adapter-vercel'

export default {
  kit: {
    adapter: adapter(),
    csp: {
      mode: 'auto',
      directives: {
        'default-src': ['self'],
        'script-src': ['self'],
        'style-src': ['self'],
        'connect-src': ['self'],
        'img-src': ['self', 'data:'],
        'frame-ancestors': ['none'],
        'base-uri': ['self'],
        'form-action': ['self']
      }
    }
  }
}
```

```ts
// vite.config.ts
import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vite'

export default defineConfig({ plugins: [sveltekit()] })
```

```json
// tsconfig.json
{
  "extends": "./.svelte-kit/tsconfig.json",
  "compilerOptions": {
    "allowJs": true,
    "checkJs": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "sourceMap": true,
    "strict": true
  }
}
```

```json
// .prettierrc
{
  "plugins": ["prettier-plugin-svelte"],
  "singleQuote": true,
  "semi": false,
  "trailingComma": "none"
}
```

```ts
// src/app.d.ts
declare global {
  namespace App {}
}
export {}
```

- [ ] **Step 4: Run config checks**

Run: `bunx svelte-kit sync && bun run check`Expected: command exits 0 with the minimal `src/app.d.ts`; no source route is required for this configuration check.

- [ ] **Step 5: Commit**

```powershell
git add package.json bun.lock svelte.config.js vite.config.ts tsconfig.json .prettierrc src/app.d.ts
git commit -m "build: initialize SvelteKit toolchain"
```

### Task 1.2: Bootstrap Elysia Through SvelteKit

**Files:**

- Create: `src/lib/api/app.ts`
- Create: `src/routes/api/[...slugs]/+server.ts`
- Create: `src/routes/+layout.svelte`
- Create: `src/routes/+page.svelte`
- Create: `tests/api/bootstrap.test.ts`

**Interfaces:**

- Produces `app: Elysia` and `App = typeof app`.
- Produces SvelteKit `fallback` handler for all `/api/*` methods.

- [ ] **Step 1: Write failing in-memory API test**

```ts
// tests/api/bootstrap.test.ts
import { expect, test } from 'bun:test'
import { treaty } from '@elysia/eden'
import { app } from '$lib/api/app'

test('mounts Elysia under /api', async () => {
  const api = treaty(app).api
  const { data, error, status } = await api.health.get()

  expect(error).toBeNull()
  expect(status).toBe(200)
  expect(data).toEqual({ status: 'BOOTSTRAPPED' })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/api/bootstrap.test.ts`Expected: FAIL because `$lib/api/app` does not exist.

- [ ] **Step 3: Implement minimal app and route bridge**

```ts
// src/lib/api/app.ts
import { Elysia } from 'elysia'

export const app = new Elysia({ prefix: '/api' }).get('/health', () => ({
  status: 'BOOTSTRAPPED' as const
}))

export type App = typeof app
```

```ts
// src/routes/api/[...slugs]/+server.ts
import { app } from '$lib/api/app'
import type { RequestHandler } from './$types'

export const fallback: RequestHandler = ({ request }) => app.handle(request)
```

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
  let { children } = $props()
</script>

{@render children()}
```

```svelte
<!-- src/routes/+page.svelte -->
<svelte:head><title>LEPS</title></svelte:head>
<main><h1>LEPS rewrite bootstrap</h1></main>
```

- [ ] **Step 4: Verify test, typecheck, format, dan build**

```powershell
bun test tests/api/bootstrap.test.ts
bun run check
bun run format:check
bun run build
```

Expected: all commands exit 0; SvelteKit produces Vercel build output.

- [ ] **Step 5: Commit**

```powershell
git add src tests/api/bootstrap.test.ts
git commit -m "feat: mount Elysia in SvelteKit"
```

## Verifikasi Batch 1

```powershell
bun test
bun run check
bun run format:check
bun run build
git status --short
```

Expected: commands pass; status hanya memuat perubahan yang sengaja belum committed. Record evidence A02/A03/A08 pada catatan execution batch.

---

# Batch 2 — Database, Authentication, dan Security Core

## Tujuan

Menghasilkan database baseline baru, secret handling, Better Auth, admin seed, dan server-side session guard.

## Scope

- Prisma schema/migration dari database kosong.
- Environment validation.
- HMAC dan Ed25519 primitives.
- Better Auth Elysia handler.
- Dashboard session population/guard.
- Admin seed tanpa sample production data.

## Pra-Implementasi / Default Decisions

- Hapus migration lama hanya di isolated rewrite branch.
- `LicenseStatus` berisi `ACTIVE` dan `SUSPENDED` saja.
- `VerificationLog.licenseId` nullable dengan `onDelete: SetNull`.
- Seed hanya membuat admin; sample license/log tidak dibuat.

## Output Wajib

- Fresh database migrate succeeds.
- Seed menolak password kurang dari 12 karakter dan membuat satu admin idempotently.
- Crypto unit tests lulus.
- Better Auth route dan unauthorized dashboard guard lulus.

## OWASP Coverage

- A01 Broken Access Control.
- A02 Security Misconfiguration.
- A04 Cryptographic Failures.
- A07 Authentication Failures.
- A10 Mishandling of Exceptional Conditions.

## Batasan

- Jangan membuat license verification atau admin CRUD endpoints.
- Jangan membuat final login/dashboard UI.

### Task 2.1: Replace Prisma Baseline

**Files:**

- Modify: `prisma/schema.prisma`
- Replace: `prisma/migrations/*`
- Modify: `prisma/seed.ts`
- Create: `src/lib/server/prisma.ts`
- Test: `tests/database/schema.test.ts`

**Interfaces:**

- Produces Prisma models `License` and `VerificationLog` used by Batches 3–6.
- Produces singleton `prisma`.

- [ ] **Step 1: Write schema contract test**

```ts
// tests/database/schema.test.ts
import { expect, test } from 'bun:test'
import { readFile } from 'node:fs/promises'

test('schema stores no plaintext Telegram token and preserves audit on delete', async () => {
  const schema = await readFile('prisma/schema.prisma', 'utf8')
  expect(schema).toContain('telegramBotTokenHash String')
  expect(schema).not.toContain('telegramBotToken String')
  expect(schema).toContain('onDelete: SetNull')
  expect(schema).toMatch(/enum LicenseStatus\s*{\s*ACTIVE\s+SUSPENDED\s*}/)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/database/schema.test.ts`Expected: FAIL against legacy schema.

- [ ] **Step 3: Replace schema with approved data model**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum LicenseStatus {
  ACTIVE
  SUSPENDED
}

model User {
  id            String    @id
  name          String
  email         String    @unique
  emailVerified Boolean
  image         String?
  createdAt     DateTime
  updatedAt     DateTime
  sessions      Session[]
  accounts      Account[]
  @@map("user")
}

model Session {
  id        String   @id
  expiresAt DateTime
  token     String   @unique
  createdAt DateTime
  updatedAt DateTime
  ipAddress String?
  userAgent String?
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@map("session")
}

model Account {
  id                    String    @id
  accountId             String
  providerId            String
  userId                String
  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  accessToken           String?
  refreshToken          String?
  idToken               String?
  accessTokenExpiresAt  DateTime?
  refreshTokenExpiresAt DateTime?
  scope                 String?
  password              String?
  createdAt             DateTime
  updatedAt             DateTime
  @@map("account")
}

model Verification {
  id         String    @id
  identifier String
  value      String
  expiresAt  DateTime
  createdAt  DateTime?
  updatedAt  DateTime?
  @@map("verification")
}

model RateLimit {
  id          String @id
  key         String @unique
  count       Int
  lastRequest BigInt
  @@map("rateLimit")
}

model License {
  id                   String            @id @default(uuid())
  licenseKey           String            @unique
  allowedDomain        String
  allowedPath          String
  telegramBotTokenHash String
  telegramChatId       String
  status               LicenseStatus     @default(ACTIVE)
  expiresAt            DateTime
  createdAt            DateTime          @default(now())
  updatedAt            DateTime          @updatedAt
  logs                 VerificationLog[]
  @@index([allowedDomain])
  @@index([status, expiresAt])
}

model VerificationLog {
  id                    String   @id @default(uuid())
  licenseId             String?
  license               License? @relation(fields: [licenseId], references: [id], onDelete: SetNull)
  licenseKeyFingerprint String
  requestIp             String
  requestHost           String
  requestPath           String
  statusResult          String
  createdAt             DateTime @default(now())
  @@index([licenseId])
  @@index([licenseKeyFingerprint])
  @@index([statusResult, createdAt])
  @@index([createdAt])
}
```

- [ ] **Step 4: Generate fresh migration and verify**

```powershell
$root = (Resolve-Path (git rev-parse --show-toplevel)).Path
$migrations = (Resolve-Path 'prisma/migrations').Path
if (-not $migrations.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase)) { throw 'Unsafe migrations path' }
Remove-Item -LiteralPath $migrations -Recurse -Force
bunx prisma migrate dev --name rewrite_baseline
bun run db:generate
bun test tests/database/schema.test.ts
bunx prisma migrate status
```

Expected: test passes; migration status reports database up to date.

- [ ] **Step 5: Add Prisma singleton and commit**

```ts
// src/lib/server/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalPrisma = globalThis as unknown as { prisma?: PrismaClient }
export const prisma = globalPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalPrisma.prisma = prisma
```

```powershell
git add prisma src/lib/server/prisma.ts tests/database/schema.test.ts
git commit -m "feat: reset Prisma schema for secure licensing"
```

### Task 2.2: Environment dan Cryptographic Primitives

**Files:**

- Create: `src/lib/server/env.ts`
- Create: `src/lib/server/crypto.ts`
- Create: `tests/domain/env.test.ts`
- Create: `tests/domain/crypto.test.ts`
- Modify: `.env.example`

**Interfaces:**

- Produces `readServerEnv()`.
- Produces `hashTelegramToken()`, `fingerprintLicenseKey()`, `safeHashEqual()`, `buildSignedPayload()`, dan `signPayload()`.

- [ ] **Step 1: Write failing environment and crypto tests**

```ts
// tests/domain/env.test.ts
import { expect, test } from 'bun:test'
import { readServerEnv } from '$lib/server/env'

test('rejects missing production secrets', () => {
  expect(() => readServerEnv({ NODE_ENV: 'production' })).toThrow(
    'DATABASE_URL'
  )
})
```

```ts
// tests/domain/crypto.test.ts
import { expect, test } from 'bun:test'
import { generateKeyPairSync, verify } from 'node:crypto'
import {
  buildSignedPayload,
  hashTelegramToken,
  signPayload
} from '$lib/server/crypto'

test('hash is deterministic and purpose separated', () => {
  expect(hashTelegramToken('secret', 'token')).toBe(
    hashTelegramToken('secret', 'token')
  )
})

test('Ed25519 signs exact payload bytes', () => {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519')
  const payload = buildSignedPayload({
    version: 1,
    status: 'VALID',
    license_key: 'lic_1234567890abcdef12345678',
    domain: 'example.com',
    request_path: '/',
    expires_at: '2027-01-01T00:00:00.000Z',
    issued_at: '2026-07-11T00:00:00.000Z'
  })
  const signature = signPayload(
    privateKey.export({ type: 'pkcs8', format: 'der' }).toString('base64'),
    payload.bytes
  )
  expect(
    verify(null, payload.bytes, publicKey, Buffer.from(signature, 'base64url'))
  ).toBe(true)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test tests/domain/env.test.ts tests/domain/crypto.test.ts`Expected: FAIL because modules do not exist.

- [ ] **Step 3: Implement minimal safe primitives**

```ts
// src/lib/server/crypto.ts — required public surface
import {
  createHmac,
  createPrivateKey,
  sign,
  timingSafeEqual
} from 'node:crypto'

const hmac = (secret: string, purpose: string, value: string) =>
  createHmac('sha256', secret)
    .update(`${purpose}${value}`, 'utf8')
    .digest('base64url')

export const hashTelegramToken = (secret: string, token: string) =>
  hmac(secret, 'telegram-token:v1:', token)

export const fingerprintLicenseKey = (secret: string, key: string) =>
  Buffer.from(hmac(secret, 'license-key-fingerprint:v1:', key), 'base64url')
    .subarray(0, 16)
    .toString('base64url')

export const safeHashEqual = (left: string, right: string) => {
  const a = Buffer.from(left, 'base64url')
  const b = Buffer.from(right, 'base64url')
  return a.length === b.length && timingSafeEqual(a, b)
}

export function buildSignedPayload(value: Record<string, string | number>) {
  const bytes = Buffer.from(JSON.stringify(value), 'utf8')
  return { bytes, encoded: bytes.toString('base64url') }
}

export function signPayload(privateKeyBase64: string, payload: Uint8Array) {
  const key = createPrivateKey({
    key: Buffer.from(privateKeyBase64, 'base64'),
    format: 'der',
    type: 'pkcs8'
  })
  return sign(null, payload, key).toString('base64url')
}
```

`readServerEnv()` harus memvalidasi semua required production variables dari `TECHNICAL_DESIGN.md`, menolak secret kurang dari 32 karakter, dan hanya mengizinkan Redis kosong pada non-production.

```ts
// src/lib/server/env.ts — validation shape
type Source = Record<string, string | undefined>
const requireValue = (source: Source, key: string) => {
  const value = source[key]?.trim()
  if (!value) throw new Error(`${key} is required.`)
  return value
}

export function readServerEnv(source: Source = process.env) {
  const production = source.NODE_ENV === 'production'
  const bindingSecret = requireValue(source, 'LICENSE_BINDING_SECRET')
  const authSecret = requireValue(source, 'BETTER_AUTH_SECRET')
  if (bindingSecret.length < 32)
    throw new Error(
      'LICENSE_BINDING_SECRET must contain at least 32 characters.'
    )
  if (authSecret.length < 32)
    throw new Error('BETTER_AUTH_SECRET must contain at least 32 characters.')
  const redisUrl = source.KV_REST_API_URL ?? source.UPSTASH_REDIS_REST_URL
  const redisToken = source.KV_REST_API_TOKEN ?? source.UPSTASH_REDIS_REST_TOKEN
  if (production && (!redisUrl || !redisToken))
    throw new Error('Production Redis configuration is required.')
  return {
    production,
    databaseUrl: requireValue(source, 'DATABASE_URL'),
    authSecret,
    authUrl: requireValue(source, 'BETTER_AUTH_URL'),
    bindingSecret,
    signingPrivateKey: requireValue(source, 'LICENSE_SIGNING_PRIVATE_KEY'),
    signingPublicKey: requireValue(source, 'LICENSE_SIGNING_PUBLIC_KEY'),
    redisUrl,
    redisToken
  }
}
```

- [ ] **Step 4: Verify tests and secret scan**

```powershell
bun test tests/domain/env.test.ts tests/domain/crypto.test.ts
rg -n "telegramBotToken\s+String|BEGIN PRIVATE KEY" prisma src .env.example
```

Expected: tests pass; scan tidak menemukan plaintext schema field atau private key literal.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/server/env.ts src/lib/server/crypto.ts tests/domain .env.example
git commit -m "feat: add validated secrets and signing primitives"
```

### Task 2.3: Better Auth, Session Guard, dan Admin Seed

**Files:**

- Create: `src/lib/server/auth.ts`
- Create: `src/lib/api/auth.ts`
- Modify: `src/lib/api/app.ts`
- Create: `src/hooks.server.ts`
- Modify: `src/app.d.ts`
- Create: `src/routes/dashboard/+layout.server.ts`
- Modify: `prisma/seed.ts`
- Create: `tests/api/auth.test.ts`

**Interfaces:**

- Produces `auth`, `authApi`, `getAdminSession(headers)`, dan `event.locals.session/user`.

- [ ] **Step 1: Write failing route/guard tests**

```ts
// tests/api/auth.test.ts
import { expect, test } from 'bun:test'
import { app } from '$lib/api/app'

test('rejects unsupported auth method', async () => {
  const response = await app.handle(
    new Request('http://local/api/auth/session', { method: 'PUT' })
  )
  expect(response.status).toBe(405)
})

test('dashboard guard contract returns no user for missing cookie', async () => {
  const { getAdminSession } = await import('$lib/server/auth')
  expect(await getAdminSession(new Headers())).toBeNull()
})

test('public email signup stays disabled', async () => {
  const response = await app.handle(
    new Request('http://local/api/auth/sign-up/email', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'public@example.com',
        name: 'Public',
        password: 'strong-password-123'
      })
    })
  )
  expect(response.status).toBeGreaterThanOrEqual(400)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test tests/api/auth.test.ts`Expected: FAIL because auth modules do not exist.

- [ ] **Step 3: Implement Better Auth and route**

```ts
// src/lib/server/auth.ts — core configuration
import { prismaAdapter } from '@better-auth/prisma-adapter'
import { betterAuth } from 'better-auth'
import { prisma } from './prisma'

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: process.env.LEPS_ALLOW_SIGNUP !== 'true',
    minPasswordLength: 12
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 30,
    storage: 'database',
    modelName: 'rateLimit',
    customRules: { '/sign-in/email': { window: 10, max: 3 } }
  },
  trustedOrigins: [
    process.env.BETTER_AUTH_URL ?? 'http://localhost:5173',
    'http://127.0.0.1:5173'
  ]
})

export async function getAdminSession(headers: Headers) {
  const session = await auth.api.getSession({ headers })
  return session?.user ? session : null
}
```

```ts
// src/lib/api/auth.ts
import { Elysia } from 'elysia'
import { auth } from '$lib/server/auth'

export const authApi = new Elysia().all('/auth/*', ({ request, status }) => {
  if (request.method !== 'GET' && request.method !== 'POST') return status(405)
  return auth.handler(request)
})
```

Use `app.use(authApi)` inside the existing `/api`-prefixed application.

- [ ] **Step 4: Populate SvelteKit locals and implement guard**

```ts
// src/hooks.server.ts
import type { Handle } from '@sveltejs/kit'
import { getAdminSession } from '$lib/server/auth'

export const handle: Handle = async ({ event, resolve }) => {
  if (
    event.url.pathname.startsWith('/dashboard') ||
    event.url.pathname === '/login'
  ) {
    const authSession = await getAdminSession(event.request.headers)
    event.locals.session = authSession?.session ?? null
    event.locals.user = authSession?.user ?? null
  }
  const response = await resolve(event)
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  return response
}
```

Content Security Policy berasal dari `kit.csp` agar SvelteKit menambahkan hash/nonce yang dibutuhkan hydration; jangan membuat CSP manual yang memblokir script hasil build.

```ts
// src/routes/dashboard/+layout.server.ts
import { redirect } from '@sveltejs/kit'
import type { LayoutServerLoad } from './$types'
export const load: LayoutServerLoad = ({ locals }) => {
  if (!locals.user) redirect(303, '/login')
  return { user: locals.user }
}
```

Modify `src/app.d.ts` so `App.Locals.user` and `session` use `typeof auth.$Infer.Session.user/session` and allow null.

Seeder:

```ts
// prisma/seed.ts
async function main() {
  const password = process.env.ADMIN_PASSWORD
  if (!password || password.length < 12)
    throw new Error('ADMIN_PASSWORD must contain at least 12 characters.')
  process.env.LEPS_ALLOW_SIGNUP = 'true'
  const [{ auth }, { prisma }] = await Promise.all([
    import('../src/lib/server/auth'),
    import('../src/lib/server/prisma')
  ])
  const email = process.env.ADMIN_EMAIL ?? 'admin@leps.local'
  const name = process.env.ADMIN_NAME ?? 'Admin'
  const existing = await prisma.user.findUnique({ where: { email } })
  if (!existing) await auth.api.signUpEmail({ body: { email, name, password } })
  console.log(`Admin ready: ${email}`)
  await prisma.$disconnect()
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Seed failed.')
  process.exit(1)
})
```

- [ ] **Step 5: Verify auth and commit**

```powershell
bun test tests/api/auth.test.ts
bun run check
bun run db:seed
bun run db:seed
git add src prisma/seed.ts tests/api/auth.test.ts
git commit -m "feat: add Better Auth and dashboard session guard"
```

Expected: tests pass; running seed twice leaves one admin.

## Verifikasi Batch 2

```powershell
bun test tests/database tests/domain tests/api/auth.test.ts
bun run check
bun run format:check
bun run build
bunx prisma migrate status
```

Expected: commands pass. Record evidence A01/A02/A04/A07/A10 and confirm no sample license or secret is seeded.

---

# Batch 3 — Public License Verification API

## Tujuan

Menghasilkan `/api/health` dan `/api/v1/license/verify` lengkap dengan validation, rate limiting, cache-aside, audit, effective status, dan Ed25519 signature.

## Scope

- Domain/path normalization dan license evaluation.
- Redis REST client dengan explicit unavailable state.
- Verification orchestration yang dapat diuji tanpa HTTP server.
- Elysia schemas, headers, status codes, dan request IDs.
- Health endpoint production dependencies.

## Pra-Implementasi / Default Decisions

- Tidak ada CORS/OPTIONS karena client adalah PHP server-to-server.
- Unknown fields ditolak.
- Cache TTL 300 detik.
- Rate limit default 60 request/60 detik/IP.
- Audit failure tidak mengganti hasil verification.
- Invalid response tidak ditandatangani.

## Output Wajib

- Semua result code dalam `SPEC.md` dapat diproduksi deterministically.
- Valid response memiliki `signed_payload` dan signature yang terverifikasi.
- Unknown license tetap membuat audit log dengan `licenseId = null`.
- Redis rate-limit unavailable pada production menghasilkan 503.

## OWASP Coverage

- A02, A04, A05, A06, A08, A09, dan A10.

## Batasan

- Jangan membuat admin CRUD.
- Jangan membuat UI.

### Task 3.1: License Domain Functions

**Files:**

- Create: `src/lib/server/license.ts`
- Create: `tests/domain/license.test.ts`

**Interfaces:**

- Produces `normalizeDomain`, `normalizePath`, `generateLicenseKey`, `effectiveStatus`, dan `evaluateLicense`.

- [ ] **Step 1: Write failing domain tests**

```ts
// tests/domain/license.test.ts
import { expect, test } from 'bun:test'
import {
  effectiveStatus,
  evaluateLicense,
  normalizeDomain,
  normalizePath
} from '$lib/server/license'

test('normalizes approved host/path forms', () => {
  expect(normalizeDomain('Example.COM.')).toBe('example.com')
  expect(normalizePath('/modules/bot/')).toBe('/modules/bot')
})

test('rejects scheme and query input', () => {
  expect(() => normalizeDomain('https://example.com')).toThrow()
  expect(() => normalizePath('/bot?debug=1')).toThrow()
})

test('derives expiration without stored EXPIRED state', () => {
  expect(
    effectiveStatus(
      { status: 'ACTIVE', expiresAt: new Date('2026-01-01') },
      new Date('2026-01-02')
    )
  ).toBe('EXPIRED')
})

test('evaluates suspension before other mismatches', () => {
  expect(
    evaluateLicense(
      {
        status: 'SUSPENDED',
        expiresAt: new Date('2027-01-01'),
        allowedDomain: 'example.com',
        allowedPath: '/',
        telegramBotTokenHash: 'same',
        telegramChatId: '1'
      },
      {
        domain: 'wrong.test',
        requestPath: '/',
        telegramBotTokenHash: 'same',
        telegramChatId: '1'
      },
      new Date('2026-01-01')
    )
  ).toBe('SUSPENDED')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/domain/license.test.ts`Expected: FAIL because module does not exist.

- [ ] **Step 3: Implement exact domain result order**

```ts
// src/lib/server/license.ts — public surface
export type StoredStatus = 'ACTIVE' | 'SUSPENDED'
export type EffectiveStatus = StoredStatus | 'EXPIRED'
export type Evaluation =
  | 'SUCCESS'
  | 'SUSPENDED'
  | 'EXPIRED'
  | 'MISMATCH_DOMAIN'
  | 'MISMATCH_PATH'
  | 'MISMATCH_TELEGRAM'

export function normalizeDomain(input: string): string
export function normalizePath(input: string): string
export function generateLicenseKey(): string
export function effectiveStatus(
  record: { status: StoredStatus; expiresAt: Date },
  now?: Date
): EffectiveStatus
export function evaluateLicense(
  record: {
    status: StoredStatus
    expiresAt: Date
    allowedDomain: string
    allowedPath: string
    telegramBotTokenHash: string
    telegramChatId: string
  },
  input: {
    domain: string
    requestPath: string
    telegramBotTokenHash: string
    telegramChatId: string
  },
  now?: Date
): Evaluation
```

Implementation order: suspended → expired → domain → path → token/chat → success. Domain must reject scheme/path/query/port; path must start `/`, reject query/fragment, and remove trailing slash except root. `generateLicenseKey()` returns `lic_` plus 24 lowercase hex characters from `crypto.randomUUID()`.

- [ ] **Step 4: Run domain tests**

Run: `bun test tests/domain/license.test.ts`Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/server/license.ts tests/domain/license.test.ts
git commit -m "feat: add deterministic license evaluation"
```

### Task 3.2: Redis Cache dan Rate Limiter

**Files:**

- Create: `src/lib/server/redis.ts`
- Create: `tests/domain/redis.test.ts`

**Interfaces:**

- Produces discriminated results `CacheRead<T>` dan `RateLimitResult`.
- Produces `readCache`, `writeCache`, `deleteCache`, `rateLimit`, dan `pingRedis`.

- [ ] **Step 1: Write failing Redis behavior tests**

```ts
// tests/domain/redis.test.ts
import { expect, test } from 'bun:test'
import { createRedisClient } from '$lib/server/redis'

test('distinguishes cache miss from transport failure', async () => {
  const miss = createRedisClient({
    url: 'https://redis.test',
    token: 'x',
    fetcher: async () => Response.json({ result: null })
  })
  expect(await miss.readCache('lic:key')).toEqual({ state: 'miss' })

  const down = createRedisClient({
    url: 'https://redis.test',
    token: 'x',
    fetcher: async () => new Response('down', { status: 503 })
  })
  expect(await down.readCache('lic:key')).toEqual({ state: 'unavailable' })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/domain/redis.test.ts`Expected: FAIL because Redis client does not exist.

- [ ] **Step 3: Implement one small REST client**

```ts
export type CacheRead<T> =
  | { state: 'hit'; value: T }
  | { state: 'miss' }
  | { state: 'unavailable' }

export type RateLimitResult =
  | { state: 'ok'; allowed: boolean; remaining: number }
  | { state: 'unavailable' }

export function createRedisClient(options: {
  url?: string
  token?: string
  fetcher?: typeof fetch
  production?: boolean
}) {
  return {
    readCache<T>(key: string): Promise<CacheRead<T>>,
    writeCache(key: string, value: unknown, ttlSeconds: number): Promise<boolean>,
    deleteCache(key: string): Promise<boolean>,
    rateLimit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult>,
    pingRedis(): Promise<boolean>
  }
}
```

Use Upstash REST commands `GET`, `SET ... EX 300`, `DEL`, `INCR`, dan `EXPIRE`. Missing config uses process-local rate limit only when `production === false`; production returns unavailable.

- [ ] **Step 4: Run tests and verify no swallowed invalidation**

```powershell
bun test tests/domain/redis.test.ts
rg -n "deleteCache|state: 'unavailable'" src/lib/server/redis.ts
```

Expected: tests pass; delete returns boolean and does not silently report success.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/server/redis.ts tests/domain/redis.test.ts
git commit -m "feat: add explicit Redis cache and rate limit states"
```

### Task 3.3: Verification Service dan Elysia Route

**Files:**

- Create: `src/lib/server/verify.ts`
- Create: `src/lib/api/verify.ts`
- Create: `src/lib/api/health.ts`
- Create: `src/lib/server/http.ts`
- Modify: `src/lib/api/app.ts`
- Delete: `tests/api/bootstrap.test.ts`
- Create: `tests/api/health.test.ts`
- Create: `tests/api/verify.test.ts`

**Interfaces:**

- Produces `verifyLicense(deps, input, context): Promise<VerifyResult>`.
- Produces `verifyApi` and `healthApi` Elysia plugins.
- Produces `requestId()`, `apiError()`, and redacted structured logging.

- [ ] **Step 1: Write failing orchestration tests**

```ts
// tests/api/verify.test.ts
import { expect, test } from 'bun:test'
import { verifyLicense } from '$lib/server/verify'

test('returns signed VALID result from a matching record', async () => {
  const result = await verifyLicense(
    {
      now: () => new Date('2026-07-11T00:00:00.000Z'),
      rateLimit: async () => ({ state: 'ok', allowed: true, remaining: 59 }),
      readCache: async () => ({ state: 'miss' }),
      writeCache: async () => true,
      findLicense: async () => ({
        id: '1',
        licenseKey: 'lic_1234567890abcdef12345678',
        allowedDomain: 'example.com',
        allowedPath: '/',
        telegramBotTokenHash: 'hash',
        telegramChatId: '1',
        status: 'ACTIVE',
        expiresAt: new Date('2027-01-01')
      }),
      writeAudit: async () => undefined,
      hashToken: () => 'hash',
      sign: () => 'signature'
    },
    {
      license_key: 'lic_1234567890abcdef12345678',
      domain: 'example.com',
      request_path: '/',
      telegram_bot_token: 'token',
      telegram_chat_id: '1'
    },
    { clientIp: '127.0.0.1' }
  )

  expect(result.httpStatus).toBe(200)
  expect(result.body.status).toBe('VALID')
  expect(result.body.signature).toBe('signature')
})

test('records unknown keys without a license id', async () => {
  let auditLicenseId: string | null | undefined
  const result = await verifyLicense(
    {
      now: () => new Date(),
      rateLimit: async () => ({ state: 'ok', allowed: true, remaining: 59 }),
      readCache: async () => ({ state: 'miss' }),
      writeCache: async () => true,
      findLicense: async () => null,
      hashToken: () => 'hash',
      sign: () => 'unused',
      writeAudit: async (entry) => {
        auditLicenseId = entry.licenseId
      }
    },
    {
      license_key: 'lic_1234567890abcdef12345678',
      domain: 'example.com',
      request_path: '/',
      telegram_bot_token: 'token',
      telegram_chat_id: '1'
    },
    { clientIp: '127.0.0.1' }
  )
  expect(result.body.error_code).toBe('ERR_LICENSE_NOT_FOUND')
  expect(auditLicenseId).toBeNull()
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test tests/api/verify.test.ts`Expected: FAIL because verify service does not exist.

- [ ] **Step 3: Implement service result contract**

`VerifyResult` must contain `httpStatus`, `body`, `cacheStatus`, and `rateLimitRemaining`. Implement every branch from `SPEC.md`: validation is handled by Elysia; service handles rate-limit unavailable/rejected, cache hit/miss/unavailable, DB unavailable, unknown key, six evaluation results, best-effort audit, and signed valid response.

The signed body must include:

```ts
{
  version: 1,
  status: 'VALID',
  license_key: string,
  domain: string,
  request_path: string,
  expires_at: string,
  issued_at: string,
  signature_algorithm: 'Ed25519',
  signed_payload: string,
  signature: string,
  cache: 'HIT' | 'MISS' | 'BYPASS'
}
```

- [ ] **Step 4: Add strict Elysia schema and response headers**

`src/lib/api/verify.ts` defines only `POST /v1/license/verify` with `t.Object(..., { additionalProperties: false })`, a small body-size guard, request ID, `Cache-Control: no-store`, `X-Content-Type-Options`, `X-LEPS-Cache`, `X-RateLimit-Remaining`, and `X-Request-ID`. `healthApi` replaces bootstrap health and returns 503 when production database or Redis readiness fails.

Replace the Batch 1 bootstrap test with:

```ts
// tests/api/health.test.ts
import { expect, test } from 'bun:test'
import { createHealthApi } from '$lib/api/health'

test('reports ready only when required dependencies are ready', async () => {
  const api = createHealthApi({
    databaseReady: async () => true,
    redisReady: async () => true,
    production: true
  })
  const response = await api.handle(new Request('http://local/health'))
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({
    status: 'READY',
    database: 'AVAILABLE',
    redis: 'AVAILABLE'
  })
})

test('fails closed when production Redis is unavailable', async () => {
  const api = createHealthApi({
    databaseReady: async () => true,
    redisReady: async () => false,
    production: true
  })
  expect((await api.handle(new Request('http://local/health'))).status).toBe(
    503
  )
})
```

`src/lib/server/http.ts` generates `req_<uuid>`, creates `{ error_code, message, request_id }`, and logs JSON after recursively replacing values whose keys match `password|token|secret|privateKey|authorization|cookie` with `[REDACTED]`.

- [ ] **Step 5: Verify and commit**

```powershell
bun test tests/domain tests/api/health.test.ts tests/api/verify.test.ts
bun run check
git add src/lib/server/verify.ts src/lib/server/http.ts src/lib/api tests/api/bootstrap.test.ts tests/api/health.test.ts tests/api/verify.test.ts
git commit -m "feat: add signed license verification API"
```

## Verifikasi Batch 3

```powershell
bun test tests/domain tests/api/health.test.ts tests/api/verify.test.ts
bun run check
bun run format:check
bun run build
```

Manual in-memory checks must cover HTTP 200/400/403/429/503 and verify a modified `signed_payload` fails Ed25519 verification. Record OWASP A02/A04/A05/A06/A08/A09/A10 evidence.

---

# Batch 4 — Authenticated Admin API

## Tujuan

Menghasilkan admin stats, paginated license CRUD, extend, purge cache, dan paginated audit API dengan session check pada setiap endpoint.

## Scope

- Admin session helper dan consistent 401 JSON.
- Stats rolling 24h dan expiring 14 days.
- License listing/search/filter/pagination/detail/create/update/extend/delete/purge.
- Audit listing/filter/pagination.
- Secret-safe serializers.

## Pra-Implementasi / Default Decisions

- Semua JSON response memakai `snake_case`.
- `page` mulai 1; license default limit 20, audit default 50, maksimum 100.
- Search memakai case-insensitive Prisma query pada license key/domain.
- Cache invalidation failure returns 503 while DB mutation remains committed.
- Delete preserves audit logs through `SetNull`.

## Output Wajib

- Seluruh admin endpoint menolak missing/expired session.
- Token hash tidak pernah muncul dalam response.
- Derived `EXPIRED` listing/filter works without stored enum value.
- Pagination returns stable total/total_pages.

## OWASP Coverage

- A01, A02, A05, A06, A07, A09, dan A10.

## Batasan

- Jangan membuat frontend pages.
- Jangan menambah RBAC atau multi-admin roles.

### Task 4.1: Admin Read APIs

**Files:**

- Create: `src/lib/api/admin.ts`
- Create: `src/lib/server/admin.ts`
- Modify: `src/lib/api/app.ts`
- Create: `tests/api/admin-read.test.ts`

**Interfaces:**

- Produces `createAdminApi(deps)` for stats, auth/me, license listing/detail, and audit listing.

- [ ] **Step 1: Write failing auth/pagination tests**

```ts
// tests/api/admin-read.test.ts
import { expect, test } from 'bun:test'
import { createAdminApi } from '$lib/api/admin'

test('denies every admin read without a session', async () => {
  const api = createAdminApi({ getAdmin: async () => null } as never)
  const response = await api.handle(new Request('http://local/admin/stats'))
  expect(response.status).toBe(401)
})

test('bounds page size at 100', async () => {
  const api = createAdminApi({
    getAdmin: async () => ({ user: { id: '1' } })
  } as never)
  const response = await api.handle(
    new Request('http://local/admin/licenses?limit=101')
  )
  expect(response.status).toBe(400)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test tests/api/admin-read.test.ts`Expected: FAIL because admin API does not exist.

- [ ] **Step 3: Implement shared query/serializer functions**

`src/lib/server/admin.ts` exports:

```ts
export const effectiveLicenseStatus = (
  license: { status: 'ACTIVE' | 'SUSPENDED'; expiresAt: Date },
  now?: Date
) =>
  license.status === 'SUSPENDED'
    ? 'SUSPENDED'
    : license.expiresAt <= (now ?? new Date())
      ? 'EXPIRED'
      : 'ACTIVE'

export function serializeLicense(license: License) {
  const { telegramBotTokenHash: _secret, ...safe } = license
  return {
    id: safe.id,
    license_key: safe.licenseKey,
    allowed_domain: safe.allowedDomain,
    allowed_path: safe.allowedPath,
    telegram_chat_id: safe.telegramChatId,
    has_telegram_bot_token: true,
    status: effectiveLicenseStatus(license),
    expires_at: safe.expiresAt.toISOString(),
    created_at: safe.createdAt.toISOString(),
    updated_at: safe.updatedAt.toISOString()
  }
}
```

Create Prisma where clauses for `ACTIVE`, `SUSPENDED`, and derived `EXPIRED`, plus rolling stats and audit filters. Never select token hash for listing.

- [ ] **Step 4: Implement Elysia read routes with explicit guard**

Each handler begins:

```ts
const admin = await deps.getAdmin(request.headers)
if (!admin)
  return status(401, {
    error_code: 'UNAUTHORIZED',
    message: 'Admin session is required.',
    request_id
  })
```

Then implement `/admin/auth/me`, `/admin/stats`, `/admin/licenses`, `/admin/licenses/:id`, and `/admin/audit-logs` with strict schemas and bounded pagination.

- [ ] **Step 5: Verify and commit**

```powershell
bun test tests/api/admin-read.test.ts
bun run check
git add src/lib/api/admin.ts src/lib/server/admin.ts src/lib/api/app.ts tests/api/admin-read.test.ts
git commit -m "feat: add protected admin read APIs"
```

### Task 4.2: Admin Mutations dan Cache Invalidation

**Files:**

- Modify: `src/lib/api/admin.ts`
- Modify: `src/lib/server/admin.ts`
- Create: `tests/api/admin-write.test.ts`

**Interfaces:**

- Adds create, patch, extend, purge, and delete methods to `createAdminApi`.
- Adds `calculateExtendedExpiry(current: Date, days: number, now?: Date): Date`.

- [ ] **Step 1: Write failing mutation security tests**

```ts
// tests/api/admin-write.test.ts
import { expect, test } from 'bun:test'
import { calculateExtendedExpiry, serializeLicense } from '$lib/server/admin'

test('serializer never returns token hash', () => {
  const result = serializeLicense({
    telegramBotTokenHash: 'secret-hash',
    status: 'ACTIVE',
    expiresAt: new Date('2027-01-01'),
    createdAt: new Date(),
    updatedAt: new Date()
  } as never)
  expect(JSON.stringify(result)).not.toContain('secret-hash')
})

test('extend starts from now when already expired', () => {
  const now = new Date('2026-07-11T00:00:00Z')
  const expected = new Date('2026-07-25T00:00:00Z')
  expect(calculateExtendedExpiry(new Date('2026-01-01'), 14, now)).toEqual(
    expected
  )
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test tests/api/admin-write.test.ts`Expected: FAIL until `calculateExtendedExpiry` and safe serializer are complete.

- [ ] **Step 3: Implement mutation rules**

```ts
export function calculateExtendedExpiry(
  current: Date,
  days: number,
  now = new Date()
) {
  const next = new Date(current > now ? current : now)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}
```

- Create: generate server key, normalize domain/path, HMAC token, default expiry +14 days.
- Patch: reject empty body; only replace token when non-empty token is provided.
- Extend: `days` integer 1–365; base is max(now, current expiry); suspension remains suspended.
- Purge: idempotent success when key is absent; 503 when Redis is unavailable.
- Delete: delete DB record, preserve logs, purge cache.
- Every successful DB mutation attempts cache delete and returns `ERR_CACHE_INVALIDATION_FAILED` 503 if delete cannot be confirmed.

- [ ] **Step 4: Run tests against fresh test database**

```powershell
if (-not $env:TEST_DATABASE_URL -or $env:TEST_DATABASE_URL -notmatch '_test') { throw 'TEST_DATABASE_URL must target a database containing _test' }
$env:DATABASE_URL = $env:TEST_DATABASE_URL
bunx prisma migrate reset --force --skip-seed
bun test tests/api/admin-read.test.ts tests/api/admin-write.test.ts
```

Expected: all admin tests pass; database contains no plaintext Telegram token.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/api/admin.ts src/lib/server/admin.ts tests/api/admin-write.test.ts
git commit -m "feat: add secure license administration APIs"
```

## Verifikasi Batch 4

```powershell
bun test tests/api/admin-read.test.ts tests/api/admin-write.test.ts
bun run check
bun run format:check
bun run build
```

Run an endpoint matrix for every `/api/admin/*` route with no cookie and assert 401. Search serialized responses/logs for `telegramBotTokenHash`. Record OWASP A01/A02/A05/A06/A07/A09/A10 evidence.

---

# Batch 5 — Soft Brutal Public Web dan Login

## Tujuan

Mengimplementasikan visual foundation, Product Story public page, dan Centered Card login yang responsive dan accessible.

## Scope

- Global Soft Brutal tokens dan base styles.
- Minimal reusable Button/TextField/Card/InlineAlert.
- Public Product Story page.
- Better Auth Svelte client dan login flow.
- Public/login Playwright smoke.

## Pra-Implementasi / Default Decisions

- Plain CSS dan system fonts.
- Public page prerendered.
- Login uses same-origin Better Auth client.
- Tidak ada signup/forgot-password/social auth.
- Copy utama Bahasa Indonesia.

## Output Wajib

- `/` sesuai C1 Product Story.
- `/login` sesuai L1 Centered Card.
- Session aktif di `/login` redirect ke `/dashboard`.
- Invalid login tidak melakukan account enumeration.
- 360–1440 px bebas page-level horizontal overflow.

## OWASP Coverage

- A02, A05, A07, dan A10.

## Batasan

- Jangan mengimplementasikan dashboard content pages.
- Jangan menambah icon/font/UI libraries.

### Task 5.1: Global Tokens dan UI Primitives

**Files:**

- Create: `src/app.css`
- Modify: `src/routes/+layout.svelte`
- Create: `src/lib/components/ui/Button.svelte`
- Create: `src/lib/components/ui/TextField.svelte`
- Create: `src/lib/components/ui/Card.svelte`
- Create: `src/lib/components/ui/InlineAlert.svelte`
- Modify: `src/routes/+page.svelte`
- Create: `tests/smoke/accessibility.spec.ts`
- Create: `playwright.config.ts`

**Interfaces:**

- Produces shared CSS custom properties and form primitives used by login/dashboard.

- [ ] **Step 1: Write failing browser accessibility shell test**

```ts
// tests/smoke/accessibility.spec.ts
import { expect, test } from '@playwright/test'

test('public page has one visible h1 and keyboard focus', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('h1')).toHaveCount(1)
  await page.keyboard.press('Tab')
  await expect(page.locator(':focus')).toBeVisible()
})
```

```ts
// playwright.config.ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'tests/smoke',
  use: { baseURL: 'http://127.0.0.1:4173', trace: 'retain-on-failure' },
  webServer: {
    command: 'bun run build && bun run preview --host 127.0.0.1',
    port: 4173,
    reuseExistingServer: false
  }
})
```

- [ ] **Step 2: Run test to verify it fails against bootstrap page**

Run:

```powershell
bunx playwright install chromium
bunx playwright test tests/smoke/accessibility.spec.ts
```

Expected: FAIL because bootstrap page has no focusable navigation/action.

- [ ] **Step 3: Implement exact global tokens**

```css
:root {
  --sand: #dcc9a9;
  --red: #b83a2d;
  --green: #4e6851;
  --ink: #273229;
  --paper: #fbf4e8;
  --white: #fffdf8;
  --border: 2px solid var(--ink);
  --shadow-sm: 3px 3px 0 var(--green);
  --shadow-md: 6px 6px 0 var(--green);
  font-family:
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    sans-serif;
  color: var(--ink);
  background: var(--paper);
}
* {
  box-sizing: border-box;
}
body {
  margin: 0;
  min-width: 320px;
  background: var(--paper);
}
button,
input,
select {
  font: inherit;
}
:focus-visible {
  outline: 3px solid var(--red);
  outline-offset: 3px;
}
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    transition: none !important;
  }
}
```

`Button` renders a native `<button>` or `<a>` based on `href`, keeps visible text, minimum 44 px height, border/shadow, and disabled/busy states. `TextField` renders visible label, input, optional hint/error with `aria-describedby`. `Card` is a semantic wrapper. `InlineAlert` uses `role="alert"` only for active errors.

Replace the Batch 1 bootstrap body with `<main><h1>LEPS rewrite bootstrap</h1><a href="/login">Login admin</a></main>` so the foundation accessibility test has a real keyboard target before the full public page arrives.

- [ ] **Step 4: Import CSS and run checks**

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import '../app.css'
  let { children } = $props()
</script>

{@render children()}
```

Run: `bun run check && bunx playwright test tests/smoke/accessibility.spec.ts`Expected: typecheck and accessibility shell test pass.

- [ ] **Step 5: Commit**

```powershell
git add src/app.css src/routes/+layout.svelte src/lib/components/ui playwright.config.ts tests/smoke/accessibility.spec.ts
git commit -m "feat: add Soft Brutal UI foundation"
```

### Task 5.2: Product Story Public Page

**Files:**

- Replace: `src/routes/+page.svelte`
- Create: `src/routes/+page.ts`
- Create: `tests/smoke/public.spec.ts`

**Interfaces:**

- Produces static `/` with anchor sections `how-it-works`, `features`, and `security`.

- [ ] **Step 1: Write failing content and responsive tests**

```ts
// tests/smoke/public.spec.ts
import { expect, test } from '@playwright/test'

for (const width of [360, 768, 1024, 1440]) {
  test(`public Product Story works at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Kirim kode Anda'
    )
    await expect(
      page.getByRole('link', { name: 'Login admin' })
    ).toHaveAttribute('href', '/login')
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth
    )
    expect(overflow).toBe(false)
  })
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx playwright test tests/smoke/public.spec.ts`Expected: FAIL against bootstrap content.

- [ ] **Step 3: Implement Product Story structure**

```svelte
<svelte:head>
  <title>LEPS — Licensing Engine untuk Script PHP</title>
  <meta
    name="description"
    content="Kelola dan verifikasi lisensi script PHP berdasarkan domain, path, dan Telegram binding."
  />
</svelte:head>

<header class="site-header">
  <a class="wordmark" href="/">LEPS</a>
  <nav aria-label="Navigasi utama">
    <a href="#how-it-works">Cara kerja</a><a href="#security">Keamanan</a><a
      class="login"
      href="/login">Login admin</a
    >
  </nav>
</header>
<main>
  <section class="hero">
    <p class="eyebrow">LICENSING ENGINE UNTUK SCRIPT PHP</p>
    <h1>Kirim kode Anda.<br />Tetap pegang kendali.</h1>
    <p>
      Kelola lisensi berdasarkan domain, path instalasi, dan Telegram binding
      melalui satu API yang jelas.
    </p>
    <a class="primary" href="#how-it-works">Lihat cara kerjanya</a>
  </section>
  <section id="how-it-works" aria-labelledby="flow-title">
    <h2 id="flow-title">Tiga langkah. Tanpa drama.</h2>
    <ol>
      <li>Buat license</li>
      <li>Verifikasi instalasi</li>
      <li>Izinkan atau blokir</li>
    </ol>
  </section>
  <section id="features" aria-labelledby="features-title">
    <h2 id="features-title">Kontrol yang memang dibutuhkan</h2>
    <ul>
      <li>Domain dan path binding</li>
      <li>Rate limit dan cache</li>
      <li>Audit setiap percobaan</li>
      <li>Suspend dan expiry</li>
    </ul>
  </section>
  <section id="security" aria-labelledby="security-title">
    <h2 id="security-title">Secret tidak diperlakukan sebagai teks biasa.</h2>
    <p>
      Telegram token disimpan sebagai keyed hash dan response valid
      ditandatangani dengan Ed25519.
    </p>
  </section>
  <section class="final-cta">
    <h2>Masuk ke control room.</h2>
    <a class="primary" href="/login">Login admin</a>
  </section>
</main>
```

Add scoped CSS implementing C1 layout, `clamp()` typography, 2–3 px borders, 8–12 px radius, solid green shadows, stacked mobile sections, and no fake claims/data.

- [ ] **Step 4: Enable prerender and verify**

```ts
// src/routes/+page.ts
export const prerender = true
```

Run: `bunx playwright test tests/smoke/public.spec.ts tests/smoke/accessibility.spec.ts`Expected: all tests pass.

- [ ] **Step 5: Commit**

```powershell
git add src/routes/+page.svelte src/routes/+page.ts tests/smoke/public.spec.ts
git commit -m "feat: redesign public Product Story page"
```

### Task 5.3: Centered Better Auth Login

**Files:**

- Create: `src/lib/auth-client.ts`
- Create: `src/routes/login/+page.server.ts`
- Create: `src/routes/login/+page.svelte`
- Create: `tests/smoke/helpers.ts`
- Create: `tests/smoke/login.spec.ts`

**Interfaces:**

- Produces `authClient` and login flow to `/dashboard`.

- [ ] **Step 1: Write failing login UI tests**

```ts
// tests/smoke/login.spec.ts
import { expect, test } from '@playwright/test'

test('login exposes labeled fields and safe error', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill('missing@example.com')
  await page.getByLabel('Password').fill('not-the-password')
  await page.getByRole('button', { name: 'Masuk' }).click()
  await expect(page.getByRole('alert')).toContainText(
    'Email atau password tidak valid'
  )
  await expect(page.getByRole('alert')).not.toContainText('missing@example.com')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx playwright test tests/smoke/login.spec.ts`Expected: FAIL because `/login` is absent.

- [ ] **Step 3: Implement auth client and server redirect**

```ts
// src/lib/auth-client.ts
import { createAuthClient } from 'better-auth/svelte'
export const authClient = createAuthClient()
```

```ts
// tests/smoke/helpers.ts
import { expect, type Page } from '@playwright/test'

export async function loginAsAdmin(page: Page) {
  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD
  if (!email || !password)
    throw new Error(
      'ADMIN_EMAIL and ADMIN_PASSWORD are required for dashboard smoke tests.'
    )
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Masuk' }).click()
  await expect(page).toHaveURL(/\/dashboard/)
}
```

```ts
// src/routes/login/+page.server.ts
import { redirect } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'
export const load: PageServerLoad = ({ locals }) => {
  if (locals.user) redirect(303, '/dashboard')
}
```

- [ ] **Step 4: Implement centered form behavior**

`+page.svelte` uses `TextField` for email/password, tracks `busy` and one safe error string, calls `authClient.signIn.email({ email, password })`, and on success calls `goto('/dashboard')`. The form has a visible `h1`, link back to `/`, Enter submit, disabled busy state, and L1 split sand/paper background.

- [ ] **Step 5: Verify and commit**

```powershell
bunx playwright test tests/smoke/login.spec.ts
bun run check
git add src/lib/auth-client.ts src/routes/login tests/smoke/helpers.ts tests/smoke/login.spec.ts
git commit -m "feat: add centered admin login"
```

## Verifikasi Batch 5

```powershell
bun run check
bun run format:check
bun run build
bunx playwright test tests/smoke/public.spec.ts tests/smoke/login.spec.ts tests/smoke/accessibility.spec.ts
```

Expected: commands pass at all viewport targets. Record OWASP A02/A05/A07/A10 evidence and screenshots for public/login review.

---

# Batch 6 — Responsive Dashboard Workspace

## Tujuan

Mengimplementasikan D1 Sidebar Workspace untuk overview, license management, dan audit logs memakai typed Eden calls.

## Scope

- Server/browser Eden helpers.
- Responsive dashboard shell and native dialog/drawer.
- Overview data.
- License CRUD/filter/pagination.
- Audit filter/pagination.
- Loading, empty, error, success, disabled, dan confirmation states.

## Pra-Implementasi / Default Decisions

- Server loads use `treaty(app)` directly with incoming cookie headers.
- Browser mutations use current origin with `credentials: include`.
- Native `<dialog>` digunakan untuk modal dan mobile drawer.
- Tidak ada chart; counts dan tables cukup.
- Search submit eksplisit, bukan debounce.

## Output Wajib

- Semua dashboard routes protected sebelum render.
- Sidebar desktop, compact tablet, drawer mobile.
- Seluruh CRUD dan audit flow usable pada 360–1440 px.
- Token lama tidak pernah ditampilkan pada edit.

## OWASP Coverage

- A01, A02, A05, A07, A09, dan A10.

## Batasan

- Jangan menambah dashboard charts, drag-and-drop, realtime, atau global store.
- Jangan menyembunyikan status/action hanya melalui warna atau icon.

### Task 6.1: Eden Helpers dan Dashboard Shell

**Files:**

- Create: `src/lib/eden.ts`
- Create: `src/lib/components/AppSidebar.svelte`
- Create: `src/lib/components/ui/Modal.svelte`
- Create: `src/lib/components/ui/Badge.svelte`
- Create: `src/routes/dashboard/+layout.svelte`
- Create: `tests/smoke/dashboard-shell.spec.ts`

**Interfaces:**

- Produces `getServerApi(headers)` and `getBrowserApi()`.
- Produces responsive shell slots for child pages.

- [ ] **Step 1: Write failing shell tests**

```ts
// tests/smoke/dashboard-shell.spec.ts
import { expect, test } from '@playwright/test'
import { loginAsAdmin } from './helpers'

test('mobile dashboard uses a labeled drawer trigger', async ({ page }) => {
  await loginAsAdmin(page)
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('/dashboard')
  await expect(
    page.getByRole('button', { name: 'Buka navigasi' })
  ).toBeVisible()
})

test('desktop dashboard exposes text navigation', async ({ page }) => {
  await loginAsAdmin(page)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/dashboard')
  await expect(page.getByRole('navigation').getByText('Licenses')).toBeVisible()
  await expect(
    page.getByRole('navigation').getByText('Audit logs')
  ).toBeVisible()
})

test('logout ends the admin session', async ({ page }) => {
  await loginAsAdmin(page)
  await page.getByRole('button', { name: 'Keluar' }).click()
  await expect(page).toHaveURL(/\/login/)
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/login/)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx playwright test tests/smoke/dashboard-shell.spec.ts`Expected: FAIL because shell UI is absent or redirect-only.

- [ ] **Step 3: Implement Eden helpers**

```ts
// src/lib/eden.ts
import { treaty } from '@elysia/eden'
import { app, type App } from '$lib/api/app'

export const getServerApi = (headers: Headers) =>
  treaty(app, {
    headers: Object.fromEntries(headers.entries())
  }).api

export const getBrowserApi = () =>
  treaty<App>(window.location.origin, {
    fetch: { credentials: 'include' }
  }).api
```

- [ ] **Step 4: Implement accessible shell**

`AppSidebar` renders text links for Overview, Licenses, and Audit logs plus logout. `+layout.svelte` renders desktop sidebar at ≥1024 px, compact mode at 768–1023 px, and a native modal drawer below 768 px. Drawer closes on Escape/navigation and restores trigger focus. `Modal` wraps native `<dialog>` and exposes `open()`, `close()`, labelled title, and cancel event.

Logout handler is explicit and shared by desktop/mobile sidebar renderings:

```ts
import { goto } from '$app/navigation'
import { authClient } from '$lib/auth-client'

async function logout() {
  await authClient.signOut()
  await goto('/login')
}
```

- [ ] **Step 5: Verify and commit**

```powershell
bun run check
bunx playwright test tests/smoke/dashboard-shell.spec.ts
git add src/lib/eden.ts src/lib/components src/routes/dashboard/+layout.svelte tests/smoke/dashboard-shell.spec.ts
git commit -m "feat: add responsive dashboard shell"
```

### Task 6.2: Overview Page

**Files:**

- Create: `src/routes/dashboard/+page.server.ts`
- Replace: `src/routes/dashboard/+page.svelte`
- Create: `tests/smoke/dashboard-overview.spec.ts`

**Interfaces:**

- Consumes `getServerApi()` and `/api/admin/stats`.
- Produces overview metric cards and recent activity.

- [ ] **Step 1: Write failing overview test**

```ts
// tests/smoke/dashboard-overview.spec.ts
import { expect, test } from '@playwright/test'
import { loginAsAdmin } from './helpers'

test('overview shows only approved metrics', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/dashboard')
  await expect(
    page.getByRole('heading', { name: 'Ringkasan sistem' })
  ).toBeVisible()
  await expect(page.getByText('License aktif')).toBeVisible()
  await expect(page.getByText('Akan kedaluwarsa')).toBeVisible()
  await expect(page.locator('canvas')).toHaveCount(0)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx playwright test tests/smoke/dashboard-overview.spec.ts`Expected: FAIL because overview is absent.

- [ ] **Step 3: Implement server load**

```ts
// src/routes/dashboard/+page.server.ts
import { error, redirect } from '@sveltejs/kit'
import { getServerApi } from '$lib/eden'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ request }) => {
  const result = await getServerApi(request.headers).admin.stats.get()
  if (result.error?.status === 401) redirect(303, '/login')
  if (result.error)
    error(result.error.status, { message: result.error.value.message })
  const data = result.data
  return { stats: data }
}
```

- [ ] **Step 4: Implement D1 overview**

Render title, `New License` link, approved metrics, recent licenses, and recent verification table. Use one responsive grid, semantic table, explicit empty/error states, and no chart.

- [ ] **Step 5: Verify and commit**

```powershell
bunx playwright test tests/smoke/dashboard-overview.spec.ts
bun run check
git add src/routes/dashboard/+page.server.ts src/routes/dashboard/+page.svelte tests/smoke/dashboard-overview.spec.ts
git commit -m "feat: add dashboard overview"
```

### Task 6.3: License Management Page

**Files:**

- Create: `src/routes/dashboard/licenses/+page.server.ts`
- Create: `src/routes/dashboard/licenses/+page.svelte`
- Create: `src/lib/components/LicenseForm.svelte`
- Create: `tests/smoke/licenses.spec.ts`

**Interfaces:**

- Consumes typed admin license endpoints.
- Produces search/filter/pagination/create/edit/status/extend/purge/delete flows.

- [ ] **Step 1: Write failing happy-path and secret tests**

```ts
// tests/smoke/licenses.spec.ts
import { expect, test } from '@playwright/test'
import { loginAsAdmin } from './helpers'

test('admin creates and suspends a license without exposing token', async ({
  page
}) => {
  await loginAsAdmin(page)
  await page.goto('/dashboard/licenses')
  await page.getByRole('button', { name: 'Buat license' }).click()
  await page.getByLabel('Domain').fill('example.com')
  await page.getByLabel('Path instalasi').fill('/bot')
  await page.getByLabel('Telegram bot token').fill('123456789:secure-token')
  await page.getByLabel('Telegram chat ID').fill('123')
  await page.getByRole('button', { name: 'Simpan license' }).click()
  await expect(page.getByText('example.com')).toBeVisible()
  await expect(page.getByText('123456789:secure-token')).toHaveCount(0)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx playwright test tests/smoke/licenses.spec.ts`Expected: FAIL because page does not exist.

- [ ] **Step 3: Implement typed load and form**

`+page.server.ts` forwards `page`, `limit`, `search`, and `status` to Eden. `LicenseForm` exposes visible labels, replacement-token behavior on edit, client validation matching API constraints, and no persistence of password/token values.

- [ ] **Step 4: Implement actions and responsive table**

Use `getBrowserApi()` for mutations; handle `{ data, error }` explicitly; call `invalidateAll()` after success. Destructive actions open confirmation dialog naming the license. Mutation failure keeps dialog/form state. Table scrolls inside `.table-scroll`, never at page root.

- [ ] **Step 5: Verify and commit**

```powershell
bunx playwright test tests/smoke/licenses.spec.ts
bun run check
git add src/routes/dashboard/licenses src/lib/components/LicenseForm.svelte tests/smoke/licenses.spec.ts
git commit -m "feat: add responsive license management"
```

### Task 6.4: Audit Logs Page

**Files:**

- Create: `src/routes/dashboard/audit-logs/+page.server.ts`
- Create: `src/routes/dashboard/audit-logs/+page.svelte`
- Create: `tests/smoke/audit-logs.spec.ts`

**Interfaces:**

- Consumes typed paginated audit endpoint.
- Produces status/domain/date filters and paginated semantic table.

- [ ] **Step 1: Write failing filter/empty-state test**

```ts
// tests/smoke/audit-logs.spec.ts
import { expect, test } from '@playwright/test'
import { loginAsAdmin } from './helpers'

test('audit filters distinguish no data from no matches', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/dashboard/audit-logs')
  await page.getByLabel('Domain').fill('does-not-exist.test')
  await page.getByRole('button', { name: 'Terapkan filter' }).click()
  await expect(
    page.getByText('Tidak ada log yang cocok dengan filter')
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Reset filter' })).toBeVisible()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx playwright test tests/smoke/audit-logs.spec.ts`Expected: FAIL because page does not exist.

- [ ] **Step 3: Implement paginated load and filters**

Forward `page`, `limit`, `status`, `domain`, `date_from`, and `date_to` through Eden. Reject invalid date range server-side and preserve filter values in URL query.

- [ ] **Step 4: Implement semantic table and states**

Render timestamp, key fingerprint, domain/path, IP, and status result. Use text badges and no full license key/token. Add loading navigation feedback, no-data state, no-match state, reset, and bounded pagination.

- [ ] **Step 5: Verify and commit**

```powershell
bunx playwright test tests/smoke/audit-logs.spec.ts
bun run check
git add src/routes/dashboard/audit-logs tests/smoke/audit-logs.spec.ts
git commit -m "feat: add searchable audit logs"
```

## Verifikasi Batch 6

```powershell
bun run check
bun run format:check
bun run build
bunx playwright test tests/smoke/dashboard-shell.spec.ts tests/smoke/dashboard-overview.spec.ts tests/smoke/licenses.spec.ts tests/smoke/audit-logs.spec.ts
```

Expected: all dashboard flows pass on 360/768/1024/1440. Record OWASP A01/A02/A05/A07/A09/A10 evidence and screenshots.

---

# Batch 7 — Global Verification, Cleanup, dan Vercel Readiness

## Tujuan

Menghapus legacy Next/React code, menutup seluruh verification matrix, memperbarui dokumentasi operasional, dan membuktikan Vercel preview siap menggantikan deployment lama.

## Scope

- Legacy cleanup.
- Full tests, formatting, typecheck, fresh migration/seed, build, dependency audit.
- OWASP Top 10:2025 review.
- Responsive/accessibility browser QA.
- README/env/gitignore finalization.
- Vercel preview build dan smoke.

## Pra-Implementasi / Default Decisions

- Tidak ada production data migration.
- Tidak ada Bun production runtime opt-in.
- `.superpowers/` bersifat local-only dan masuk `.gitignore`.
- Tidak ada security vendor baru; gunakan Vercel logs/monitoring yang tersedia.

## Output Wajib

- Legacy Next/React/Tailwind/shadcn tidak tersisa.
- Fresh database migrate + seed berhasil.
- Semua automated checks lulus.
- OWASP matrix memiliki PASS atau justified NOT APPLICABLE; tidak ada open high/critical finding.
- Vercel preview smoke lulus.
- README menjelaskan setup nyata final.

## OWASP Coverage

- A01–A10 global review.

## Batasan

- Jangan menambah fitur bisnis baru.
- Jangan mengubah desain yang telah dikunci kecuali untuk bug accessibility/security.

### Task 7.1: Remove Legacy Stack dan Finalize Operational Docs

**Files:**

- Delete: `app/`
- Delete: `components/`
- Delete: `lib/`
- Delete: `next-env.d.ts`
- Delete: `next.config.ts`
- Delete: `tailwind.config.ts`
- Delete: `postcss.config.mjs`
- Delete: `components.json`
- Delete: `eslint.config.mjs`
- Modify: `.gitignore`
- Modify: `.env.example`
- Modify: `README.md`

**Interfaces:**

- Produces one unambiguous SvelteKit application tree.

- [ ] **Step 1: Prove new implementation no longer imports legacy paths**

```powershell
rg -n "from ['\"]@/|from ['\"]next|from ['\"]react|tailwind|radix-ui" src tests package.json
```

Expected: no legacy imports. Any result must be fixed before deletion.

- [ ] **Step 2: Delete only verified legacy paths**

Resolve and verify every target is inside the isolated rewrite worktree, then remove the listed files/directories with native PowerShell `Remove-Item -LiteralPath`. Do not touch `docs/`, `prisma/`, `src/`, or user worktree.

- [ ] **Step 3: Finalize ignore/env documentation**

`.gitignore` must include:

```text
node_modules
.svelte-kit
build
.vercel
.env
.env.*
!.env.example
playwright-report
test-results
.superpowers
*.log
```

`.env.example` lists all variables from `TECHNICAL_DESIGN.md` with safe placeholders and explains how to generate Ed25519 PKCS#8/SPKI base64 keys without including real keys.

- [ ] **Step 4: Rewrite README around actual commands**

README must cover architecture, prerequisites, Bun install, PostgreSQL, Redis production requirement, migration, key generation, seed, dev, tests, build, Vercel env, API sample, signature verification contract, and troubleshooting. Remove all Next.js/Tailwind instructions.

- [ ] **Step 5: Verify and commit**

```powershell
bun run check
bun run build
git add -A app components lib next-env.d.ts next.config.ts tailwind.config.ts postcss.config.mjs components.json eslint.config.mjs .gitignore .env.example README.md
git commit -m "chore: remove legacy Next.js application"
```

### Task 7.2: Global Automated and OWASP Verification

**Files:**

- Modify tests where a verified global regression exposes a gap.
- Modify `docs/IMPLEMENTATION_PLAN.md` only to check completed steps and append exact execution evidence.

**Interfaces:**

- Produces release evidence for A01–A10 and full verification matrix.

- [ ] **Step 1: Fresh database verification**

```powershell
if (-not $env:TEST_DATABASE_URL -or $env:TEST_DATABASE_URL -notmatch '_test') { throw 'TEST_DATABASE_URL must target a database containing _test' }
$env:DATABASE_URL = $env:TEST_DATABASE_URL
bunx prisma migrate reset --force
bun run db:seed
bun run db:seed
bunx prisma migrate status
```

Expected: reset succeeds, seed is idempotent, database is up to date, and one admin exists.

- [ ] **Step 2: Run static, unit, integration, and dependency checks**

```powershell
bun audit
bun test
bun run check
bun run format:check
bun run build
```

Expected: all exit 0. Any high/critical dependency advisory blocks release unless removed/upgraded and re-tested.

- [ ] **Step 3: Run security scans tied to OWASP matrix**

```powershell
rg -n "telegram_bot_token|telegramBotTokenHash|LICENSE_SIGNING_PRIVATE_KEY|BETTER_AUTH_SECRET" src tests
rg -n "\$queryRawUnsafe|\$executeRawUnsafe|{@html}|innerHTML|eval\(|new Function" src
rg -n '"latest"|"\^|"~' package.json
```

Expected: secrets only appear as field/env names in approved server code/tests; unsafe SQL/HTML/eval absent; dependencies exact.

Run the admin endpoint 401 matrix, login enumeration test, signature tamper/wrong-key/freshness tests, Redis/DB/cache purge failure tests, and logging redaction tests. Mark each OWASP A01–A10 row PASS or justified NOT APPLICABLE in execution evidence.

- [ ] **Step 4: Run full browser and responsive suite**

```powershell
bunx playwright test
```

Expected: public, login, dashboard, CRUD, audit, logout, keyboard, dialog/drawer, and viewport tests pass. Review retained screenshots/traces only for failures; no page-level horizontal overflow.

- [ ] **Step 5: Commit verified fixes and evidence**

```powershell
git add src tests docs/IMPLEMENTATION_PLAN.md
git commit -m "test: complete global security and responsive verification"
```

### Task 7.3: Vercel Preview and Cutover Readiness

**Files:**

- Modify: `README.md` only if preview exposes an operational correction.

**Interfaces:**

- Produces a preview deployment ready for explicit user-approved production promotion.

- [ ] **Step 1: Pull preview environment and build locally**

```powershell
bunx vercel pull --yes --environment=preview
bunx vercel build
```

Expected: Vercel detects SvelteKit, Node.js 24 runtime, and build exits 0 without `bunVersion` production opt-in.

- [ ] **Step 2: Deploy preview**

Pause and request explicit user approval before creating the external preview deployment.

```powershell
bunx vercel deploy
```

Expected: command returns a preview URL. Do not use `--prod` in this task.

- [ ] **Step 3: Smoke preview endpoints and UI**

Against the returned preview URL, verify `/`, `/login`, unauthorized `/dashboard` redirect, `/api/health`, authenticated admin flows, one create/verify/delete license cycle, Redis HIT/MISS headers, and Ed25519 signature verification.

- [ ] **Step 4: Document preview evidence**

Append preview URL, deployment ID, commit SHA, commands, UTC timestamp, and smoke results to the Batch 7 execution evidence section. Do not include secrets or auth cookies.

- [ ] **Step 5: Commit operational corrections**

If README required correction, commit only that correction:

```powershell
git add README.md docs/IMPLEMENTATION_PLAN.md
git commit -m "docs: record Vercel preview verification"
```

Promotion to production is a separate explicit user-approved action after this plan is fully verified.

## Verifikasi Batch 7 / Definition of Done

## Batch 7 Execution Evidence (2026-07-14 UTC)

- [x] Task 7.1 cleanup: legacy `app/`, `components/`, `lib/`, Next/Tailwind configs, dan `components.json` dihapus setelah `rg` membuktikan tidak ada import legacy pada `src`, `tests`, atau `package.json`.
- [x] Task 7.1 docs: `.gitignore`, `.prettierignore`, `.env.example`, dan `README.md` difinalkan untuk SvelteKit/Elysia; `bun run format:check` lulus.
- [x] Automated checks: `bun test` lulus (41 test); `bun run check` lulus tanpa error/warning; Playwright lulus (12 smoke test, termasuk 360/768/1024/1440).
- [x] OWASP review: secret scan hanya menemukan nama field/env pada server/tests; tidak ada unsafe raw SQL/HTML/eval; manifest memakai versi exact. `bun audit` hanya melaporkan satu advisory low pada transitif `cookie <0.7.0`, tanpa high/critical.
- [ ] Fresh isolated database: tidak dijalankan karena `TEST_DATABASE_URL` tidak tersedia atau tidak menunjuk database `_test`; database development tidak di-reset.
- [ ] Vercel build/preview: build lokal berhenti pada Windows `EPERM` ketika adapter membuat symlink di `.vercel/output`; `bunx vercel pull --yes --environment=preview` tidak menghasilkan output dan dihentikan setelah menunggu. Deploy preview belum dijalankan karena memerlukan persetujuan eksplisit terpisah.

```powershell
bun audit
bun test
bun run check
bun run format:check
bun run build
bunx playwright test
git status --short
git log --oneline --decorate -12
```

Required final state:

- Commands pass.
- Worktree clean.
- OWASP A01–A10 evidence complete.
- No high/critical finding open.
- Preview smoke passes.
- Production promotion has not occurred without explicit approval.

---

## Plan Execution Rules

1. Execute one task at a time and preserve checkbox state.
2. Run the narrow failing/passing check before global checks.
3. Stop at each batch boundary for review; do not continue automatically into the next batch unless instructed.
4. Do not weaken a security/accessibility requirement to make a test pass.
5. Record blockers with exact command, error, environment, and attempted safe alternatives.
6. Keep commits scoped to one task and never include the original user worktree changes.
