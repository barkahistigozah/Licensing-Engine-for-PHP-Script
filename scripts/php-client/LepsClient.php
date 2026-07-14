<?php

declare(strict_types=1);

final class LepsClient
{
    private const REVALIDATE_SECONDS = 17_280;
    private const ED25519_SPKI_PREFIX = '302a300506032b6570032100';

    private array $config;
    private Closure $httpPost;
    private Closure $clock;

    public function __construct(array $config, ?callable $httpPost = null, ?callable $clock = null)
    {
        foreach ([
            'api_url',
            'license_key',
            'domain',
            'request_path',
            'telegram_bot_token',
            'telegram_chat_id',
            'public_key',
        ] as $key) {
            if (!isset($config[$key]) || !is_string($config[$key]) || trim($config[$key]) === '') {
                throw new InvalidArgumentException("Missing client configuration: {$key}.");
            }
        }

        $config['cache_file'] ??= sys_get_temp_dir()
            . DIRECTORY_SEPARATOR
            . 'leps-client-'
            . hash('sha256', $config['license_key'])
            . '.json';

        $this->config = $config;
        $this->httpPost = Closure::fromCallable($httpPost ?? [$this, 'postJson']);
        $this->clock = Closure::fromCallable($clock ?? time(...));
    }

    public function authorize(): array
    {
        $handle = @fopen($this->config['cache_file'], 'c+b');
        if ($handle === false || !flock($handle, LOCK_EX)) {
            if (is_resource($handle)) {
                fclose($handle);
            }
            throw new RuntimeException('License cache is unavailable.');
        }

        @chmod($this->config['cache_file'], 0600);

        try {
            $state = $this->readState($handle);
            $now = (int) ($this->clock)();
            $nextAttempt = (int) ($state['next_attempt_at'] ?? 0);

            if ($now < $nextAttempt) {
                if (($state['revalidation_failed'] ?? false) === true) {
                    throw new RuntimeException('License verification is temporarily unavailable.');
                }
                if (!isset($state['authorization']) || !is_array($state['authorization'])) {
                    throw new RuntimeException('License authorization is invalid.');
                }

                $payload = $this->validateAuthorization($state['authorization'], $now, false);
                return ['source' => 'cache', 'expires_at' => $payload['expires_at']];
            }

            $state['next_attempt_at'] = $now + self::REVALIDATE_SECONDS;
            $state['revalidation_failed'] = true;
            $this->writeState($handle, $state);

            try {
                $response = ($this->httpPost)(
                    rtrim($this->config['api_url'], '/') . '/api/v1/license/verify',
                    [
                        'license_key' => $this->config['license_key'],
                        'domain' => $this->config['domain'],
                        'request_path' => $this->config['request_path'],
                        'telegram_bot_token' => $this->config['telegram_bot_token'],
                        'telegram_chat_id' => $this->config['telegram_chat_id'],
                    ],
                );
                if (($response['status'] ?? 0) !== 200 || !is_string($response['body'] ?? null)) {
                    throw new RuntimeException('request failed');
                }
                $authorization = json_decode($response['body'], true, flags: JSON_THROW_ON_ERROR);
                if (!is_array($authorization)) {
                    throw new RuntimeException('invalid response');
                }
                $payload = $this->validateAuthorization($authorization, $now, true);
                $state['authorization'] = $authorization;
                $state['revalidation_failed'] = false;
                $this->writeState($handle, $state);

                return ['source' => 'api', 'expires_at' => $payload['expires_at']];
            } catch (RuntimeException $error) {
                if (in_array($error->getMessage(), ['License authorization is invalid.', 'License has expired.'], true)) {
                    throw $error;
                }
                throw new RuntimeException('License verification failed.');
            } catch (Throwable) {
                throw new RuntimeException('License verification failed.');
            }
        } finally {
            flock($handle, LOCK_UN);
            fclose($handle);
        }
    }

    private function validateAuthorization(array $authorization, int $now, bool $fresh): array
    {
        if (
            ($authorization['version'] ?? null) !== 1
            || ($authorization['status'] ?? null) !== 'VALID'
            || ($authorization['signature_algorithm'] ?? null) !== 'Ed25519'
            || !is_string($authorization['signed_payload'] ?? null)
            || !is_string($authorization['signature'] ?? null)
        ) {
            throw new RuntimeException('License authorization is invalid.');
        }

        $prefix = hex2bin(self::ED25519_SPKI_PREFIX);
        $der = base64_decode($this->config['public_key'], true);
        $payloadBytes = $this->base64UrlDecode($authorization['signed_payload']);
        $signature = $this->base64UrlDecode($authorization['signature']);
        if (
            $der === false
            || $prefix === false
            || strlen($der) !== strlen($prefix) + SODIUM_CRYPTO_SIGN_PUBLICKEYBYTES
            || !str_starts_with($der, $prefix)
            || strlen($signature) !== SODIUM_CRYPTO_SIGN_BYTES
            || !sodium_crypto_sign_verify_detached($signature, $payloadBytes, substr($der, strlen($prefix)))
        ) {
            throw new RuntimeException('License authorization is invalid.');
        }

        try {
            $payload = json_decode($payloadBytes, true, flags: JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            throw new RuntimeException('License authorization is invalid.');
        }
        if (
            !is_array($payload)
            || ($payload['version'] ?? null) !== 1
            || ($payload['status'] ?? null) !== 'VALID'
            || ($payload['license_key'] ?? null) !== $this->config['license_key']
            || ($payload['domain'] ?? null) !== $this->config['domain']
            || ($payload['request_path'] ?? null) !== $this->config['request_path']
            || !is_string($payload['issued_at'] ?? null)
            || !is_string($payload['expires_at'] ?? null)
        ) {
            throw new RuntimeException('License authorization is invalid.');
        }

        try {
            $issuedAt = (new DateTimeImmutable($payload['issued_at']))->getTimestamp();
            $expiresAt = (new DateTimeImmutable($payload['expires_at']))->getTimestamp();
        } catch (Exception) {
            throw new RuntimeException('License authorization is invalid.');
        }
        if ($fresh && abs($now - $issuedAt) > 300) {
            throw new RuntimeException('License authorization is invalid.');
        }
        if ($now >= $expiresAt) {
            throw new RuntimeException('License has expired.');
        }

        return $payload;
    }

    private function base64UrlDecode(string $value): string
    {
        if ($value === '' || preg_match('/^[A-Za-z0-9_-]+$/', $value) !== 1) {
            throw new RuntimeException('License authorization is invalid.');
        }
        $padding = (4 - strlen($value) % 4) % 4;
        $decoded = base64_decode(strtr($value, '-_', '+/') . str_repeat('=', $padding), true);
        if ($decoded === false) {
            throw new RuntimeException('License authorization is invalid.');
        }
        return $decoded;
    }

    private function readState($handle): array
    {
        rewind($handle);
        $contents = stream_get_contents($handle);
        if ($contents === false || trim($contents) === '') {
            return [];
        }
        try {
            $state = json_decode($contents, true, flags: JSON_THROW_ON_ERROR);
            return is_array($state) ? $state : [];
        } catch (JsonException) {
            return [];
        }
    }

    private function writeState($handle, array $state): void
    {
        $json = json_encode($state, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
        rewind($handle);
        if (!ftruncate($handle, 0) || fwrite($handle, $json) !== strlen($json) || !fflush($handle)) {
            throw new RuntimeException('License cache is unavailable.');
        }
    }

    private function postJson(string $url, array $payload): array
    {
        $handle = curl_init($url);
        if ($handle === false) {
            throw new RuntimeException('HTTP client is unavailable.');
        }
        curl_setopt_array($handle, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 3,
            CURLOPT_TIMEOUT => 10,
            CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
            CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR),
        ]);
        $body = curl_exec($handle);
        $status = curl_getinfo($handle, CURLINFO_RESPONSE_CODE);
        $failed = $body === false;
        curl_close($handle);
        if ($failed) {
            throw new RuntimeException('HTTP request failed.');
        }
        return ['status' => $status, 'body' => $body];
    }
}
