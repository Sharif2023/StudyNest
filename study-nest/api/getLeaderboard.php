<?php
// getLeaderboard.php

define('STUDYNEST_ALLOW_DB_FAILURE', true);
require_once __DIR__ . '/db.php'; // Provides $pdo, CORS headers, and session_start()

function leaderboard_json(array $data, int $code = 200): void {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_SLASHES);
    exit;
}

function empty_leaderboard(string $message = 'Leaderboard temporarily unavailable'): array {
    return [
        'success' => true,
        'ok' => true,
        'leaderboard' => [],
        'message' => $message,
    ];
}

if (!isset($pdo) || !$pdo instanceof PDO) {
    error_log('getLeaderboard DB unavailable: ' . ($GLOBALS['STUDYNEST_DB_ERROR'] ?? 'unknown'));
    leaderboard_json(empty_leaderboard());
}

try {
    // Get top 50 users by points with ranking using PostgreSQL window function
    $stmt = $pdo->prepare("
        SELECT 
            id, 
            username as name, 
            student_id, 
            COALESCE(points, 0) as points,
            RANK() OVER (ORDER BY COALESCE(points, 0) DESC) as rank
        FROM users
        ORDER BY points DESC NULLS LAST
        LIMIT 50
    ");
    
    $stmt->execute();
    $leaderboard = array_map(static function ($row) {
        return [
            'id' => (int)$row['id'],
            'name' => $row['name'] ?: 'Student',
            'student_id' => $row['student_id'] ?? '',
            'points' => (int)($row['points'] ?? 0),
            'rank' => (int)($row['rank'] ?? 0),
        ];
    }, $stmt->fetchAll(PDO::FETCH_ASSOC));

    leaderboard_json([
        'ok' => true,
        'success' => true,
        'leaderboard' => $leaderboard,
        'message' => count($leaderboard) . ' users found'
    ]);
    
} catch (Throwable $e) {
    error_log('getLeaderboard error: ' . $e->getMessage());
    leaderboard_json(empty_leaderboard());
}
?>
