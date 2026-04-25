<?php
// cloudinary_helper.php
// Centralized Cloudinary helper for StudyNest

/**
 * Load Cloudinary configuration
 */
function get_cloudinary_config() {
    $config_path = __DIR__ . '/cloudinary_config.php';
    if (file_exists($config_path)) {
        return require $config_path;
    }
    
    // Fallback to environment variables or hardcoded values
    return [
        'cloud_name' => $_ENV['CLOUDINARY_CLOUD_NAME'] ?? $_SERVER['CLOUDINARY_CLOUD_NAME'] ?? getenv('CLOUDINARY_CLOUD_NAME') ?: '',
        'api_key' => $_ENV['CLOUDINARY_API_KEY'] ?? $_SERVER['CLOUDINARY_API_KEY'] ?? getenv('CLOUDINARY_API_KEY') ?: '',
        'api_secret' => $_ENV['CLOUDINARY_API_SECRET'] ?? $_SERVER['CLOUDINARY_API_SECRET'] ?? getenv('CLOUDINARY_API_SECRET') ?: '',
        'upload_preset' => $_ENV['CLOUDINARY_UPLOAD_PRESET'] ?? $_SERVER['CLOUDINARY_UPLOAD_PRESET'] ?? getenv('CLOUDINARY_UPLOAD_PRESET') ?: ''
    ];
}

/**
 * Upload a local file to Cloudinary via UNSIGNED preset
 */
function cloudinary_upload_file($tmpPath, $filename = null, $custom_preset = null) {
    $config = get_cloudinary_config();
    $cloud_name = $config['cloud_name'];
    $unsigned_preset = $custom_preset ?: $config['upload_preset'];
    if (!$cloud_name || !$unsigned_preset) {
        throw new RuntimeException("Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME and CLOUDINARY_UPLOAD_PRESET.");
    }
    $endpoint = "https://api.cloudinary.com/v1_1/{$cloud_name}/auto/upload";

    $ch = curl_init();
    $cfile = new CURLFile($tmpPath, mime_content_type($tmpPath), $filename ?: basename($tmpPath));
    $payload = [
        'upload_preset' => $unsigned_preset,
        'file'          => $cfile,
        'folder'        => 'resources',
    ];
    
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
