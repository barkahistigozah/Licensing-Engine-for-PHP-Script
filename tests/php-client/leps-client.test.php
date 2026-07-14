<?php

declare(strict_types=1);

require __DIR__ . '/../../scripts/php-client/LepsClient.php';

function assertSameValue(mixed $expected, mixed $actual): void
{
    if ($expected !== $actual) {
        throw new RuntimeException('Expected ' . var_export($expected, true) . ', got ' . var_export($actual, true));
    }
}

function assertThrowsMessage(callable $callback, string $message): void
{
    try {
        $callback();
    } catch (RuntimeException $error) {
        assertSameValue($message, $error->getMessage());
        return;
    }

    throw new RuntimeException("Expected RuntimeException: {$message}");
}

function base64UrlEncode(string $value): string
{
    return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
}

function signedAuthorization(
    string $secretKey,
    array $config,
    int $issuedAt,
    int $expiresAt,
): array {
    $payload = [
        'version' => 1,
        'status' => 'VALID',
        'license_key' => $config['license_key'],
        'domain' => $config['domain'],
        'request_path' => $config['request_path'],
        'expires_at' => gmdate('Y-m-d\TH:i:s.000\Z', $expiresAt),
        'issued_at' => gmdate('Y-m-d\TH:i:s.000\Z', $issuedAt),
    ];
    $bytes = json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);

    return [
        ...$payload,
        'message' => 'Authorization granted.',
        'signature_algorithm' => 'Ed25519',
        'signed_payload' => base64UrlEncode($bytes),
        'signature' => base64UrlEncode(sodium_crypto_sign_detached($bytes, $secretKey)),
        'cache' => 'BYPASS',
    ];
}

function fixture(): array
{
    $keypair = sodium_crypto_sign_keypair();
    $publicKey = sodium_crypto_sign_publickey($keypair);
    $cacheFile = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'leps-php-test-' . bin2hex(random_bytes(8)) . '.json';
    $config = [
        'api_url' => 'http://localhost:5173',
        'license_key' => 'lic_1234567890abcdef12345678',
        'domain' => 'example.test',
        'request_path' => '/bot',
        'telegram_bot_token' => 'test-token',
        'telegram_chat_id' => '12345',
        'public_key' => base64_encode(hex2bin('302a300506032b6570032100') . $publicKey),
        'cache_file' => $cacheFile,
    ];

    return [
        $config,
        sodium_crypto_sign_secretkey($keypair),
        $cacheFile,
    ];
}

function runTest(string $name, callable $test): void
{
    try {
        $test();
        echo "PASS {$name}\n";
    } catch (Throwable $error) {
        fwrite(STDERR, "FAIL {$name}: {$error->getMessage()}\n");
        exit(1);
    }
}

runTest('valid authorization is cached', function (): void {
    [$config, $secretKey, $cacheFile] = fixture();
    $now = 1_783_987_200;
    $apiCalls = 0;
    $http = function (string $url, array $payload) use (&$apiCalls, &$now, $config, $secretKey): array {
        $apiCalls++;
        assertSameValue('http://localhost:5173/api/v1/license/verify', $url);
        assertSameValue($config['license_key'], $payload['license_key']);

        return [
            'status' => 200,
            'body' => json_encode(signedAuthorization($secretKey, $config, $now, $now + 86_400), JSON_THROW_ON_ERROR),
        ];
    };

    try {
        $client = new LepsClient($config, $http, function () use (&$now): int { return $now; });
        $first = $client->authorize();
        $second = $client->authorize();
        assertSameValue('api', $first['source']);
        assertSameValue('cache', $second['source']);
        assertSameValue(1, $apiCalls);
    } finally {
        @unlink($cacheFile);
    }
});

runTest('due cache revalidates once', function (): void {
    [$config, $secretKey, $cacheFile] = fixture();
    $now = 1_783_987_200;
    $apiCalls = 0;
    $http = function () use (&$apiCalls, &$now, $config, $secretKey): array {
        $apiCalls++;
        return [
            'status' => 200,
            'body' => json_encode(signedAuthorization($secretKey, $config, $now, $now + 86_400), JSON_THROW_ON_ERROR),
        ];
    };

    try {
        $client = new LepsClient($config, $http, function () use (&$now): int { return $now; });
        $client->authorize();
        $now += 17_280;
        assertSameValue('api', $client->authorize()['source']);
        assertSameValue('cache', $client->authorize()['source']);
        assertSameValue(2, $apiCalls);
    } finally {
        @unlink($cacheFile);
    }
});

runTest('expiry blocks locally before revalidation', function (): void {
    [$config, $secretKey, $cacheFile] = fixture();
    $now = 1_783_987_200;
    $apiCalls = 0;
    $http = function () use (&$apiCalls, &$now, $config, $secretKey): array {
        $apiCalls++;
        return [
            'status' => 200,
            'body' => json_encode(signedAuthorization($secretKey, $config, $now, $now + 60), JSON_THROW_ON_ERROR),
        ];
    };

    try {
        $client = new LepsClient($config, $http, function () use (&$now): int { return $now; });
        $client->authorize();
        $now += 61;
        assertThrowsMessage(fn () => $client->authorize(), 'License has expired.');
        assertSameValue(1, $apiCalls);
    } finally {
        @unlink($cacheFile);
    }
});

runTest('invalid signature is rejected', function (): void {
    [$config, $secretKey, $cacheFile] = fixture();
    $now = 1_783_987_200;
    $http = function () use (&$now, $config, $secretKey): array {
        $response = signedAuthorization($secretKey, $config, $now, $now + 86_400);
        $response['signature'] = base64UrlEncode(str_repeat('x', SODIUM_CRYPTO_SIGN_BYTES));
        return ['status' => 200, 'body' => json_encode($response, JSON_THROW_ON_ERROR)];
    };

    try {
        $client = new LepsClient($config, $http, function () use (&$now): int { return $now; });
        assertThrowsMessage(fn () => $client->authorize(), 'License authorization is invalid.');
    } finally {
        @unlink($cacheFile);
    }
});

runTest('failed revalidation cannot retry before next interval', function (): void {
    [$config, $secretKey, $cacheFile] = fixture();
    $now = 1_783_987_200;
    $apiCalls = 0;
    $http = function () use (&$apiCalls, &$now, $config, $secretKey): array {
        $apiCalls++;
        if ($apiCalls === 2) {
            throw new RuntimeException('network details must stay hidden');
        }
        return [
            'status' => 200,
            'body' => json_encode(signedAuthorization($secretKey, $config, $now, $now + 86_400), JSON_THROW_ON_ERROR),
        ];
    };

    try {
        $client = new LepsClient($config, $http, function () use (&$now): int { return $now; });
        $client->authorize();
        $now += 17_280;
        assertThrowsMessage(fn () => $client->authorize(), 'License verification failed.');
        assertThrowsMessage(fn () => $client->authorize(), 'License verification is temporarily unavailable.');
        assertSameValue(2, $apiCalls);
    } finally {
        @unlink($cacheFile);
    }
});

runTest('Telegram delivery authorizes once and sends once', function (): void {
    [$config, $secretKey, $cacheFile] = fixture();
    $now = 1_783_987_200;
    $apiCalls = 0;
    $telegramCalls = 0;
    $http = function (string $url, array $payload) use (&$apiCalls, &$telegramCalls, &$now, $config, $secretKey): array {
        if (str_starts_with($url, 'https://api.telegram.org/bot')) {
            $telegramCalls++;
            assertSameValue($config['telegram_chat_id'], $payload['chat_id']);
            assertSameValue('LEPS local smoke test', $payload['text']);
            return ['status' => 200, 'body' => '{"ok":true,"result":{"message_id":1}}'];
        }

        $apiCalls++;
        return [
            'status' => 200,
            'body' => json_encode(signedAuthorization($secretKey, $config, $now, $now + 86_400), JSON_THROW_ON_ERROR),
        ];
    };

    try {
        $client = new LepsClient($config, $http, function () use (&$now): int { return $now; });
        $result = $client->sendTelegramMessage('LEPS local smoke test');
        assertSameValue(true, $result['ok']);
        assertSameValue(1, $apiCalls);
        assertSameValue(1, $telegramCalls);
    } finally {
        @unlink($cacheFile);
    }
});

runTest('Telegram failure hides secret values', function (): void {
    [$config, $secretKey, $cacheFile] = fixture();
    $config['telegram_bot_token'] = 'secret-bot-token';
    $config['telegram_chat_id'] = 'private-chat-id';
    $now = 1_783_987_200;
    $http = function (string $url) use (&$now, $config, $secretKey): array {
        if (str_starts_with($url, 'https://api.telegram.org/bot')) {
            return ['status' => 500, 'body' => '{"ok":false}'];
        }
        return [
            'status' => 200,
            'body' => json_encode(signedAuthorization($secretKey, $config, $now, $now + 86_400), JSON_THROW_ON_ERROR),
        ];
    };

    try {
        $client = new LepsClient($config, $http, function () use (&$now): int { return $now; });
        assertThrowsMessage(fn () => $client->sendTelegramMessage('test'), 'Telegram delivery failed.');
    } finally {
        @unlink($cacheFile);
    }
});

runTest('default HTTP transport emits no PHP deprecations', function (): void {
    [$config, , $cacheFile] = fixture();
    $client = new LepsClient($config);
    $method = new ReflectionMethod($client, 'postJson');
    set_error_handler(static function (int $severity, string $message): never {
        throw new ErrorException($message, 0, $severity);
    });

    try {
        assertThrowsMessage(
            fn () => $method->invoke($client, 'http://127.0.0.1:1', []),
            'HTTP request failed.',
        );
    } finally {
        restore_error_handler();
        @unlink($cacheFile);
    }
});
