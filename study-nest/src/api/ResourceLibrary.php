<?php
// ResourceLibrary.php

// --- CORS / headers (adjust origin to match your frontend) ---
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

// --- DB connection ---
$host    = "localhost";
$db_name = "studynest";
$user    = "root";
$pass    = "";
$charset = "utf8mb4";

$dsn = "mysql:host=$host;dbname=$db_name;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (Throwable $e) {
    echo json_encode(["status" => "error", "message" => "DB connection failed", "detail" => $e->getMessage()]);
    exit;
}

// --- Ensure bookmarks table exists (idempotent) ---
$pdo->exec("
    CREATE TABLE IF NOT EXISTS bookmarks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        resource_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY (user_id, resource_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
");

// ----------------------------------------------------
// GET — Fetch community/shared resources (exclude recordings)
// ----------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        // Shared feed should not show recordings by default
        // Use (kind IS NULL OR kind <> 'recording') to be robust with older rows
        $stmt = $pdo->query("SELECT * FROM resources WHERE (kind IS NULL OR kind <> 'recording') ORDER BY created_at DESC");
        $resources = $stmt->fetchAll();

        // If logged in, mark bookmarked resources
        if (!empty($_SESSION['user_id'])) {
            $uid = (int) $_SESSION['user_id'];
            $b = $pdo->prepare("SELECT resource_id FROM bookmarks WHERE user_id = ?");
            $b->execute([$uid]);
            $bookmarked = array_column($b->fetchAll(), 'resource_id');

            foreach ($resources as &$r) {
                $r['bookmarked'] = in_array((int)$r['id'], $bookmarked, true);
            }
        }

        echo json_encode(["status" => "success", "resources" => $resources]);
    } catch (Throwable $e) {
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
    exit;
}

// ----------------------------------------------------
// POST — Create resource, toggle bookmark, or share a recording
// ----------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    // --- Toggle Bookmark (add/remove) ---
    if (!empty($_POST['action']) && $_POST['action'] === 'toggle_bookmark') {
        if (empty($_SESSION['user_id'])) {
            echo json_encode(["status" => "error", "message" => "Not logged in"]);
            exit;
        }

        $user_id     = (int) $_SESSION['user_id'];
        $resource_id = (int) ($_POST['resource_id'] ?? 0);

        if (!$resource_id) {
            echo json_encode(["status" => "error", "message" => "Missing resource ID"]);
            exit;
        }

        try {
            $check = $pdo->prepare("SELECT id FROM bookmarks WHERE user_id = ? AND resource_id = ?");
            $check->execute([$user_id, $resource_id]);
            if ($check->fetch()) {
                $del = $pdo->prepare("DELETE FROM bookmarks WHERE user_id = ? AND resource_id = ?");
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

    // --- Share an existing personal recording to Shared Resources ---
    if (!empty($_POST['action']) && $_POST['action'] === 'share_recording') {
        if (empty($_SESSION['user_id'])) {
            echo json_encode(["status" => "error", "message" => "Not logged in"]);
            exit;
        }

        $user_id      = (int) $_SESSION['user_id'];
        $recording_id = (int) ($_POST['recording_id'] ?? 0);

        if (!$recording_id) {
            echo json_encode(["status" => "error", "message" => "Missing recording ID"]);
            exit;
        }

        try {
            // Pull the recording data from your recordings table
            // Expected columns: id, user_id, title, url, course, semester, tags, description, author, created_at
            $r = $pdo->prepare("
                SELECT id, user_id, title, url, course, semester, tags, description, author, created_at
                FROM recordings
                WHERE id = ?
                LIMIT 1
            ");
            $r->execute([$recording_id]);
            $rec = $r->fetch();

            if (!$rec) {
                echo json_encode(["status" => "error", "message" => "Recording not found"]);
                exit;
            }
            if ((int)$rec['user_id'] !== $user_id) {
                echo json_encode(["status" => "error", "message" => "You can only share your own recording"]);
                exit;
            }

            // Resolve author name (same policy as normal resource creation)
            $author = trim($rec['author'] ?? '');
            if ($author !== "Anonymous") {
                $stmt = $pdo->prepare("SELECT username FROM users WHERE id = ?");
                $stmt->execute([$user_id]);
                $realName = $stmt->fetchColumn();
                if ($realName) {
                    $author = $realName;
                }
            }
            if ($author === "") {
                $author = "Unknown";
            }

            // Insert a public copy into resources (kind='recording')
            $ins = $pdo->prepare("
                INSERT INTO resources
                  (title, kind, course, semester, tags, description, author, src_type, url, votes, bookmarks, flagged, created_at)
                VALUES
                  (:title, 'recording', :course, :semester, :tags, :description, :author, 'file', :url, 0, 0, 0, NOW())
            ");
            $ins->execute([
                ":title"       => $rec["title"] ?: "Recording",
                ":course"      => $rec["course"] ?: "",
                ":semester"    => $rec["semester"] ?: "",
                ":tags"        => $rec["tags"] ?: "",
                ":description" => $rec["description"] ?: "",
                ":author"      => $author,
                ":url"         => $rec["url"] ?: "",
            ]);

            $resource_id     = (int) $pdo->lastInsertId();
            $points_awarded  = 25;

            // Award points to sharer
            $pdo->prepare("UPDATE users SET points = COALESCE(points, 0) + ? WHERE id = ?")
                ->execute([$points_awarded, $user_id]);

            // Log in points history (create table beforehand in your schema)
            $pdo->prepare("
                INSERT INTO points_history (user_id, points, action_type, reference_id, description)
                VALUES (?, ?, 'recording_share', ?, ?)
            ")->execute([
                $user_id,
                $points_awarded,
                $resource_id,
                "Awarded {$points_awarded} points for sharing recording"
            ]);

            echo json_encode([
                "status"         => "success",
                "message"        => "Recording shared to Shared Resources. +{$points_awarded} points!",
                "points_awarded" => $points_awarded,
                "resource_id"    => $resource_id,
            ]);
        } catch (Throwable $e) {
            echo json_encode(["status" => "error", "message" => $e->getMessage()]);
        }
        exit;
    }

    // --- Add a new resource (normal upload or link) ---
    try {
        // Accept either form-data or raw JSON
        $data = $_POST ?: json_decode(file_get_contents("php://input"), true);

        if (empty($data['title']) || empty($data['course']) || empty($data['semester'])) {
            echo json_encode(["status" => "error", "message" => "Missing required fields"]);
            exit;
        }

        // Determine author
        $author = trim($data['author'] ?? '');
        if ($author !== "Anonymous" && !empty($_SESSION['user_id'])) {
            $stmt = $pdo->prepare("SELECT username FROM users WHERE id = ?");
            $stmt->execute([$_SESSION['user_id']]);
            $realName = $stmt->fetchColumn();
            if ($realName) {
                $author = $realName;
            }
        }
        if ($author === "") {
            $author = "Unknown";
        }

        // Handle upload or link
        $src_type = $data['src_type'] ?? 'link';
        $url      = trim($data['url'] ?? '');

        if ($src_type === 'file' && isset($_FILES['file'])) {
            $file = $_FILES['file'];
            if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
                echo json_encode(["status" => "error", "message" => "File upload error"]);
                exit;
            }

            // Validate MIME
            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            $mime  = finfo_file($finfo, $file['tmp_name']);
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
                'image/gif',
                'video/mp4',
                'video/webm',
                'video/quicktime'
            ];
            if (!in_array($mime, $allowed_mimes, true)) {
                echo json_encode(["status" => "error", "message" => "Invalid file type: $mime"]);
                exit;
            }

            // Persist file
            $uploadDir = __DIR__ . '/uploads';
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0775, true);
            }
            $ext       = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
            $safeName  = 'resource-' . uniqid() . '.' . $ext;
            $target    = $uploadDir . '/' . $safeName;

            if (!move_uploaded_file($file['tmp_name'], $target)) {
                echo json_encode(["status" => "error", "message" => "Failed to save file"]);
                exit;
            }

            $scheme  = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? "https://" : "http://";
            $host    = $_SERVER['HTTP_HOST'];
            $baseUrl = $scheme . $host;

            // Adjust this path to match your project structure
            $url      = $baseUrl . "/StudyNest/study-nest/src/api/uploads/" . $safeName;
            $src_type = 'file';
        }

        // Insert resource row
        $stmt = $pdo->prepare("
            INSERT INTO resources 
                (title, kind, course, semester, tags, description, author, src_type, url, votes, bookmarks, flagged, created_at)
            VALUES 
                (:title, :kind, :course, :semester, :tags, :description, :author, :src_type, :url, 0, 0, 0, NOW())
        ");
        $stmt->execute([
            ":title"       => $data["title"],
            ":kind"        => $data["kind"] ?? "other",
            ":course"      => $data["course"],
            ":semester"    => $data["semester"],
            ":tags"        => $data["tags"] ?? "",
            ":description" => $data["description"] ?? "",
            ":author"      => $author,
            ":src_type"    => $src_type,
            ":url"         => $url,
        ]);

        $resource_id = (int) $pdo->lastInsertId();

        // Award points if user is logged in (same policy as before)
        if (!empty($_SESSION['user_id'])) {
            $user_id        = (int) $_SESSION['user_id'];
            $points_awarded = 25;

            $pdo->prepare("UPDATE users SET points = COALESCE(points, 0) + ? WHERE id = ?")
                ->execute([$points_awarded, $user_id]);

            $pdo->prepare("
                INSERT INTO points_history (user_id, points, action_type, reference_id, description)
                VALUES (?, ?, 'resource_upload', ?, ?)
            ")->execute([
                $user_id,
                $points_awarded,
                $resource_id,
                "Awarded {$points_awarded} points for uploading resource: " . $data["title"]
            ]);

            echo json_encode([
                "status"         => "success",
                "message"        => "Resource added successfully. +{$points_awarded} points awarded!",
                "points_awarded" => $points_awarded,
                "resource_id"    => $resource_id
            ]);
            exit;
        }

        echo json_encode([
            "status"      => "success",
            "message"     => "Resource added successfully.",
            "resource_id" => $resource_id
        ]);
    } catch (Throwable $e) {
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
    exit;
}

// ----------------------------------------------------
// PUT — Update resource (vote / bookmarks count / flag)
// ----------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    try {
        $data = json_decode(file_get_contents("php://input"), true);
        $id   = $data['id'] ?? null;

        if (!$id) {
            echo json_encode(["status" => "error", "message" => "Missing resource ID"]);
            exit;
        }

        $fields = [];
        $params = [":id" => $id];

        foreach (['votes', 'bookmarks', 'flagged'] as $col) {
            if (isset($data[$col])) {
                $fields[]          = "$col = :$col";
                $params[":$col"]   = (int) $data[$col];
            }
        }

        if (!$fields) {
            echo json_encode(["status" => "error", "message" => "No valid update fields"]);
            exit;
        }

        $sql  = "UPDATE resources SET " . implode(", ", $fields) . " WHERE id = :id";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        echo json_encode(["status" => "success", "message" => "Resource updated"]);
    } catch (Throwable $e) {
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
    exit;
}

// ----------------------------------------------------
// Fallback for unsupported methods
// ----------------------------------------------------
echo json_encode(["status" => "error", "message" => "Invalid request method"]);
exit;
