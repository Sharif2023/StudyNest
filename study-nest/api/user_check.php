<?php
require_once __DIR__ . '/db.php';

header('Content-Type: application/json');

try {
    $stmt = $pdo->query("SELECT count(*) FROM users");
    $count = $stmt->fetchColumn();
    
    $stmt2 = $pdo->query("SELECT id, username, email, role FROM users LIMIT 5");
    $users = $stmt2->fetchAll();

    echo json_encode([
        'ok' => true,
        'user_count' => $count,
        'sample_users' => $users
    ]);
} catch (Exception $e) {
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
}
