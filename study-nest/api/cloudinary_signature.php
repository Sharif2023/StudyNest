<?php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/cloudinary_helper.php';

requireAuth();

function cloudinary_signature_json(array $data, int $code = 200): void {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_SLASHES);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    cloudinary_signature_json(['ok' => false, 'error' => 'Invalid request method'], 405);
}

$config = get_cloudinary_config();
$cloudName = $config['cloud_name'] ?? '';
$apiKey = $config['api_key'] ?? '';
$apiSecret = $config['api_secret'] ?? '';

if (!$cloudName || !$apiKey || !$apiSecret) {
    cloudinary_signature_json(['ok' => false, 'error' => 'Cloudinary signed uploads are not configured'], 500);
}

$payload = json_decode(file_get_contents('php://input'), true) ?: [];
$resourceType = strtolower((string)($payload['resource_type'] ?? 'video'));
if (!in_array($resourceType, ['image', 'video', 'raw', 'auto'], true)) {
    cloudinary_signature_json(['ok' => false, 'error' => 'Unsupported resource type'], 422);
}

$folder = preg_replace('/[^a-zA-Z0-9/_-]/', '', (string)($payload['folder'] ?? 'studynest-recordings'));
$folder = trim($folder, '/') ?: 'studynest-recordings';

$params = [
    'timestamp' => time(),
    'folder' => $folder,
];

if (!empty($payload['context']) && is_string($payload['context'])) {
    $context = substr($payload['context'], 0, 1000);
    if (preg_match('/^[a-zA-Z0-9_.|=:@\- ]+$/', $context)) {
        $params['context'] = $context;
    }
}

cloudinary_signature_json([
    'ok' => true,
    'cloud_name' => $cloudName,
    'api_key' => $apiKey,
    'resource_type' => $resourceType,
    'upload_url' => "https://api.cloudinary.com/v1_1/{$cloudName}/{$resourceType}/upload",
    'params' => $params,
    'signature' => cloudinary_sign_params($params, $apiSecret),
]);
