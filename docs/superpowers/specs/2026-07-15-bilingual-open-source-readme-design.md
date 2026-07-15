# Bilingual Open Source README Design

## Objective

Replace the transitional LEPS README with accurate open source documentation for the completed SvelteKit + Elysia rewrite and redesign. The documentation must help a new visitor understand the product, evaluate its security model, run it locally, test the PHP client, and prepare a Vercel deployment without relying on the old Next.js/Redis license-cache architecture.

## Deliverables

- `README.md`: canonical English documentation shown by default on GitHub.
- `README.id.md`: complete Indonesian translation with the same section order and technical meaning.
- `LICENSE`: standard MIT License text with copyright year 2026 and owner name `barkahistigozah`.

Both README files include a language switch at the top. Neither file is a summary of the other.

## Source of Truth

Documentation facts are derived from the current repository, in this order:

1. Runtime code and `package.json`.
2. `prisma/schema.prisma` and committed migrations.
3. `.env.example`.
4. Current `docs/PRD.md`, `docs/SPEC.md`, `docs/TECHNICAL_DESIGN.md`, and `docs/UI_UX.md`.
5. Verified operational behavior and current test commands.

Historical Next.js behavior and superseded implementation-plan cache instructions are not current product behavior.

## Information Architecture

Both languages use the same structure:

1. Language switch, title, concise product description, and factual badges.
2. Overview and rewrite highlights.
3. Feature list and explicit non-goals.
4. Architecture diagram and component responsibilities.
5. Technology stack.
6. Administrator and PHP-client user flows.
7. Prisma ERD rendered with Mermaid.
8. Security model and license-verification behavior.
9. Repository structure.
10. Prerequisites and environment-variable reference.
11. Local installation and database setup.
12. Common commands and verification workflow.
13. PHP client smoke test and lazy revalidation behavior.
14. API overview with links to `docs/SPEC.md` instead of duplicating every payload.
15. Vercel deployment notes.
16. Troubleshooting, including Windows Prisma locks and Vercel adapter symlink privilege.
17. Project status, contributing, security reporting, and MIT License.

## Architecture Statements

The README must state the current contract precisely:

- SvelteKit owns pages, server loads, route guards, and the API bridge.
- Elysia owns `/api` behavior and typed endpoint composition.
- Better Auth provides the sole administrator session; public signup is disabled.
- PostgreSQL is authoritative for every license authorization decision.
- Redis REST is production infrastructure for public rate limiting and readiness, not a license-record cache.
- Telegram bot tokens are stored only as keyed HMAC-SHA256 hashes.
- Valid authorization responses are signed with Ed25519.
- The PHP client verifies signature, binding, and expiry locally and lazily revalidates once per 17,280 seconds while active.
- Audit logs never expose full license keys or plaintext Telegram tokens.

The old `lic:<license_key>` Redis cache, 24-hour server cache, purge-cache endpoint, Next.js stack, sample seed data, and localhost port 3000 must not be described as current behavior.

## Diagrams

Use GitHub-native Mermaid only; do not add image assets or a diagram dependency.

The architecture flow shows:

`Browser/Admin -> SvelteKit -> Elysia -> Better Auth/Prisma/Redis`, plus `PHP Client -> Verification API -> PostgreSQL`, with Redis shown only on the rate-limit/readiness path.

The ERD reflects the actual Prisma models and relationships:

- `User` to `Session` and `Account` as one-to-many.
- `License` to `VerificationLog` as one-to-many with nullable `licenseId` and `onDelete: SetNull` semantics.
- Standalone Better Auth `Verification` and `RateLimit` records.

Only high-value fields are shown so the diagram stays readable; the text links to `prisma/schema.prisma` for the complete schema.

## Installation and Environment Safety

- Commands are Windows PowerShell-first because this checkout is verified Windows-native, while commands themselves remain portable where possible.
- Setup uses Bun 1.3.14, Node.js 24, PostgreSQL, `.env.example`, Prisma migration, and admin seed.
- `TEST_DATABASE_URL` is documented as an isolated database whose decoded database name ends in `_test`.
- Secret generation commands may print newly generated values locally, but README examples never contain working credentials or key material.
- Local password guidance remains minimum 8 characters; production remains minimum 12 characters.
- Redis is optional outside production and required in production.
- Vercel deployment uses Node.js rather than Bun runtime.

## Open Source Sections

- Contributing uses a small fork/branch/test/PR workflow without creating a separate `CONTRIBUTING.md`.
- Security reporting directs sensitive reports to GitHub's private vulnerability reporting/security advisory flow rather than public issues.
- License sections link to `LICENSE` and identify MIT.
- Badges are limited to factual technology/version/license badges; no CI, coverage, deployment, downloads, or stability badge is shown without a real backing signal.

## Verification

The documentation pass must leave evidence for:

- English and Indonesian headings have one-to-one parity.
- Mermaid code blocks are structurally paired and contain current model/component names.
- No active claim mentions Next.js, React, Redis license caching, cache purge, port 3000, sample license seed, or a plaintext Telegram token.
- Every documented package script exists in `package.json`.
- Every documented environment variable exists in `.env.example` or is a PHP-client process variable used by `scripts/php-client/smoke.php`.
- All relative links resolve to existing repository files.
- `bun run format:check` and `git diff --check` pass.

## Scope Boundary

This task changes documentation and the MIT license only. It does not change runtime behavior, dependencies, deployment configuration, database schema, API contracts, or application UI.
