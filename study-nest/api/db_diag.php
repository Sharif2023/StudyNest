<?php
require_once __DIR__ . '/db.php';

header('Content-Type: application/json');

$response = [
    'status' => 'unknown',
    'env_checks' => [
        'DB_HOST' => getenv('DB_HOST') ? 'SET' : 'MISSING',
        'DB_NAME' => getenv('DB_NAME') ? 'SET' : 'MISSING',
        'DB_USER' => getenv('DB_USER') ? 'SET' : 'MISSING',
        'DB_PASS' => getenv('DB_PASS') ? 'SET' : 'MISSING',
        'DB_PORT' => getenv('DB_PORT') ? 'SET' : 'MISSING',
    ],
    'pdo_initialized' => isset($pdo) ? 'YES' : 'NO',
];

try {
    if (isset($pdo)) {
        $stmt = $pdo->query("SELECT 1");
        if ($stmt) {
            $response['status'] = 'SUCCESS';
            $response['message'] = 'Database connection verified.';
        }
    }
} catch (Exception $e) {
    $response['status'] = 'FAILED';
    $response['error'] = $e->getMessage();
}

echo json_encode($response);
