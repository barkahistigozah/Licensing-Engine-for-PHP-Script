<?php

declare(strict_types=1);

require __DIR__ . '/LepsClient.php';

function requiredEnvironment(string $key): string
{
    $value = getenv($key);
    if ($value === false || trim($value) === '') {
        throw new RuntimeException("Missing environment variable: {$key}.");
    }
    return $value;
}

try {
    $config = [
        'api_url' => requiredEnvironment('LEPS_API_URL'),
        'license_key' => requiredEnvironment('LEPS_LICENSE_KEY'),
        'domain' => requiredEnvironment('LEPS_INSTALL_DOMAIN'),
        'request_path' => requiredEnvironment('LEPS_INSTALL_PATH'),
        'public_key' => requiredEnvironment('LEPS_PUBLIC_KEY'),
        'telegram_bot_token' => requiredEnvironment('TELEGRAM_BOT_TOKEN'),
        'telegram_chat_id' => requiredEnvironment('TELEGRAM_CHAT_ID'),
    ];
    $cacheFile = getenv('LEPS_CACHE_FILE');
    if ($cacheFile !== false && trim($cacheFile) !== '') {
        $config['cache_file'] = $cacheFile;
    }

    $client = new LepsClient($config);
    $client->sendTelegramMessage('LEPS local smoke test ' . gmdate('c'));
    $second = $client->authorize();
    if ($second['source'] !== 'cache') {
        throw new RuntimeException('Second authorization did not use cache.');
    }

    echo "TELEGRAM_SENT=1\nSECOND_AUTH_SOURCE=cache\n";
} catch (Throwable $error) {
    fwrite(STDERR, "SMOKE_FAILED={$error->getMessage()}\n");
    exit(1);
}
