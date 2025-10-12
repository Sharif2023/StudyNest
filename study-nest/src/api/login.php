<?php
require __DIR__ . '/db.php'; // provides $pdo + CORS

try {
    // Configure session with same settings as profile.php
    session_set_cookie_params([
        'lifetime' => 86400,
        'path' => '/',
        'domain' => $_SERVER['HTTP_HOST'] ?? 'localhost',
        'secure' => false,
        'httponly' => true,
        'samesite' => 'Lax'
    ]);

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

    // Query with correct column names matching your schema
    $stmt = $pdo->prepare("
        SELECT 
            id, 
            student_id, 
            email, 
            username, 
            profile_picture_url, 
            bio,
            password_hash, 
            created_at, 
            updated_at
        FROM users
        WHERE email = ?
        LIMIT 1
    ");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    // Validate password
    if (!$user || !password_verify($password, $user['password_hash'])) {
        http_response_code(401);
        echo json_encode(['ok' => false, 'error' => 'Invalid credentials.']);
        exit;
    }

    // ✅ CRITICAL: Store user_id in session for profile.php
    $_SESSION['user_id'] = (int)$user['id'];
    $_SESSION['username'] = $user['username'];
    $_SESSION['email'] = $user['email'];
    $_SESSION['student_id'] = $user['student_id'];

    // Remove password hash before sending to client
    unset($user['password_hash']);

    // Normalize field names for frontend consistency
    $responseUser = [
        'id' => $user['id'],
        'student_id' => $user['student_id'],
        'email' => $user['email'],
        'name' => $user['username'], // Map username -> name for frontend
        'username' => $user['username'],
        'profile_picture_url' => $user['profile_picture_url'],
        'bio' => $user['bio'],
        'created_at' => $user['created_at'],
        'updated_at' => $user['updated_at']
    ];

    echo json_encode([
        'ok' => true, 
        'user' => $responseUser,
        'session_id' => session_id() // For debugging
    ]);
    exit;

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'error' => 'Server error',
        'detail' => $e->getMessage() // Keep for debugging, remove in production
    ]);
    exit;
}