<?php
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

session_start();

// DB connection
$host = "localhost";
$db_name = "studynest";
$user = "root";
$pass = "";
$charset = "utf8mb4";

$dsn = "mysql:host=$host;dbname=$db_name;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (Throwable $e) {
    echo json_encode(["status" => "error", "message" => "DB connection failed"]);
    exit;
}

// Create recordings table if not exists
$pdo->exec("
    CREATE TABLE IF NOT EXISTS recordings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        room_id VARCHAR(255) NOT NULL,
        video_url TEXT NOT NULL,
        user_name VARCHAR(255) NOT NULL,
        user_id INT,
        duration INT DEFAULT 0,
        recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_room (room_id),
        INDEX idx_user (user_id)
    )
");

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (empty($data['room_id']) || empty($data['video_url'])) {
        echo json_encode(["status" => "error", "message" => "Missing required fields"]);
        exit;
    }

    $user_id = $_SESSION['user_id'] ?? null;

    try {
        $stmt = $pdo->prepare("
            INSERT INTO recordings (room_id, video_url, user_name, user_id, duration, recorded_at)
            VALUES (:room_id, :video_url, :user_name, :user_id, :duration, :recorded_at)
        ");
        
        $stmt->execute([
            ':room_id' => $data['room_id'],
            ':video_url' => $data['video_url'],
            ':user_name' => $data['user_name'] ?? 'Unknown',
            ':user_id' => $user_id,
            ':duration' => $data['duration'] ?? 0,
            ':recorded_at' => $data['recorded_at'] ?? date('Y-m-d H:i:s')
        ]);

        echo json_encode(["status" => "success", "message" => "Recording saved successfully"]);
    } catch (Throwable $e) {
        echo json_encode(["status" => "error", "message" => "Failed to save recording"]);
    }
    exit;
}

// GET recordings for a user
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $user_id = $_SESSION['user_id'] ?? null;
    
    if (!$user_id) {
        echo json_encode(["status" => "error", "message" => "Not authenticated"]);
        exit;
    }

    try {
        $stmt = $pdo->prepare("
            SELECT * FROM recordings 
            WHERE user_id = ? 
            ORDER BY recorded_at DESC
        ");
        $stmt->execute([$user_id]);
        $recordings = $stmt->fetchAll();

        echo json_encode(["status" => "success", "recordings" => $recordings]);
    } catch (Throwable $e) {
        echo json_encode(["status" => "error", "message" => "Failed to fetch recordings"]);
    }
    exit;
}

echo json_encode(["status" => "error", "message" => "Invalid request method"]);
?>