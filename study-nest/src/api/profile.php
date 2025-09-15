<?php
require __DIR__ . '/db.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'error' => 'Unauthorized']);
    exit;
}

$user_id = intval($_SESSION['user_id']);

function fetch_profile(PDO $pdo, int $id) {
    $stmt = $pdo->prepare("
        SELECT id, student_id, email, name, profile_pic_url AS profile_picture_url, bio, password_hash, created_at, updated_at
        FROM users
        WHERE id = ?
        LIMIT 1
    ");
    $stmt->execute([$id]);
    return $stmt->fetch() ?: null;
}

try {
    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        $profile = fetch_profile($pdo, $user_id);
        if (!$profile) {
            http_response_code(404);
            echo json_encode(['ok' => false, 'error' => 'Profile not found']);
            exit;
        }
        unset($profile['password_hash']); // never expose password hash
        echo json_encode(['ok' => true, 'profile' => $profile]);
        exit;
    }

    if ($method === 'PUT' || $method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true) ?: [];

        // --- Password update ---
        if (!empty($data['old_password']) && !empty($data['new_password'])) {
            $oldPass = trim($data['old_password']);
            $newPass = trim($data['new_password']);

            $profile = fetch_profile($pdo, $user_id);
            if (!$profile || !password_verify($oldPass, $profile['password_hash'])) {
                http_response_code(403);
                echo json_encode(['ok' => false, 'error' => 'Old password is incorrect']);
                exit;
            }

            if (strlen($newPass) < 6) {
                http_response_code(422);
                echo json_encode(['ok' => false, 'error' => 'New password must be at least 6 characters']);
                exit;
            }

            $hash = password_hash($newPass, PASSWORD_DEFAULT);
            $stmt = $pdo->prepare("UPDATE users SET password_hash = ? WHERE id = ? LIMIT 1");
            $stmt->execute([$hash, $user_id]);

            echo json_encode(['ok' => true, 'message' => 'Password updated successfully']);
            exit;
        }

        // --- Clear local data (reset fields in DB) ---
        if (!empty($data['clear'])) {
            $stmt = $pdo->prepare("
                UPDATE users 
                SET name = NULL, bio = NULL, profile_pic_url = NULL 
                WHERE id = ? LIMIT 1
            ");
            $stmt->execute([$user_id]);

            $profile = fetch_profile($pdo, $user_id);
            unset($profile['password_hash']);
            echo json_encode(['ok' => true, 'message' => 'Profile data cleared', 'profile' => $profile]);
            exit;
        }

        // --- Profile update ---
        $name  = isset($data['name']) ? trim($data['name']) : '';
        $pic   = isset($data['profile_picture_url']) ? trim($data['profile_picture_url']) : '';
        $bio   = isset($data['bio']) ? trim($data['bio']) : '';

        if ($name === '') {
            http_response_code(422);
            echo json_encode(['ok' => false, 'error' => 'Name is required']);
            exit;
        }

        $stmt = $pdo->prepare("
            UPDATE users 
            SET name = ?, profile_pic_url = ?, bio = ? 
            WHERE id = ? LIMIT 1
        ");
        $stmt->execute([$name, $pic !== '' ? $pic : null, $bio !== '' ? $bio : null, $user_id]);

        $profile = fetch_profile($pdo, $user_id);
        unset($profile['password_hash']);
        echo json_encode(['ok' => true, 'profile' => $profile]);
        exit;
    }

    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method not allowed']);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Server error', 'detail' => $e->getMessage()]);
}
