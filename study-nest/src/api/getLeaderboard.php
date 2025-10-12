<?php
// CORS for local dev (adjust origin if needed)
function allow_cors()
{
    $origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '*';
    header("Access-Control-Allow-Origin: $origin");
    header("Access-Control-Allow-Credentials: true");
    header("Access-Control-Allow-Headers: Content-Type, Authorization");
    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
    header("Content-Type: application/json; charset=utf-8");
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}
allow_cors();

// DB config (XAMPP defaults: user=root, password=empty)
$host = 'localhost';
$db_name = 'studynest';
$user = 'root';
$pass = '';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db_name;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
];

try {
    // Connect to database
    $pdo = new PDO($dsn, $user, $pass, $options);

    // Check if points column exists in users table, add it if not
    $checkPoints = $pdo->query("SHOW COLUMNS FROM users LIKE 'points'")->fetch();
    if (!$checkPoints) {
        $pdo->exec("ALTER TABLE users ADD COLUMN points INT(11) DEFAULT 0 AFTER profile_picture_url");
    }

    // Check if points_history table exists, create it if not
    $checkPointsHistory = $pdo->query("SHOW TABLES LIKE 'points_history'")->fetch();
    if (!$checkPointsHistory) {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS points_history (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                user_id INT UNSIGNED NOT NULL,
                points INT(11) NOT NULL,
                action_type VARCHAR(50) NOT NULL,
                description TEXT NULL,
                reference_id INT(11) NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ");
    }

    // Check if role column exists in users table, add it if not
    $checkRole = $pdo->query("SHOW COLUMNS FROM users LIKE 'role'")->fetch();
    if (!$checkRole) {
        $pdo->exec("ALTER TABLE users ADD COLUMN role ENUM('User', 'Admin') DEFAULT 'User' AFTER email");
    }

    // Get top 50 users by points with ranking
    $stmt = $pdo->prepare("
        SELECT 
            id, 
            username as name, 
            student_id, 
            COALESCE(points, 0) as points,
            @rank := @rank + 1 as rank
        FROM users, (SELECT @rank := 0) r
        ORDER BY points DESC 
        LIMIT 50
    ");
    
    $stmt->execute();
    $leaderboard = $stmt->fetchAll();

    // If no users exist or all have 0 points, create some sample data
    if (empty($leaderboard)) {
        // Create some sample users for demonstration
        $sampleUsers = [
            ['john_doe', 'STU001', 'john@example.com', 'John Doe', 1250],
            ['jane_smith', 'STU002', 'jane@example.com', 'Jane Smith', 980],
            ['mike_johnson', 'STU003', 'mike@example.com', 'Mike Johnson', 875],
            ['sarah_wilson', 'STU004', 'sarah@example.com', 'Sarah Wilson', 760],
            ['alex_chen', 'STU005', 'alex@example.com', 'Alex Chen', 650]
        ];

        foreach ($sampleUsers as $user) {
            $stmt = $pdo->prepare("
                INSERT INTO users (username, student_id, email, points) 
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE points = ?
            ");
            $stmt->execute([$user[0], $user[1], $user[2], $user[4], $user[4]]);
        }

        // Fetch leaderboard again
        $stmt->execute();
        $leaderboard = $stmt->fetchAll();
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