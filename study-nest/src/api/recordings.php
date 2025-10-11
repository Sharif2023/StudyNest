<?php
// recordings.php

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
        room_id VARCHAR(64) NOT NULL,
        video_url TEXT NOT NULL,
        user_name VARCHAR(255) NOT NULL,
        user_id INT,
        duration INT DEFAULT 0,
        recorded_at DATETIME NOT NULL,
        title VARCHAR(500) NOT NULL,
        description TEXT,
        course VARCHAR(100),
        semester VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_room_id (room_id),
        INDEX idx_created_at (created_at)
    )
");

// POST - Save recording metadata
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (empty($data['video_url']) || empty($data['room_id'])) {
            echo json_encode(["status" => "error", "message" => "Missing required fields"]);
            exit;
        }

        $user_id = $_SESSION['user_id'] ?? null;
        
        // Also save to resources table for ResourceLibrary visibility
        $resource_stmt = $pdo->prepare("
            INSERT INTO resources 
                (title, kind, course, semester, description, author, src_type, url, votes, bookmarks, flagged, created_at)
            VALUES 
                (:title, 'recording', :course, :semester, :description, :author, 'link', :url, 0, 0, 0, NOW())
        ");
        
        $resource_stmt->execute([
            ":title" => $data["title"] ?? "Study Session Recording",
            ":course" => $data["course"] ?? "General",
            ":semester" => $data["semester"] ?? "Current",
            ":description" => $data["description"] ?? "Study session recording",
            ":author" => $data["user_name"] ?? "Unknown",
            ":url" => $data["video_url"]
        ]);
        
        $resource_id = $pdo->lastInsertId();

        // Save to recordings table
        $recording_stmt = $pdo->prepare("
            INSERT INTO recordings 
                (room_id, video_url, user_name, user_id, duration, recorded_at, title, description, course, semester)
            VALUES 
                (:room_id, :video_url, :user_name, :user_id, :duration, :recorded_at, :title, :description, :course, :semester)
        ");
        
        $recording_stmt->execute([
            ":room_id" => $data["room_id"],
            ":video_url" => $data["video_url"],
            ":user_name" => $data["user_name"],
            ":user_id" => $user_id,
            ":duration" => $data["duration"] ?? 0,
            ":recorded_at" => $data["recorded_at"] ?? date('Y-m-d H:i:s'),
            ":title" => $data["title"] ?? "Study Session Recording",
            ":description" => $data["description"] ?? "Study session recording",
            ":course" => $data["course"] ?? "General",
            ":semester" => $data["semester"] ?? "Current"
        ]);

        echo json_encode([
            "status" => "success", 
            "message" => "Recording saved successfully",
            "resource_id" => $resource_id
        ]);
        
    } catch (Throwable $e) {
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
    exit;
}

// GET - Fetch user's recordings
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $user_id = $_SESSION['user_id'] ?? null;
        
        if (!$user_id) {
            echo json_encode(["status" => "error", "message" => "Not authenticated"]);
            exit;
        }

        // Get recordings from resources table (for ResourceLibrary)
        $stmt = $pdo->prepare("
            SELECT r.* 
            FROM resources r
            WHERE r.author = (SELECT username FROM users WHERE id = ?) 
            AND r.kind = 'recording'
            ORDER BY r.created_at DESC
        ");
        $stmt->execute([$user_id]);
        $recordings = $stmt->fetchAll();

        echo json_encode([
            "status" => "success", 
            "recordings" => $recordings
        ]);
        
    } catch (Throwable $e) {
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
    exit;
}

echo json_encode(["status" => "error", "message" => "Invalid request method"]);
?>