<?php
require __DIR__ . '/db.php';
require __DIR__ . '/auth.php';
StudyNestAuth::init();

try {
    // Session is already started and configured by db.php

    $data = json_decode(file_get_contents('php://input'), true) ?: [];
    $email    = strtolower(trim($data['email'] ?? ''));
    $password = $data['password'] ?? '';

    if ($email === '' || $password === '') {
        http_response_code(422);
        echo json_encode(['ok' => false, 'error' => 'Email and password are required.']);
        exit;
    }

    // ---------------------------------------------------------
    // ✅ SPECIAL ADMIN LOGIN
    // email: admin@studynest.com, password: admin123
    // ---------------------------------------------------------
    $isAdminLogin = ($email === 'admin@studynest.com' && $password === 'admin123');

    if ($isAdminLogin) {
        // Ensure admin user exists in DB
        $check = $pdo->prepare("SELECT id FROM users WHERE email = ? LIMIT 1");
        $check->execute([$email]);
        $admin = $check->fetch();

        if (!$admin) {
            // Auto-create admin if missing
            $stmt = $pdo->prepare("
                INSERT INTO users (username, student_id, email, password_hash, role, status) 
                VALUES ('System Admin', 'ADMIN-001', ?, ?, 'Admin', 'Active')
                RETURNING id
            ");
            $stmt->execute([$email, password_hash($password, PASSWORD_DEFAULT)]);
            $admin_id = $stmt->fetchColumn();
        } else {
            $admin_id = $admin['id'];
            // Ensure role is Admin
            $pdo->prepare("UPDATE users SET role='Admin' WHERE id=?")->execute([$admin_id]);
        }
        
        // Re-query complete user data for the response
        $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
        $stmt->execute([$admin_id]);
        $user = $stmt->fetch();
    } else {
        // Standard user login
        $stmt = $pdo->prepare("
            SELECT 
                id, student_id, email, username, profile_picture_url, bio,
                password_hash, points, created_at, updated_at, role
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
    }

    // ✅ Calculate login streak and points
    $pointsEarned = calculateLoginPoints($pdo, $user['id']);
    
    // ✅ Update user's total points
    $newPoints = $user['points'] + $pointsEarned;
    $updateStmt = $pdo->prepare("UPDATE users SET points = ?, updated_at = NOW() WHERE id = ?");
    $updateStmt->execute([$newPoints, $user['id']]);

    // ✅ Record points in history
    $historyStmt = $pdo->prepare("
        INSERT INTO points_history (user_id, points, action_type, description, created_at) 
        VALUES (?, ?, 'login_streak', ?, NOW())
    ");
    $historyStmt->execute([
        $user['id'], 
        $pointsEarned, 
        "Login streak reward: {$pointsEarned} points"
    ]);

    $_SESSION['user_id'] = (int)$user['id'];
    $_SESSION['username'] = $user['username'];
    $_SESSION['email'] = $user['email'];
    $_SESSION['student_id'] = $user['student_id'];
    $_SESSION['role'] = $user['role'] ?? 'User';

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
        'points' => $newPoints, // Send updated points
        'points_earned' => $pointsEarned, // Points earned this login
        'created_at' => $user['created_at'],
        'updated_at' => $user['updated_at'],
        'role' => $user['role'] ?? 'User',
    ];

    // JWT generation with role-based scopes
    $token = null;
    $refreshToken = null;
    try {
        $userScopes = (strtolower($user['role'] ?? 'user') === 'admin') ? ['admin', 'user'] : ['user'];
        $token = generateToken($user['id'], $userScopes);
        $refreshToken = generateToken($user['id'], ['refresh'], 604800);
    } catch (Throwable $e) {
        // Session-only auth
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
    echo json_encode([
        'ok' => false,
        'error' => 'Server error',
        'detail' => $e->getMessage() // Keep for debugging, remove in production
    ]);
    exit;
}

/**
 * Calculate login streak points
 */
function calculateLoginPoints($pdo, $userId) {
    // Get last login date
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
    
    // If no previous login, this is first login - give base points
    if (!$lastLogin) {
        return 5; // Base points for first login
    }
    
    $lastLoginDate = new DateTime($lastLogin['created_at']);
    $interval = $currentDate->diff($lastLoginDate);
    $daysSinceLastLogin = $interval->days;
    
    // Check if login is consecutive
    if ($daysSinceLastLogin === 1) {
        // Consecutive login - increment streak
        return getStreakPoints($pdo, $userId);
    } elseif ($daysSinceLastLogin === 0) {
        // Same day login - no additional points
        return 0;
    } else {
        // Streak broken - reset to base points
        resetLoginStreak($pdo, $userId);
        return 5; // Base points for new streak
    }
}

/**
 * Get points based on current streak
 */
function getStreakPoints($pdo, $userId) {
    // Get current streak count from recent consecutive logins
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
    $currentStreak = $result['streak_count'] + 1; // +1 for current login
    
    // Calculate points based on streak
    if ($currentStreak >= 20) {
        return 20;
    } elseif ($currentStreak >= 7) {
        return 12;
    } elseif ($currentStreak >= 3) {
        return 8;
    } else {
        return 5;
    }
}

/**
 * Reset login streak (optional - for tracking purposes)
 */
function resetLoginStreak($pdo, $userId) {
    // You might want to track streak resets in a separate table
    // For now, we'll just return base points
    return 5;
}
?>