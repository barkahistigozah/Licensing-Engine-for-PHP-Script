# Private Repository `.gitignore` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent tests, internal documentation, generated output, caches, and machine-specific files from entering future Git commits.

**Architecture:** Use one repository-root `.gitignore`; no scripts, dependencies, file deletion, untracking, or history rewriting. Root README/license/config files and application source remain eligible for Git.

**Tech Stack:** Git ignore patterns and PowerShell verification.

## Global Constraints

- Modify only `.gitignore` during implementation.
- Ignore the complete `/tests/` and `/docs/` trees.
- Do not run `git rm --cached`, delete local files, or rewrite Git history.
- Preserve `.env.example`, application source, migrations, PHP client scripts, root README files, and `LICENSE` as unignored files.

---

### Task 1: Replace the root ignore policy

**Files:**

- Modify: `.gitignore`
- Test: Git's native `check-ignore` command

**Interfaces:**

- Consumes: repository-relative paths evaluated by Git.
- Produces: one root ignore policy for future untracked files.

- [ ] **Step 1: Verify representative missing rules**

Run:

```powershell
git check-ignore --no-index --quiet tests/example.test.ts
git check-ignore --no-index --quiet docs/internal.md
git check-ignore --no-index --quiet .codegraph/codegraph.db
```

Expected before implementation: at least one command exits with code `1` because the current policy does not cover these paths.

- [ ] **Step 2: Replace `.gitignore` with the approved minimal policy**

```gitignore
# Dependencies and generated output
/node_modules/
/.next/
/.svelte-kit/
/build/
/.vercel/
/.vite/
*.tsbuildinfo

# Environment and secrets
.env
.env.*
!.env.example

# Private tests, documentation, and reports
/tests/
/docs/
/coverage/
/test-results/
/playwright-report/
/blob-report/

# Local tools and editors
/.codegraph/
/.superpowers/
/.codex/
/.agents/
/.idea/
/.vscode/

# Logs and temporary files
*.log
*.pid
*.tmp
*.temp
*.bak
*.swp
*~

# Local databases
/prisma/*.db
/prisma/*.db-journal
/prisma/*.sqlite
/prisma/*.sqlite3

# Operating-system metadata
.DS_Store
Thumbs.db
Desktop.ini
```

- [ ] **Step 3: Verify ignored and retained paths**

Run:

```powershell
$ignored = @(
  'tests/example.test.ts',
  'docs/internal.md',
  '.codegraph/codegraph.db',
  'coverage/lcov.info',
  'test-results/result.json',
  'playwright-report/index.html'
)
$retained = @(
  'README.md',
  'README.id.md',
  'LICENSE',
  '.env.example',
  'src/app.d.ts',
  'prisma/migrations/example/migration.sql',
  'scripts/php-client/LepsClient.php'
)
foreach ($path in $ignored) {
  git check-ignore --no-index --quiet $path
  if ($LASTEXITCODE -ne 0) { throw "Expected ignored: $path" }
}
foreach ($path in $retained) {
  git check-ignore --no-index --quiet $path
  if ($LASTEXITCODE -eq 0) { throw "Expected retained: $path" }
}
git diff --check -- .gitignore
```

Expected: no exception and `git diff --check` exits `0`.

- [ ] **Step 4: Commit only `.gitignore`**

```powershell
git add -- .gitignore
git diff --cached --check
git diff --cached --name-only
git commit -m "chore: ignore private repository artifacts"
```

Expected: the staged file list contains only `.gitignore`, and the commit succeeds.
