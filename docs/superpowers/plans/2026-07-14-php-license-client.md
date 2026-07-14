# PHP License Client Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and locally verify a framework-free PHP client that authorizes through LEPS at most about five times per active day, checks expiry locally, and sends one real Telegram smoke message.

**Architecture:** `LepsClient` owns signed authorization, persistent locked cache, lazy revalidation, and Telegram delivery. A tiny CLI reads secrets from process environment and exercises the real local LEPS and Telegram endpoints; a framework-free PHP test runner injects an HTTP callable and clock so cache and crypto behavior are deterministic.

**Tech Stack:** PHP 8.5 CLI, cURL, Sodium Ed25519, JSON/file APIs, existing LEPS Elysia endpoint.

## Global Constraints

- Stay Windows-native in the current `dev` checkout; do not create a branch or worktree.
- Add no Composer package, cron, queue, webhook, or service.
- Revalidation interval is exactly `17_280` seconds.
- Every API attempt advances the next-attempt timestamp, including failed attempts.
- Expiry, signature, license key, domain, and request path are checked locally before Telegram delivery.
- Do not log bot tokens, full license keys, chat IDs, or signing key material.
- Keep the existing IP rate limiter; do not add a five-per-day server limiter keyed only by license key.

---

### Task 1: Signed Authorization and Lazy Cache

**Files:**
- Create: `scripts/php-client/LepsClient.php`
- Create: `tests/php-client/leps-client.test.php`

**Interfaces:**
- Consumes: LEPS `POST /api/v1/license/verify` response from `docs/SPEC.md`.
- Produces: `LepsClient::__construct(array $config, ?callable $httpPost = null, ?callable $clock = null)` and `LepsClient::authorize(): array{source:string,expires_at:string}`.

- [ ] **Step 1: Write the failing authorization test**

Create a PHP test runner with small `assertSameValue()` and `assertThrows()` helpers. Generate a Sodium keypair, encode the raw public key as Ed25519 SPKI DER using `hex2bin('302a300506032b6570032100') . $rawPublicKey`, and build a signed response whose payload contains `version`, `status`, `license_key`, `domain`, `request_path`, `expires_at`, and `issued_at`.

The first test must instantiate the wished-for client with an injected HTTP closure, call `authorize()` twice, and assert:

```php
assertSameValue('api', $first['source']);
assertSameValue('cache', $second['source']);
assertSameValue(1, $apiCalls);
```

Add tests that mutate the signature, advance the injected clock by `17_280`, expire the signed payload before revalidation, and make the due API call fail. Assert invalid signatures and local expiry throw, a due cache performs exactly one new API call, and a failed due attempt cannot retry before the next interval.

- [ ] **Step 2: Run the test and verify RED**

Run: `php tests/php-client/leps-client.test.php`

Expected: FAIL because `scripts/php-client/LepsClient.php` does not exist.

- [ ] **Step 3: Implement the minimal client**

Create `final class LepsClient` with:

```php
private const REVALIDATE_SECONDS = 17_280;

public function authorize(): array;
```

Constructor configuration keys are exactly:

```php
[
    'api_url' => string, // base URL, for example http://localhost:5173
    'license_key' => string,
    'domain' => string,
    'request_path' => string,
    'telegram_bot_token' => string,
    'telegram_chat_id' => string,
    'public_key' => string,
    'cache_file' => string, // optional; defaults to a per-license system temp file
]
```

`authorize()` must open the cache with `fopen($path, 'c+')`, acquire `LOCK_EX`, decode state, and keep the lock through a due API request. State keys are `authorization`, `next_attempt_at`, and `revalidation_failed`.

When a network attempt is due, write `next_attempt_at = now + 17_280` and `revalidation_failed = true` before calling the endpoint. On a valid response, replace `authorization` and set `revalidation_failed = false`. When `revalidation_failed` remains true and the next attempt is not due, fail closed without another HTTP request.

Validate the response by strict base64 decoding the SPKI public key, requiring the exact Ed25519 prefix and 32-byte raw key, decoding `signed_payload` and `signature` as base64url, and calling `sodium_crypto_sign_verify_detached()`. Check local binding and `expires_at`; enforce the five-minute `issued_at` skew only on a fresh API response, not on a previously accepted cache entry.

Default HTTP transport posts to `rtrim($config['api_url'], '/') . '/api/v1/license/verify'` using cURL with JSON, a 3-second connect timeout, a 10-second total timeout, and returns `['status' => int, 'body' => string]`. Errors must not include request URLs or secret values.

- [ ] **Step 4: Run the PHP test and verify GREEN**

Run: `php tests/php-client/leps-client.test.php`

Expected: all named PHP client tests print `PASS` and the process exits `0`.

- [ ] **Step 5: Run syntax checks**

Run:

```powershell
php -l scripts/php-client/LepsClient.php
php -l tests/php-client/leps-client.test.php
```

Expected: both report `No syntax errors detected`.

- [ ] **Step 6: Commit Task 1**

```powershell
git add scripts/php-client/LepsClient.php tests/php-client/leps-client.test.php
git commit -m "feat: add cached PHP license client"
```

### Task 2: Telegram Smoke CLI and Operational Documentation

**Files:**
- Create: `scripts/php-client/smoke.php`
- Modify: `tests/php-client/leps-client.test.php`
- Modify: `README.md`

**Interfaces:**
- Consumes: `LepsClient::authorize()` from Task 1.
- Produces: `LepsClient::sendTelegramMessage(string $message): array` and CLI command `php scripts/php-client/smoke.php` configured only through environment variables.

- [ ] **Step 1: Write the failing Telegram delivery test**

Extend the injected HTTP closure to return a Telegram response for URLs beginning with `https://api.telegram.org/bot`. Call `sendTelegramMessage('LEPS local smoke test')` once and assert one LEPS call, one Telegram call, and `ok === true`. Add a Telegram failure response and assert the thrown message contains neither bot token nor chat ID.

- [ ] **Step 2: Run the test and verify RED**

Run: `php tests/php-client/leps-client.test.php`

Expected: FAIL because Telegram delivery is not yet implemented or does not meet the safe-error contract.

- [ ] **Step 3: Implement Telegram delivery and smoke CLI**

`sendTelegramMessage()` must call `authorize()` first, then POST exactly this payload to `https://api.telegram.org/bot<TOKEN>/sendMessage`:

```php
[
    'chat_id' => $this->config['telegram_chat_id'],
    'text' => $message,
]
```

Require HTTP `200`, valid JSON, and `ok === true`; otherwise throw `RuntimeException('Telegram delivery failed.')`.

`smoke.php` must require these environment variables:

```text
LEPS_API_URL
LEPS_LICENSE_KEY
LEPS_INSTALL_DOMAIN
LEPS_INSTALL_PATH
LEPS_PUBLIC_KEY
TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID
```

It creates the client, calls `sendTelegramMessage('LEPS local smoke test ' . gmdate('c'))` exactly once, then calls `authorize()` again and requires `source === 'cache'`. Output contains only `TELEGRAM_SENT=1` and `SECOND_AUTH_SOURCE=cache`.

- [ ] **Step 4: Document exact local usage**

Add a short `PHP client smoke` section to `README.md` showing PowerShell environment assignments with example replacement values and the command `php scripts/php-client/smoke.php`. Document that no Telegram secret is committed, expiry is checked on every send, and revalidation is limited to once per 17,280 seconds while active.

- [ ] **Step 5: Run PHP tests and syntax checks**

Run:

```powershell
php tests/php-client/leps-client.test.php
php -l scripts/php-client/LepsClient.php
php -l scripts/php-client/smoke.php
```

Expected: tests pass and both scripts have no syntax errors.

- [ ] **Step 6: Commit Task 2**

```powershell
git add scripts/php-client/LepsClient.php scripts/php-client/smoke.php tests/php-client/leps-client.test.php README.md
git commit -m "test: add PHP Telegram smoke flow"
```

### Task 3: Real Local LEPS and Telegram Smoke

**Files:**
- Modify locally only: `.env` for missing LEPS signing/binding values if absent.
- Runtime artifact only: PHP cache file under the system temporary directory.

**Interfaces:**
- Consumes: local LEPS at `http://localhost:5173`, a matching local license record, and user-provided Telegram bot token/chat ID.
- Produces: one Telegram message and evidence that the second authorization uses cache.

- [ ] **Step 1: Complete local server crypto configuration safely**

Generate `LICENSE_BINDING_SECRET` with 32 random bytes encoded as base64 and an Ed25519 keypair with Node `crypto.generateKeyPairSync('ed25519')`. Write only missing values to ignored `.env`; do not print their contents.

- [ ] **Step 2: Create or update one local test license**

Use the existing local admin/database path to bind the test license to `LEPS_INSTALL_DOMAIN`, `LEPS_INSTALL_PATH`, and the supplied Telegram bot token/chat ID. Do not print the token or full license key.

- [ ] **Step 3: Run the real smoke CLI**

Export the required process environment values from the local configuration and run:

```powershell
php scripts/php-client/smoke.php
```

Expected:

```text
TELEGRAM_SENT=1
SECOND_AUTH_SOURCE=cache
```

- [ ] **Step 4: Prove the second authorization did not hit LEPS**

Compare verification-log count before and after the smoke. Exactly one new verification record must exist even though authorization ran twice.

- [ ] **Step 5: Run repository regression verification**

Run:

```powershell
bun test
bun run check
bun run format:check
git diff --check
```

Expected: `0 fail`, `0 errors`, `0 warnings`, formatting clean, and no whitespace errors.

- [ ] **Step 6: Commit any tracked operational documentation adjustment**

If Task 3 required a tracked documentation correction, stage only that file and commit it. Never stage `.env`, cache files, or unrelated existing worktree changes.
