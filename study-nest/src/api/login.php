<?php
require __DIR__ . '/db.php';

try {
    $data = json_decode(file_get_contents('php://input'), true);

    $email    = strtolower(trim($data['email'] ?? ''));
    $password = $data['password'] ?? '';

    if ($email === '' || $password === '') {
        http_response_code(422);
        echo json_encode(['ok' => false, 'error' => 'Email and password are required.']);
        exit;
    }

    $stmt = $pdo->prepare("SELECT id, student_id, email, password_hash, created_at FROM users WHERE email = ? LIMIT 1");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password_hash'])) {
        http_response_code(401);
        echo json_encode(['ok' => false, 'error' => 'Invalid credentials.']);
        exit;
    }

    // If you want sessions, you can start PHP sessions here.
    // For SPA usage, often you’ll issue a JWT, but per request we keep it simple.
    unset($user['password_hash']);

    echo json_encode(['ok' => true, 'user' => $user]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Server error.']);
}
