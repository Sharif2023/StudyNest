<?php
// ResourceLibrary.php
header("Access-Control-Allow-Origin: http://localhost:5173"); // adjust for your frontend origin
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
// GET — Fetch all resources
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
// POST — Add a new resource (supports all file types)
// ----------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        // Handle JSON and multipart form
        $data = $_POST ?: json_decode(file_get_contents("php://input"), true);

        if (empty($data['title']) || empty($data['course']) || empty($data['semester'])) {
            echo json_encode(["status" => "error", "message" => "Missing required fields"]);
            exit;
        }

        // --- Determine author ---
        $author = trim($data['author'] ?? '');
        if ($author !== "Anonymous" && isset($_SESSION['user_id'])) {
            $stmt = $pdo->prepare("SELECT username FROM users WHERE id = ?");
            $stmt->execute([$_SESSION['user_id']]);
            $realName = $stmt->fetchColumn();
            if ($realName)
                $author = $realName;
        }

        // --- Handle upload ---
        $src_type = $data['src_type'] ?? 'link';
        $url = trim($data['url'] ?? '');

        if ($src_type === 'file' && isset($_FILES['file'])) {
            $file = $_FILES['file'];

            if ($file['error'] !== UPLOAD_ERR_OK) {
                echo json_encode(["status" => "error", "message" => "File upload error"]);
                exit;
            }

            // --- Detect MIME safely ---
            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            $mime = finfo_file($finfo, $file['tmp_name']);
            finfo_close($finfo);

            // Clean up MIME (remove duplicates or spaces)
            $mime = trim(preg_replace('/\s+/', '', $mime));

            // Some PHP builds may repeat the MIME string (bug fix)
            if (preg_match('/(application\/[a-zA-Z0-9.\-+]+)\1/', $mime, $matches)) {
                $mime = $matches[1];
            }

            // Allow list
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
                echo json_encode(["status" => "error", "message" => "Invalid or unsupported file type: $mime"]);
                exit;
            }

            // Ensure uploads dir
            $uploadDir = __DIR__ . '/uploads';
            if (!is_dir($uploadDir))
                mkdir($uploadDir, 0775, true);

            // Safe unique filename
            $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
            $safeName = 'resource-' . uniqid() . '.' . $ext;
            $targetPath = $uploadDir . '/' . $safeName;

            if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
                echo json_encode(["status" => "error", "message" => "Failed to move uploaded file"]);
                exit;
            }

            $baseUrl = (isset($_SERVER['HTTPS']) ? "https://" : "http://") . $_SERVER['HTTP_HOST'];
            $url = $baseUrl . "/StudyNest/study-nest/src/api/uploads/" . $safeName;
            $src_type = 'file';
        }

        // --- Insert DB record ---
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