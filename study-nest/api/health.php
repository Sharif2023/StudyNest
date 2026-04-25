<?php
require_once __DIR__ . '/db.php';

echo json_encode([
    'ok' => true,
    'service' => 'studynest-api',
    'db' => isset($pdo) && $pdo instanceof PDO,
], JSON_UNESCAPED_SLASHES);
