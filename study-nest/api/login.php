<?php
require __DIR__ . '/db.php';
require __DIR__ . '/auth.php';
StudyNestAuth::init();

try {
    $data = json_decode(file_get_contents('php://input'), true) ?: [];
    $email = strtolower(trim($data['email'] ?? ''));
    $password = $data['password'] ?? '';

    if ($email === '' || $password === '') {
        http_response_code(422);
        echo json_encode(['ok' => false, 'error' => 'Email and password are required.']);
        exit;
    }

    $stmt = $pdo->prepare("
        SELECT
            id, student_id, email, username, profile_picture_url, bio,
            password_hash, points, created_at, updated_at, role, status
        FROM users
        WHERE email = ?
        LIMIT 1
    ");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password_hash'])) {
        http_response_code(401);
        echo json_encode(['ok' => false, 'error' => 'Invalid credentials.']);
        exit;
    }

    if (strtolower((string)($user['status'] ?? 'Active')) !== 'active') {
        http_response_code(403);
        echo json_encode(['ok' => false, 'error' => 'Account is not active.']);
        exit;
    }

    $pointsEarned = calculateLoginPoints($pdo, (int)$user['id']);
    $newPoints = (int)($user['points'] ?? 0) + $pointsEarned;

    $updateStmt = $pdo->prepare("UPDATE users SET points = ?, updated_at = NOW() WHERE id = ?");
    $updateStmt->execute([$newPoints, $user['id']]);

    if ($pointsEarned > 0) {
        $historyStmt = $pdo->prepare("
            INSERT INTO points_history (user_id, points, action_type, description, created_at)
            VALUES (?, ?, 'login_streak', ?, NOW())
        ");
        $historyStmt->execute([
            $user['id'],
            $pointsEarned,
            "Login streak reward: {$pointsEarned} points"
        ]);
    }

    session_regenerate_id(true);
    $_SESSION['user_id'] = (int)$user['id'];
    $_SESSION['username'] = $user['username'];
    $_SESSION['email'] = $user['email'];
    $_SESSION['student_id'] = $user['student_id'];
    $_SESSION['role'] = $user['role'] ?? 'User';

    unset($user['password_hash']);

    $responseUser = [
        'id' => $user['id'],
        'student_id' => $user['student_id'],
        'email' => $user['email'],
        'name' => $user['username'],
        'username' => $user['username'],
        'profile_picture_url' => $user['profile_picture_url'],
        'bio' => $user['bio'],
        'points' => $newPoints,
        'points_earned' => $pointsEarned,
        'created_at' => $user['created_at'],
        'updated_at' => $user['updated_at'],
        'role' => $user['role'] ?? 'User',
    ];

    $token = null;
    $refreshToken = null;
    try {
        $userScopes = (strtolower($user['role'] ?? 'user') === 'admin') ? ['admin', 'user'] : ['user'];
        $token = generateToken($user['id'], $userScopes);
        $refreshToken = generateToken($user['id'], ['refresh'], 604800);
    } catch (Throwable $e) {
        // Session-only auth remains available when JWT generation is unavailable.
    }

    echo json_encode([
        'ok' => true,
        'user' => $responseUser,
        'points_earned' => $pointsEarned,
        'token' => $token,
        'refresh_token' => $refreshToken,
        'session_id' => session_id(),
    ]);
    exit;

} catch (Throwable $e) {
    http_response_code(500);
    $debug = (($_ENV['APP_DEBUG'] ?? getenv('APP_DEBUG')) === 'true');
    echo json_encode([
        'ok' => false,
        'error' => 'Server error',
        'detail' => $debug ? $e->getMessage() : null
    ]);
    exit;
}

function calculateLoginPoints(PDO $pdo, int $userId): int {
    $lastLoginStmt = $pdo->prepare("
        SELECT created_at
        FROM points_history
        WHERE user_id = ? AND action_type = 'login_streak'
        ORDER BY created_at DESC
        LIMIT 1
    ");
    $lastLoginStmt->execute([$userId]);
    $lastLogin = $lastLoginStmt->fetch();

    $currentDate = new DateTime();
    if (!$lastLogin) return 5;

    $lastLoginDate = new DateTime($lastLogin['created_at']);
    $interval = $currentDate->diff($lastLoginDate);
    $daysSinceLastLogin = (int)$interval->days;

    if ($daysSinceLastLogin === 1) return getStreakPoints($pdo, $userId);
    if ($daysSinceLastLogin === 0) return 0;
    return 5;
}

function getStreakPoints(PDO $pdo, int $userId): int {
    $streakStmt = $pdo->prepare("
        SELECT COUNT(*) as streak_count
        FROM (
            SELECT DATE(created_at) as login_date
            FROM points_history
            WHERE user_id = ? AND action_type = 'login_streak'
            GROUP BY DATE(created_at)
            ORDER BY login_date DESC
            LIMIT 7
        ) recent_logins
    ");
    $streakStmt->execute([$userId]);
    $result = $streakStmt->fetch();
    $currentStreak = (int)($result['streak_count'] ?? 0) + 1;

    if ($currentStreak >= 20) return 20;
    if ($currentStreak >= 7) return 12;
    if ($currentStreak >= 3) return 8;
    return 5;
}
?>
