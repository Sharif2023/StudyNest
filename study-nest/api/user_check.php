<?php
require_once __DIR__ . '/db.php';

header('Content-Type: application/json');

try {
    $stmt = $pdo->query("SELECT count(*) FROM users");
    $count = $stmt->fetchColumn();
    
    // Get column names specifically from public schema
    $stmt3 = $pdo->prepare("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' AND table_schema = 'public' ORDER BY ordinal_position");
    $stmt3->execute();
    $columns = $stmt3->fetchAll();

    $stmt2 = $pdo->query("SELECT * FROM users LIMIT 1");
    $user = $stmt2->fetch();

    // Check sessions table
    $sessCheck = $pdo->query("SELECT count(*) FROM sessions");
    $sessCount = $sessCheck->fetchColumn();

    echo json_encode([
        'ok' => true,
        'user_count' => $count,
        'session_count' => $sessCount,
        'public_columns' => $columns,
        'sample_user' => $user,
        'session_id' => session_id(),
        'session_data' => $_SESSION
    ]);
} catch (Exception $e) {
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
}
