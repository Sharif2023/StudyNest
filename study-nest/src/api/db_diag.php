<?php
// db_diag.php
require_once __DIR__ . '/db.php';

try {
    $stmt = $pdo->prepare("SELECT id, username, email, role, status FROM users WHERE email = 'admin@studynest.com'");
    $stmt->execute();
    $user = $stmt->fetch();

    echo json_encode([
        "ok" => true,
        "admin_user" => $user,
        "server_info" => [
            "php_version" => PHP_VERSION,
            "server_software" => $_SERVER['SERVER_SOFTWARE'],
            "session_status" => session_status() === PHP_SESSION_ACTIVE ? "Active" : "None"
        ]
    ], JSON_PRETTY_PRINT);
} catch (Throwable $e) {
    echo json_encode(["ok" => false, "error" => $e->getMessage()]);
}
