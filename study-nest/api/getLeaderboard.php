<?php
// getLeaderboard.php

require_once __DIR__ . '/db.php'; // Provides $pdo, CORS headers, and session_start()

try {
    // Get top 50 users by points with ranking using PostgreSQL window function
    $stmt = $pdo->prepare("
        SELECT 
            id, 
            username as name, 
            student_id, 
            COALESCE(points, 0) as points,
            ROW_NUMBER() OVER (ORDER BY points DESC) as rank
        FROM users
        ORDER BY points DESC 
        LIMIT 50
    ");
    
    $stmt->execute();
    $leaderboard = $stmt->fetchAll();

    // If no users exist, return empty array (or fallback if you prefer)
    if (empty($leaderboard)) {
        // You could optionally insert sample data here using PostgreSQL 'ON CONFLICT' syntax
        // but for now we'll just return what's in the DB.
    }

    echo json_encode([
        'success' => true,
        'leaderboard' => $leaderboard,
        'message' => count($leaderboard) . ' users found'
    ]);
    
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false, 
        'message' => 'Database error: ' . $e->getMessage(),
        'leaderboard' => getFallbackLeaderboard()
    ]);
}

// Fallback data if everything fails
function getFallbackLeaderboard() {
    return [
        ['id' => 1, 'name' => 'John Doe', 'student_id' => 'STU001', 'points' => 1250, 'rank' => 1],
        ['id' => 2, 'name' => 'Jane Smith', 'student_id' => 'STU002', 'points' => 980, 'rank' => 2],
        ['id' => 3, 'name' => 'Mike Johnson', 'student_id' => 'STU003', 'points' => 875, 'rank' => 3],
        ['id' => 4, 'name' => 'Sarah Wilson', 'student_id' => 'STU004', 'points' => 760, 'rank' => 4],
        ['id' => 5, 'name' => 'Alex Chen', 'student_id' => 'STU005', 'points' => 650, 'rank' => 5],
        ['id' => 6, 'name' => 'Emily Davis', 'student_id' => 'STU006', 'points' => 540, 'rank' => 6],
        ['id' => 7, 'name' => 'David Brown', 'student_id' => 'STU007', 'points' => 430, 'rank' => 7],
        ['id' => 8, 'name' => 'Lisa Garcia', 'student_id' => 'STU008', 'points' => 320, 'rank' => 8],
        ['id' => 9, 'name' => 'Kevin Lee', 'student_id' => 'STU009', 'points' => 210, 'rank' => 9],
        ['id' => 10, 'name' => 'Amy Martinez', 'student_id' => 'STU010', 'points' => 150, 'rank' => 10],
    ];
}
?>