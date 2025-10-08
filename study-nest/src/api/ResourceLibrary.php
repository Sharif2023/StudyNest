<?php
// ResourceLibrary.php
header("Access-Control-Allow-Origin: http://localhost:5173"); // <-- adjust if your React app runs elsewhere
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

session_start();

// --- DB connection ---
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
    echo json_encode(["status" => "error", "message" => "DB connection failed", "detail" => $e->getMessage()]);
    exit;
}

// ----------------------------------------------------
// GET — fetch all resources
// ----------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $stmt = $pdo->query("SELECT * FROM resources ORDER BY created_at DESC");
        $resources = $stmt->fetchAll();
        echo json_encode(["status" => "success", "resources" => $resources]);
    } catch (Throwable $e) {
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
    exit;
}

// ----------------------------------------------------
// POST — add new resource (with correct author)
// ----------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $data = json_decode(file_get_contents("php://input"), true);

        // Validate basic fields
        if (empty($data['title']) || empty($data['course']) || empty($data['semester'])) {
            echo json_encode(["status" => "error", "message" => "Missing required fields"]);
            exit;
        }

        // --- Resolve author name ---
        $author = trim($data['author'] ?? '');

        // If user is logged in and not anonymous, use real username
        if ($author !== "Anonymous" && isset($_SESSION['user_id'])) {
            $stmt = $pdo->prepare("SELECT username FROM users WHERE id = ?");
            $stmt->execute([$_SESSION['user_id']]);
            $realName = $stmt->fetchColumn();
            if ($realName) {
                $author = $realName;
            }
        }

        // --- Prepare insert ---
        $stmt = $pdo->prepare("
            INSERT INTO resources 
                (title, kind, course, semester, tags, description, author, src_type, url, votes, bookmarks, flagged, created_at)
            VALUES 
                (:title, :kind, :course, :semester, :tags, :description, :author, :src_type, :url, 0, 0, 0, NOW())
        ");

        $stmt->execute([
            ":title" => $data["title"],
            ":kind" => $data["kind"] ?? "other",
            ":course" => $data["course"],
            ":semester" => $data["semester"],
            ":tags" => $data["tags"] ?? "",
            ":description" => $data["description"] ?? "",
            ":author" => $author ?: "Unknown",
            ":src_type" => $data["src_type"] ?? "link",
            ":url" => $data["url"] ?? "",
        ]);

        echo json_encode(["status" => "success", "message" => "Resource added successfully"]);
    } catch (Throwable $e) {
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
    exit;
}

// ----------------------------------------------------
// PUT — update a resource (vote, bookmark, flag)
// ----------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    try {
        $data = json_decode(file_get_contents("php://input"), true);
        $id = $data['id'] ?? null;
        if (!$id) {
            echo json_encode(["status" => "error", "message" => "Missing resource ID"]);
            exit;
        }

        $fields = [];
        $params = [];
        foreach (['votes', 'bookmarks', 'flagged'] as $col) {
            if (isset($data[$col])) {
                $fields[] = "$col = :$col";
                $params[":$col"] = $data[$col];
            }
        }
        if (!$fields) {
            echo json_encode(["status" => "error", "message" => "No valid update fields"]);
            exit;
        }

        $params[":id"] = $id;
        $sql = "UPDATE resources SET " . implode(", ", $fields) . " WHERE id = :id";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        echo json_encode(["status" => "success", "message" => "Resource updated"]);
    } catch (Throwable $e) {
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
    exit;
}

// ----------------------------------------------------
// Fallback
// ----------------------------------------------------
echo json_encode(["status" => "error", "message" => "Invalid request method"]);
exit;
?>
