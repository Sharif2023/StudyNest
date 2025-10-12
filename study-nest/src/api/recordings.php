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
        
        // Get the actual username from the database to ensure consistency
        $username = null;
        if ($user_id) {
            $user_stmt = $pdo->prepare("SELECT username FROM users WHERE id = ?");
            $user_stmt->execute([$user_id]);
            $user_row = $user_stmt->fetch();
            $username = $user_row['username'] ?? $data["user_name"] ?? "Unknown";
        } else {
            $username = $data["user_name"] ?? "Unknown";
        }
        
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
            ":author" => $username,
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
            ":user_name" => $username,
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

// DELETE - Delete a recording
if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    try {
        $user_id = $_SESSION['user_id'] ?? null;
        
        if (!$user_id) {
            echo json_encode(["status" => "error", "message" => "Not authenticated"]);
            exit;
        }

        // Get the recording ID from URL or request body
        $recording_id = null;
        
        // Try to get from URL path (e.g., /recordings.php/123)
        $path_info = $_SERVER['PATH_INFO'] ?? '';
        if ($path_info) {
            $recording_id = trim($path_info, '/');
        }
        
        // Try to get from request body
        if (!$recording_id) {
            $input = json_decode(file_get_contents('php://input'), true) ?? [];
            $recording_id = $input['id'] ?? null;
        }
        
        // Try to get from query parameter
        if (!$recording_id) {
            $recording_id = $_GET['id'] ?? null;
        }
        
        if (!$recording_id) {
            echo json_encode(["status" => "error", "message" => "Recording ID is required"]);
            exit;
        }

        // Get the username for this user to verify ownership
        $user_stmt = $pdo->prepare("SELECT username FROM users WHERE id = ?");
        $user_stmt->execute([$user_id]);
        $user_row = $user_stmt->fetch();
        $username = $user_row['username'] ?? null;
        
        if (!$username) {
            echo json_encode(["status" => "error", "message" => "User not found"]);
            exit;
        }

        // Verify the recording belongs to this user
        $check_stmt = $pdo->prepare("
            SELECT id FROM resources 
            WHERE id = ? AND kind = 'recording' AND author = ?
        ");
        $check_stmt->execute([$recording_id, $username]);
        $recording = $check_stmt->fetch();
        
        if (!$recording) {
            echo json_encode(["status" => "error", "message" => "Recording not found or you don't have permission to delete it"]);
            exit;
        }

        // Delete from resources table (this will cascade to other tables if needed)
        $delete_stmt = $pdo->prepare("DELETE FROM resources WHERE id = ?");
        $delete_stmt->execute([$recording_id]);
        
        // Also delete from recordings table if it exists
        $delete_recording_stmt = $pdo->prepare("DELETE FROM recordings WHERE id = ?");
        $delete_recording_stmt->execute([$recording_id]);

        echo json_encode([
            "status" => "success", 
            "message" => "Recording deleted successfully"
        ]);
        
    } catch (Throwable $e) {
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
    exit;
}

echo json_encode(["status" => "error", "message" => "Invalid request method"]);
?>