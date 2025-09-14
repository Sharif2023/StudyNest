<?php
require __DIR__ . '/db.php'; // provides $pdo + CORS

try {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }

    $data = json_decode(file_get_contents('php://input'), true) ?: [];
    $email    = strtolower(trim($data['email'] ?? ''));
    $password = $data['password'] ?? '';

    if ($email === '' || $password === '') {
        http_response_code(422);
        echo json_encode(['ok' => false, 'error' => 'Email and password are required.']);
        exit;
    }

    // Try NEW schema first (has name, avatar_url). If it fails, fallback to legacy schema.
    $user = null;
    $stmt = null;

    try {
        $stmt = $pdo->prepare("
            SELECT id, student_id, email, name, avatar_url, password_hash, created_at, updated_at
            FROM users
            WHERE email = ?
            LIMIT 1
        ");
        $stmt->execute([$email]);
        $user = $stmt->fetch();
    } catch (Throwable $inner) {
        // Likely "Unknown column 'name'..." -> use legacy columns
        $stmt = $pdo->prepare("
            SELECT id, student_id, email, password_hash, created_at
            FROM users
            WHERE email = ?
            LIMIT 1
        ");
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        // Add placeholders so frontend won’t break
        if ($user) {
            $user['name'] = null;
            $user['avatar_url'] = null;
            $user['updated_at'] = null;
        }
    }

    // Validate password
    if (!$user || !password_verify($password, $user['password_hash'])) {
        http_response_code(401);
        echo json_encode(['ok' => false, 'error' => 'Invalid credentials.']);
        exit;
    }

    // Session for profile.php
    $_SESSION['user_id'] = (int)$user['id'];

    unset($user['password_hash']);
    echo json_encode(['ok' => true, 'user' => $user]);
    exit;

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'error' => 'Server error',
        // uncomment next line temporarily to see exact cause during debugging:
        // 'detail' => $e->getMessage()
    ]);
    exit;
}
