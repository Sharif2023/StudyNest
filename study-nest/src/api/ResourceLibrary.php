<?php
/**
 * - GET  : Shared feed (public resources). Include recordings by default; exclude with ?exclude_recordings=1
 * - POST : toggle_bookmark | share_resource | share_recording | create (upload/link)
 * - PUT  : update resource counters (votes, bookmarks, flagged)
 *
 * Notes:
 * - CORS enabled for http://localhost:5173 (add more origins below if needed).
 * - Works with either recording schemas by COALESCE mapping:
 *     url         <- COALESCE(url, video_url)
 *     author      <- COALESCE(author, user_name, 'Unknown')
 *     created_at  <- COALESCE(created_at, recorded_at, NOW())
 */

////////////////////
// CORS + Headers //
////////////////////
$allowed_origins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    // add production origins here
];

$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
if (in_array($origin, $allowed_origins, true)) {
    header("Access-Control-Allow-Origin: $origin");
    header("Vary: Origin");
    header("Access-Control-Allow-Credentials: true");
}
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, X-Requested-With");
header("Content-Type: application/json");

// Preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

session_start();

//////////////////////
// Database Connect //
//////////////////////
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

///////////////////////
// Schema Bootstrap  //
///////////////////////

// bookmarks (per-user)
$pdo->exec("
CREATE TABLE IF NOT EXISTS bookmarks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    resource_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_user_resource (user_id, resource_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
");

// resources (shared + personal)
$pdo->exec("
CREATE TABLE IF NOT EXISTS resources (
    id                       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id                  INT UNSIGNED NULL,
    title                    VARCHAR(255) NOT NULL,
    kind                     VARCHAR(64) NULL,  -- e.g., book/slide/past paper/study guide/recording
    course                   VARCHAR(64) NULL,
    semester                 VARCHAR(64) NULL,
    tags                     VARCHAR(512) NULL,
    description              TEXT NULL,
    author                   VARCHAR(128) NULL,
    src_type                 VARCHAR(20) NULL,    -- 'file' or 'link'
    url                      TEXT NULL,           -- public URL to file or external link
    votes                    INT NOT NULL DEFAULT 0,
    bookmarks                INT NOT NULL DEFAULT 0,
    flagged                  TINYINT(1) NOT NULL DEFAULT 0,
    visibility               ENUM('public','private') NOT NULL DEFAULT 'public',
    shared_from_recording_id INT UNSIGNED NULL,
    shared_at                DATETIME NULL,
    created_at               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_kind (kind),
    KEY idx_course_semester (course, semester),
    KEY idx_visibility_kind_created (visibility, kind, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
");

// (Optional) recordings table NOT created here; we read from it. We tolerate either:
// A) id, user_id, title, url, course, semester, tags, description, author, created_at
// B) id, user_id, title, video_url, course, semester, description, user_name, recorded_at, duration, room_id

//////////////////////
// Utility helpers  //
//////////////////////
function current_user_id(): ?int {
    return !empty($_SESSION['user_id']) ? (int)$_SESSION['user_id'] : null;
}

function award_points(PDO $pdo, int $user_id, int $points, string $actionType, int $refId, string $desc): void {
    // users.points
    $stmt = $pdo->prepare("UPDATE users SET points = COALESCE(points, 0) + ? WHERE id = ?");
    $stmt->execute([$points, $user_id]);

    // points_history
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS points_history (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            points INT NOT NULL,
            action_type VARCHAR(64) NOT NULL,
            reference_id INT NULL,
            description VARCHAR(255) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");

    $stmt = $pdo->prepare("
        INSERT INTO points_history (user_id, points, action_type, reference_id, description)
        VALUES (?, ?, ?, ?, ?)
    ");
    $stmt->execute([$user_id, $points, $actionType, $refId, $desc]);
}

/////////////////////////
// Route: GET (Shared) //
/////////////////////////
/**
 * Return shared resources (public). Include recordings by default.
 * Exclude with ?exclude_recordings=1
 */
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $excludeRecordings = isset($_GET['exclude_recordings']) && $_GET['exclude_recordings'] === '1';

        $sql = "
            SELECT *
            FROM resources
            WHERE visibility = 'public'
        ";
        if ($excludeRecordings) {
            $sql .= " AND (kind IS NULL OR kind <> 'recording') ";
        }
        $sql .= " ORDER BY COALESCE(shared_at, created_at) DESC ";

        $stmt = $pdo->query($sql);
        $resources = $stmt->fetchAll();

        // mark bookmarks for the logged-in user
        $uid = current_user_id();
        if ($uid) {
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

//////////////////////////
// Route: POST (Mutate) //
//////////////////////////
if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    // Toggle bookmark
    if (!empty($_POST['action']) && $_POST['action'] === 'toggle_bookmark') {
        if (!current_user_id()) {
            echo json_encode(["status" => "error", "message" => "Not logged in"]);
            exit;
        }
        $user_id     = current_user_id();
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

    // Share existing personal resource (make it public)
    if (!empty($_POST['action']) && $_POST['action'] === 'share_resource') {
        if (!current_user_id()) {
            echo json_encode(["status" => "error", "message" => "Not logged in"]);
            exit;
        }
        $user_id     = current_user_id();
        $resource_id = (int)($_POST['resource_id'] ?? 0);

        if (!$resource_id) {
            echo json_encode(["status" => "error", "message" => "Missing resource ID"]);
            exit;
        }

        try {
            $q = $pdo->prepare("SELECT id, user_id, visibility FROM resources WHERE id = ? LIMIT 1");
            $q->execute([$resource_id]);
            $res = $q->fetch();

            if (!$res) {
                echo json_encode(["status" => "error", "message" => "Resource not found"]);
                exit;
            }
            if (!is_null($res['user_id']) && (int)$res['user_id'] !== $user_id) {
                echo json_encode(["status" => "error", "message" => "You can only share your own resource"]);
                exit;
            }
            if ($res['visibility'] === 'public') {
                echo json_encode(["status" => "success", "message" => "Already shared", "points_awarded" => 0]);
                exit;
            }

            $upd = $pdo->prepare("UPDATE resources SET visibility='public', shared_at = NOW() WHERE id = ?");
            $upd->execute([$resource_id]);

            $points = 15;
            award_points($pdo, $user_id, $points, 'resource_share', $resource_id, "Shared personal resource to public");

            echo json_encode([
                "status"         => "success",
                "message"        => "Resource is now public. +{$points} points!",
                "points_awarded" => $points,
                "resource_id"    => $resource_id
            ]);
        } catch (Throwable $e) {
            echo json_encode(["status" => "error", "message" => $e->getMessage()]);
        }
        exit;
    }

    // Share a recording to the shared feed (creates a public copy in resources)
    if (!empty($_POST['action']) && $_POST['action'] === 'share_recording') {
        if (!current_user_id()) {
            echo json_encode(["status" => "error", "message" => "Not logged in"]);
            exit;
        }
        $user_id      = current_user_id();
        $recording_id = (int) ($_POST['recording_id'] ?? 0);

        if (!$recording_id) {
            echo json_encode(["status" => "error", "message" => "Missing recording ID"]);
            exit;
        }

        try {
            // Try to read from recordings in a way that supports both schemas
            $r = $pdo->prepare("
                SELECT
                  id,
                  user_id,
                  title,
                  COALESCE(url, video_url)          AS url,
                  course,
                  semester,
                  -- tags may not exist in your recordings table; we safely return empty when missing
                  ''                                AS tags,
                  description,
                  COALESCE(author, user_name)       AS author,
                  COALESCE(created_at, recorded_at) AS created_at
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

            // Resolve author: if not Anonymous and user has username, prefer that
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

            $ins = $pdo->prepare("
                INSERT INTO resources
                  (user_id, title, kind, course, semester, tags, description, author, src_type, url,
                   votes, bookmarks, flagged, visibility, shared_from_recording_id, shared_at, created_at, updated_at)
                VALUES
                  (:user_id, :title, 'recording', :course, :semester, :tags, :description, :author, 'file', :url,
                   0, 0, 0, 'public', :rec_id, NOW(), NOW(), NOW())
            ");
            $ins->execute([
                ":user_id"     => $user_id,
                ":title"       => $rec["title"] ?: "Recording",
                ":course"      => $rec["course"] ?: "",
                ":semester"    => $rec["semester"] ?: "",
                ":tags"        => $rec["tags"] ?: "",
                ":description" => $rec["description"] ?: "",
                ":author"      => $author,
                ":url"         => $rec["url"] ?: "",
                ":rec_id"      => $rec["id"],
            ]);

            $resource_id    = (int) $pdo->lastInsertId();
            $points_awarded = 25;
            award_points($pdo, $user_id, $points_awarded, 'recording_share', $resource_id, "Shared a recording to public");

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

    // Create a new resource (upload or link)
    try {
        // Accept form-data or raw JSON
        $data = $_POST ?: json_decode(file_get_contents("php://input"), true);

        if (empty($data['title']) || empty($data['course']) || empty($data['semester'])) {
            echo json_encode(["status" => "error", "message" => "Missing required fields"]);
            exit;
        }

        $user_id = current_user_id();

        // Determine author
        $author = trim($data['author'] ?? '');
        if ($author !== "Anonymous" && $user_id) {
            $stmt = $pdo->prepare("SELECT username FROM users WHERE id = ?");
            $stmt->execute([$user_id]);
            $realName = $stmt->fetchColumn();
            if ($realName) $author = $realName;
        }
        if ($author === "") $author = "Unknown";

        // Visibility
        $visibility = in_array(($data['visibility'] ?? 'public'), ['public', 'private'], true)
            ? $data['visibility'] : 'public';

        // Upload vs link
        $src_type = $data['src_type'] ?? 'link';
        $url      = trim($data['url'] ?? '');

        if ($src_type === 'file' && isset($_FILES['file'])) {
            $file = $_FILES['file'];
            if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
                echo json_encode(["status" => "error", "message" => "File upload error"]);
                exit;
            }

            // MIME validation
            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            $mime  = finfo_file($finfo, $file['tmp_name']);
            finfo_close($finfo);
            $mime  = trim(preg_replace('/\s+/', '', $mime));

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

            // Save file
            $uploadDir = __DIR__ . '/uploads';
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0775, true);
            }
            $ext      = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
            $safeName = 'resource-' . uniqid('', true) . '.' . $ext;
            $target   = $uploadDir . '/' . $safeName;

            if (!move_uploaded_file($file['tmp_name'], $target)) {
                echo json_encode(["status" => "error", "message" => "Failed to save file"]);
                exit;
            }

            $scheme  = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? "https://" : "http://";
            $host    = $_SERVER['HTTP_HOST'];
            $baseUrl = $scheme . $host;

            // Adjust to your project path if needed
            $url      = $baseUrl . "/StudyNest/study-nest/src/api/uploads/" . $safeName;
            $src_type = 'file';
        }

        $stmt = $pdo->prepare("
            INSERT INTO resources
                (user_id, title, kind, course, semester, tags, description, author, src_type, url,
                 votes, bookmarks, flagged, visibility, created_at, updated_at)
            VALUES
                (:user_id, :title, :kind, :course, :semester, :tags, :description, :author, :src_type, :url,
                 0, 0, 0, :visibility, NOW(), NOW())
        ");
        $stmt->execute([
            ":user_id"     => $user_id,
            ":title"       => $data["title"],
            ":kind"        => $data["kind"] ?? "other",
            ":course"      => $data["course"],
            ":semester"    => $data["semester"],
            ":tags"        => $data["tags"] ?? "",
            ":description" => $data["description"] ?? "",
            ":author"      => $author,
            ":src_type"    => $src_type,
            ":url"         => $url,
            ":visibility"  => $visibility,
        ]);

        $resource_id = (int) $pdo->lastInsertId();

        // Points
        if ($user_id) {
            $points_awarded = ($visibility === 'public') ? 25 : 10;
            award_points(
                $pdo,
                $user_id,
                $points_awarded,
                'resource_upload',
                $resource_id,
                "Uploaded a resource: " . $data["title"]
            );

            echo json_encode([
                "status"         => "success",
                "message"        => "Resource added successfully." . ($points_awarded ? " +{$points_awarded} points!" : ""),
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

///////////////////////
// Route: PUT (Edit) //
///////////////////////
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
                $fields[]        = "$col = :$col";
                $params[":$col"] = (int) $data[$col];
            }
        }

        if (!$fields) {
            echo json_encode(["status" => "error", "message" => "No valid update fields"]);
            exit;
        }

        $sql  = "UPDATE resources SET " . implode(", ", $fields) . ", updated_at = NOW() WHERE id = :id";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        echo json_encode(["status" => "success", "message" => "Resource updated"]);
    } catch (Throwable $e) {
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
    exit;
}

///////////////////////////////
// Fallback (invalid method) //
///////////////////////////////
echo json_encode(["status" => "error", "message" => "Invalid request method"]);
exit;
