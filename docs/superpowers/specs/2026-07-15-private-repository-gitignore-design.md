# Private Repository `.gitignore` Design

## Goal

Keep local-only tests, internal documentation, generated output, caches, and machine-specific files out of future Git commits for this personal LEPS repository.

## Scope

- Ignore the complete `/tests/` and `/docs/` trees.
- Keep root project files such as `README.md`, `README.id.md`, `LICENSE`, `.env.example`, source code, migrations, and runtime scripts eligible for Git.
- Ignore dependency, build, coverage, Playwright, local database, log, temporary, editor, operating-system, and local AI/tool cache files.
- Change only `.gitignore` during implementation.

## Tracking behavior

`.gitignore` applies only to untracked files. Files already committed under `tests/` or `docs/` remain tracked and remain in Git history. This change will not run `git rm --cached`, delete local files, or rewrite history.

## Verification

- `git check-ignore -v` must match representative files under `tests/`, `docs/`, `.codegraph`, coverage, and Playwright output.
- Source files, root README files, `LICENSE`, `.env.example`, Prisma migrations, and PHP client scripts must remain unignored.
- `git diff --check -- .gitignore` must pass.
