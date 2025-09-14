<?php
// api/profile.php
require __DIR__ . '/db.php'; // provides $pdo and CORS headers

// Use PHP sessions for auth (matches your existing file)
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// 401 if not logged in
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'error' => 'Unauthorized']);
    exit;
}

$user_id = intval($_SESSION['user_id']);

// Helper to fetch and return the canonical profile row
function fetch_profile(PDO $pdo, int $id) {
    $stmt = $pdo->prepare("
        SELECT id, student_id, email, name, avatar_url, created_at, updated_at
        FROM users
        WHERE id = ?
        LIMIT 1
    ");
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    return $row ?: null;
}

try {
    // Support GET (read) and PUT/POST (update name/avatar only)
    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        $profile = fetch_profile($pdo, $user_id);
        if (!$profile) {
            http_response_code(404);
            echo json_encode(['ok' => false, 'error' => 'Profile not found']);
            exit;
        }
        echo json_encode(['ok' => true, 'profile' => $profile]);
        exit;
    }

    if ($method === 'PUT' || $method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true) ?: [];

        // Only updatable fields:
        $name = isset($data['name']) ? trim($data['name']) : '';
        $avatar_url = isset($data['avatar_url']) ? trim($data['avatar_url']) : '';

        if ($name === '') {
            http_response_code(422);
            echo json_encode(['ok' => false, 'error' => 'name is required']);
            exit;
        }

        // Email and student_id are intentionally NOT updatable here
        $stmt = $pdo->prepare("UPDATE users SET name = ?, avatar_url = ? WHERE id = ? LIMIT 1");
        $stmt->execute([$name, $avatar_url !== '' ? $avatar_url : null, $user_id]);

        // Return the fresh profile after update
        $profile = fetch_profile($pdo, $user_id);
        echo json_encode(['ok' => true, 'profile' => $profile]);
        exit;
    }

    // Method not allowed
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method not allowed']);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Server error']);
}
