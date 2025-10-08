<?php
// ResourceLibrary.php
header("Access-Control-Allow-Origin: http://localhost:5173"); // Adjust to your frontend origin
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

// --- Create bookmarks table if not exists ---
$pdo->exec("
    CREATE TABLE IF NOT EXISTS bookmarks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        resource_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY (user_id, resource_id)
    )
");

// ----------------------------------------------------
// GET — Fetch all resources
// ----------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $stmt = $pdo->query("SELECT * FROM resources ORDER BY created_at DESC");
        $resources = $stmt->fetchAll();

        // If logged in, mark bookmarked resources
        if (!empty($_SESSION['user_id'])) {
            $uid = $_SESSION['user_id'];
            $b = $pdo->prepare("SELECT resource_id FROM bookmarks WHERE user_id=?");
            $b->execute([$uid]);
            $bookmarked = array_column($b->fetchAll(), 'resource_id');
            foreach ($resources as &$r) {
                $r['bookmarked'] = in_array($r['id'], $bookmarked);
            }
        }

        echo json_encode(["status" => "success", "resources" => $resources]);
    } catch (Throwable $e) {
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
    exit;
}

// ----------------------------------------------------
// POST — Add a new resource OR toggle bookmark
// ----------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // --- Toggle Bookmark ---
    if (!empty($_POST['action']) && $_POST['action'] === 'toggle_bookmark') {
        if (empty($_SESSION['user_id'])) {
            echo json_encode(["status" => "error", "message" => "Not logged in"]);
            exit;
        }

        $user_id = (int) $_SESSION['user_id'];
        $resource_id = (int) ($_POST['resource_id'] ?? 0);

        if (!$resource_id) {
            echo json_encode(["status" => "error", "message" => "Missing resource ID"]);
            exit;
        }

        try {
            $check = $pdo->prepare("SELECT id FROM bookmarks WHERE user_id=? AND resource_id=?");
            $check->execute([$user_id, $resource_id]);
            if ($check->fetch()) {
                $del = $pdo->prepare("DELETE FROM bookmarks WHERE user_id=? AND resource_id=?");
                $del->execute([$user_id, $resource_id]);
                echo json_encode(["status" => "success", "action" => "removed"]);
            } else {
                $add = $pdo->prepare("INSERT INTO bookmarks (user_id, resource_id) VALUES (?, ?)");
                $add->execute([$user_id, $resource_id]);
                echo json_encode(["status" => "success", "action" => "added"]);
            }
        } catch (Throwable $e) {
            echo json_encode(["status" => "error", "message" => $e->getMessage()]);
        }
        exit;
    }

    // --- Add new resource ---
    try {
        $data = $_POST ?: json_decode(file_get_contents("php://input"), true);

        if (empty($data['title']) || empty($data['course']) || empty($data['semester'])) {
            echo json_encode(["status" => "error", "message" => "Missing required fields"]);
            exit;
        }

        // Determine author
        $author = trim($data['author'] ?? '');
        if ($author !== "Anonymous" && isset($_SESSION['user_id'])) {
            $stmt = $pdo->prepare("SELECT username FROM users WHERE id = ?");
            $stmt->execute([$_SESSION['user_id']]);
            $realName = $stmt->fetchColumn();
            if ($realName)
                $author = $realName;
        }

        // Handle upload
        $src_type = $data['src_type'] ?? 'link';
        $url = trim($data['url'] ?? '');

        if ($src_type === 'file' && isset($_FILES['file'])) {
            $file = $_FILES['file'];
            if ($file['error'] !== UPLOAD_ERR_OK) {
                echo json_encode(["status" => "error", "message" => "File upload error"]);
                exit;
            }

            // MIME validation
            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            $mime = finfo_file($finfo, $file['tmp_name']);
            finfo_close($finfo);
            $mime = trim(preg_replace('/\s+/', '', $mime));

            $allowed_mimes = [
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.ms-powerpoint',
                'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'text/plain',
                'application/zip',
                'application/x-rar-compressed',
                'image/jpeg',
                'image/png',
                'image/webp',
                'image/gif'
            ];
            if (!in_array($mime, $allowed_mimes, true)) {
                echo json_encode(["status" => "error", "message" => "Invalid file type: $mime"]);
                exit;
            }

            // Upload
            $uploadDir = __DIR__ . '/uploads';
            if (!is_dir($uploadDir))
                mkdir($uploadDir, 0775, true);
            $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
            $safeName = 'resource-' . uniqid() . '.' . $ext;
            $targetPath = $uploadDir . '/' . $safeName;
            if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
                echo json_encode(["status" => "error", "message" => "Failed to save file"]);
                exit;
            }

            $baseUrl = (isset($_SERVER['HTTPS']) ? "https://" : "http://") . $_SERVER['HTTP_HOST'];
            $url = $baseUrl . "/StudyNest/study-nest/src/api/uploads/" . $safeName;
            $src_type = 'file';
        }

        // Insert DB record
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
            ":src_type" => $src_type,
            ":url" => $url,
        ]);

        echo json_encode(["status" => "success", "message" => "Resource added successfully"]);
    } catch (Throwable $e) {
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
    exit;
}

// ----------------------------------------------------
// PUT — Update (vote, bookmark, flag)
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

echo json_encode(["status" => "error", "message" => "Invalid request method"]);
exit;
?>