<?php
// cloudinary_helper.php
// Centralized Cloudinary helper for StudyNest

/**
 * Load Cloudinary configuration
 */
function parse_cloudinary_url(?string $url): array {
    if (!$url) return [];
    $parts = parse_url($url);
    if (!$parts || ($parts['scheme'] ?? '') !== 'cloudinary') return [];

    return [
        'cloud_name' => $parts['host'] ?? '',
        'api_key' => isset($parts['user']) ? rawurldecode($parts['user']) : '',
        'api_secret' => isset($parts['pass']) ? rawurldecode($parts['pass']) : '',
    ];
}

function cloudinary_env(string $key): string {
    return $_ENV[$key] ?? $_SERVER[$key] ?? getenv($key) ?: '';
}

function cloudinary_sign_params(array $params, string $api_secret): string {
    unset($params['file'], $params['cloud_name'], $params['resource_type'], $params['api_key'], $params['signature']);
    $params = array_filter($params, static fn($value) => $value !== null && $value !== '');
    ksort($params);
    $serialized = [];
    foreach ($params as $key => $value) {
        if (is_bool($value)) {
            $value = $value ? 'true' : 'false';
        }
        $serialized[] = $key . '=' . $value;
    }
    return sha1(implode('&', $serialized) . $api_secret);
}

function get_cloudinary_config() {
    $fromUrl = parse_cloudinary_url(cloudinary_env('CLOUDINARY_URL'));
    $config_path = __DIR__ . '/cloudinary_config.php';
    if (file_exists($config_path)) {
        $fileConfig = require $config_path;
        foreach ($fromUrl as $key => $value) {
            if (empty($fileConfig[$key])) {
                $fileConfig[$key] = $value;
            }
        }
        return $fileConfig;
    }
    
    return [
        'cloud_name' => cloudinary_env('CLOUDINARY_CLOUD_NAME') ?: ($fromUrl['cloud_name'] ?? ''),
        'api_key' => cloudinary_env('CLOUDINARY_API_KEY') ?: ($fromUrl['api_key'] ?? ''),
        'api_secret' => cloudinary_env('CLOUDINARY_API_SECRET') ?: ($fromUrl['api_secret'] ?? ''),
        'upload_preset' => cloudinary_env('CLOUDINARY_UPLOAD_PRESET')
    ];
}

/**
 * Upload a local file to Cloudinary via UNSIGNED preset
 */
function cloudinary_upload_file($tmpPath, $filename = null, $custom_preset = null) {
    $config = get_cloudinary_config();
    $cloud_name = $config['cloud_name'];
    $api_key = $config['api_key'];
    $api_secret = $config['api_secret'];
    $unsigned_preset = $custom_preset ?: $config['upload_preset'];

    if (!$cloud_name) {
        throw new RuntimeException("Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME or CLOUDINARY_URL.");
    }
    if ((!$api_key || !$api_secret) && !$unsigned_preset) {
        throw new RuntimeException("Cloudinary is not configured. Set signed credentials or CLOUDINARY_UPLOAD_PRESET.");
    }
    $endpoint = "https://api.cloudinary.com/v1_1/{$cloud_name}/auto/upload";

    $ch = curl_init();
    $cfile = new CURLFile($tmpPath, mime_content_type($tmpPath), $filename ?: basename($tmpPath));
    $folder = $api_key && $api_secret ? ($custom_preset ?: 'resources') : 'resources';
    $payload = [
        'file'          => $cfile,
        'folder'        => $folder,
    ];
    if ($api_key && $api_secret) {
        $payload['timestamp'] = time();
        $payload['api_key'] = $api_key;
        $payload['signature'] = cloudinary_sign_params($payload, $api_secret);
    } else {
        $payload['upload_preset'] = $unsigned_preset;
    }
    
    curl_setopt_array($ch, [
        CURLOPT_URL            => $endpoint,
        CURLOPT_POST           => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POSTFIELDS     => $payload,
        CURLOPT_TIMEOUT        => 60,
        CURLOPT_SSL_VERIFYPEER => (getenv('CLOUDINARY_DISABLE_SSL_VERIFY') === 'true') ? false : true,
    ]);
    
    $resp = curl_exec($ch);
    if ($resp === false) {
        $err = curl_error($ch);
        curl_close($ch);
        throw new RuntimeException("Cloudinary connection failed: $err");
    }
    
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $json = json_decode($resp, true);
    if ($status >= 400 || !is_array($json) || empty($json['secure_url'])) {
        $msg = is_array($json) && !empty($json['error']['message']) ? $json['error']['message'] : 'Unknown Cloudinary error';
        throw new RuntimeException("Cloudinary Error ($status): " . $msg);
    }
    
    return [
        'secure_url'    => $json['secure_url'],
        'public_id'     => $json['public_id'] ?? null,
        'resource_type' => $json['resource_type'] ?? null,
        'bytes'         => $json['bytes'] ?? null,
        'version'       => $json['version'] ?? null,
    ];
}
?>
