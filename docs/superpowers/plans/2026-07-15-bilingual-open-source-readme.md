# Bilingual Open Source README Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish accurate, complete English and Indonesian open source documentation for the current LEPS rewrite, backed by an MIT license.

**Architecture:** `README.md` is the canonical English entrypoint and `README.id.md` mirrors it section-for-section in Indonesian. Both are derived from current runtime/schema/config files, use GitHub-native Mermaid for architecture and ERD, and link to detailed repository specifications rather than duplicating every API payload.

**Tech Stack:** GitHub Markdown, Mermaid, Bun/Prettier verification, MIT License.

## Global Constraints

- Change only `README.md`, `README.id.md`, and `LICENSE` after this plan.
- Keep `README.md` English and `README.id.md` Indonesian with one-to-one heading parity.
- Describe PostgreSQL as authoritative for every license decision.
- Describe Redis REST only as production rate-limit/readiness infrastructure.
- Describe PHP lazy revalidation as once per `17,280` seconds while active.
- Do not claim current Next.js, React, license-record caching, cache purge, port 3000, or sample-license seed behavior.
- Add no dependency, image asset, runtime behavior, or deployment change.

---

### Task 1: Canonical English README and MIT License

**Files:**
- Modify: `README.md`
- Create: `LICENSE`

**Interfaces:**
- Consumes: `package.json`, `.env.example`, `prisma/schema.prisma`, `docs/PRD.md`, `docs/SPEC.md`, `docs/TECHNICAL_DESIGN.md`, and `scripts/php-client/smoke.php`.
- Produces: GitHub's canonical project entrypoint and the legal text linked by both languages.

- [ ] **Step 1: Replace `README.md` with current English documentation**

Use this exact top-level heading order:

```text
# LEPS
## Overview
## Rewrite highlights
## Features
## Non-goals
## Architecture
## Tech stack
## User flows
## Database ERD
## Security model
## Project structure
## Prerequisites
## Environment variables
## Local setup
## Commands and verification
## PHP client smoke test
## API overview
## Deploying to Vercel
## Troubleshooting
## Project status
## Contributing
## Security reporting
## License
```

At the top, link `README.id.md` as `Bahasa Indonesia`. Use factual shields for Bun 1.3.14, Svelte 5, Node 24, and MIT only. Include an architecture Mermaid flowchart and Prisma Mermaid `erDiagram` with `User`, `Session`, `Account`, `Verification`, `RateLimit`, `License`, and `VerificationLog`.

Document the actual setup sequence:

```powershell
bun install
Copy-Item .env.example .env
bun run db:migrate
bun run db:seed
bun run dev
```

Document exact validation commands from `package.json`, the isolated `_test` database guard, PHP environment inputs, Vercel Node runtime, and the known Windows Prisma/symlink troubleshooting paths.

- [ ] **Step 2: Add standard MIT text**

Create `LICENSE` using the unmodified MIT License template, copyright line:

```text
Copyright (c) 2026 barkahistigozah
```

- [ ] **Step 3: Run English documentation checks**

Run:

```powershell
rg -n "Next\.js|React|lic:<license_key>|purge cache|localhost:3000|sample license" README.md
rg -n "PostgreSQL|Redis|17,280|Ed25519|HMAC-SHA256|TEST_DATABASE_URL|Vercel" README.md
```

Expected: the first command has no active architecture claims; the second finds every required current contract.

### Task 2: Indonesian Translation and Parity Verification

**Files:**
- Create: `README.id.md`
- Verify: `README.md`
- Verify: `LICENSE`

**Interfaces:**
- Consumes: final English heading order and technical values from Task 1.
- Produces: a complete Indonesian README with identical diagrams, commands, links, configuration keys, and technical semantics.

- [ ] **Step 1: Write the complete Indonesian README**

Translate prose and headings naturally while keeping code, Mermaid node identifiers, filenames, environment variables, endpoint paths, versions, and error strings unchanged. Link `README.md` as `English` at the top.

The translated top-level headings must map one-to-one to:

```text
# LEPS
## Ringkasan
## Sorotan rewrite
## Fitur
## Non-goals
## Arsitektur
## Tech stack
## User flow
## ERD database
## Model keamanan
## Struktur project
## Prasyarat
## Environment variables
## Setup lokal
## Perintah dan verifikasi
## Smoke test PHP client
## Ringkasan API
## Deployment ke Vercel
## Troubleshooting
## Status project
## Kontribusi
## Pelaporan keamanan
## Lisensi
```

- [ ] **Step 2: Verify heading, Mermaid, command, env, and link parity**

Run PowerShell checks that count `## ` headings and Mermaid fences in both files, compare documented `bun run` commands against `package.json`, confirm every relative Markdown link target exists, and confirm environment names come from `.env.example` or `scripts/php-client/smoke.php`.

Expected:

```text
HEADING_PARITY=PASS
MERMAID_PARITY=PASS
COMMANDS=PASS
ENVIRONMENT=PASS
LINKS=PASS
```

- [ ] **Step 3: Run repository formatting checks**

Run:

```powershell
bun run format:check
git diff --check -- README.md README.id.md LICENSE
```

Expected: Prettier reports all matched files formatted and Git reports no whitespace errors.

- [ ] **Step 4: Commit only the documentation artifacts**

```powershell
git add README.md README.id.md LICENSE
git diff --cached --check
git commit -m "docs: publish bilingual open source README"
```
