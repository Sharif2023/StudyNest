<?php
/**
 * ResourceLibrary.php — Cloudinary-enabled (UNSIGNED uploads)
 * -----------------------------------------------------------
 * - GET  : public feed (optionally exclude recordings)
 * - POST : toggle_bookmark | share_resource | share_recording | create (file→Cloudinary or link) | delete_resource
 * - PUT  : update counters (votes, bookmarks, flagged)
 *
 * Cloudinary: uses UNSIGNED uploads (no API secret in server).
 * Required:
 *   - CLOUDINARY_CLOUD_NAME  (or CLOUDINARY_URL from which cloud name will be parsed)
 *   - CLOUDINARY_UPLOAD_PRESET  (MUST be unsigned)
 */

////////////////////
// CORS + Headers //
////////////////////
$allowed_origins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    // add production origins here
];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowed_origins, true)) {
    header("Access-Control-Allow-Origin: $origin");
    header("Vary: Origin");
    header("Access-Control-Allow-Credentials: true");
}
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, X-Requested-With");
header("Content-Type: application/json");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

session_start();

///////////////////////////
// Cloudinary Config     //
///////////////////////////
// 1) Try explicit env var
$cloud_from_env = getenv('CLOUDINARY_CLOUD_NAME');
// 2) Else parse from CLOUDINARY_URL (e.g. cloudinary://<key>:<secret>@yourcloud)
$cloud_from_url = null;
if (!$cloud_from_env) {
    $url = getenv('CLOUDINARY_URL') ?: '';
    if ($url && preg_match('~@([a-zA-Z0-9_-]+)~', $url, $m)) {
        $cloud_from_url = $m[1];
    }
}
// 3) Hard fallback (your provided value)
$cloud_hard_fallback = 'doyi7vchh';

// Final config
$CLOUDINARY_CLOUD_NAME    = $cloud_from_env ?: ($cloud_from_url ?: $cloud_hard_fallback);
$CLOUDINARY_UPLOAD_PRESET = getenv('CLOUDINARY_UPLOAD_PRESET') ?: 'resources';
$CLOUDINARY_ENDPOINT      = "https://api.cloudinary.com/v1_1/{$CLOUDINARY_CLOUD_NAME}/auto/upload";

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
try { $pdo = new PDO($dsn, $user, $pass, $options); }
catch (Throwable $e) {
    echo json_encode(["status"=>"error","message"=>"DB connection failed","detail"=>$e->getMessage()]);
    exit;
}

///////////////////////
// Schema Bootstrap  //
///////////////////////
// Bookmarks
$pdo->exec("
CREATE TABLE IF NOT EXISTS bookmarks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  resource_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_user_resource (user_id, resource_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
");

// Resources — fixed schema (no stray semicolon after visibility)
$pdo->exec("
CREATE TABLE IF NOT EXISTS resources (
  id                       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id                  INT UNSIGNED NULL,
  title                    VARCHAR(255) NOT NULL,
  kind                     VARCHAR(64) NULL,
  course                   VARCHAR(64) NULL,
  semester                 VARCHAR(64) NULL,
  tags                     VARCHAR(512) NULL,
  description              TEXT NULL,
  author                   VARCHAR(128) NULL,
  src_type                 VARCHAR(20) NULL,      -- 'file' | 'link'
  url                      TEXT NULL,             -- Cloudinary secure_url OR external link

  cloudinary_public_id     VARCHAR(255) NULL,
  cloudinary_resource_type VARCHAR(20)  NULL,     -- image | video | raw
  cloudinary_version       BIGINT       NULL,
  cloudinary_bytes         BIGINT       NULL,

  votes                    INT NOT NULL DEFAULT 0,
  bookmarks                INT NOT NULL DEFAULT 0,
  flagged                  TINYINT(1) NOT NULL DEFAULT 0,
  visibility               ENUM('public','private') NOT NULL DEFAULT 'private',
  shared_from_recording_id INT UNSIGNED NULL,
  shared_at                DATETIME NULL,
  created_at               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_kind (kind),
  KEY idx_course_semester (course, semester),
  KEY idx_visibility_kind_created (visibility, kind, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
");

// --- Best-effort column backfill for existing installs (prevents 42S22) ---
function ensureColumn(PDO $pdo, string $table, string $column, string $definition): void {
    $stmt = $pdo->prepare("
        SELECT COUNT(*) FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?
    ");
    $stmt->execute([$table, $column]);
    $exists = (int)$stmt->fetchColumn() > 0;
    if (!$exists) {
        $pdo->exec("ALTER TABLE `$table` ADD COLUMN $column $definition");
    }
}

// Backfill Cloudinary and sharing columns if missing
try {
    ensureColumn($pdo, 'resources', 'cloudinary_public_id',     "VARCHAR(255) NULL");
    ensureColumn($pdo, 'resources', 'cloudinary_resource_type', "VARCHAR(20) NULL");
    ensureColumn($pdo, 'resources', 'cloudinary_version',       "BIGINT NULL");
    ensureColumn($pdo, 'resources', 'cloudinary_bytes',         "BIGINT NULL");
    ensureColumn($pdo, 'resources', 'shared_from_recording_id', "INT UNSIGNED NULL");
    ensureColumn($pdo, 'resources', 'shared_at',                "DATETIME NULL");
    // If an older install had visibility default wrong, try to fix to 'private'
    $pdo->exec("ALTER TABLE `resources` MODIFY visibility ENUM('public','private') NOT NULL DEFAULT 'private'");
} catch (Throwable $e) {
    // Non-fatal; continues even if ALTER fails (e.g., permissions)
}

//////////////////////
// Utility helpers  //
//////////////////////
function current_user_id(): ?int {
    return !empty($_SESSION['user_id']) ? (int)$_SESSION['user_id'] : null;
}
function award_points(PDO $pdo, int $user_id, int $points, string $actionType, int $refId, string $desc): void {
    $pdo->prepare("UPDATE users SET points = COALESCE(points, 0) + ? WHERE id = ?")->execute([$points, $user_id]);
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
    $pdo->prepare("
      INSERT INTO points_history (user_id, points, action_type, reference_id, description)
      VALUES (?, ?, ?, ?, ?)
    ")->execute([$user_id, $points, $actionType, $refId, $desc]);
}

/** Upload local file to Cloudinary via UNSIGNED preset */
function cloudinary_upload(string $endpoint, string $unsigned_preset, string $tmpPath, ?string $filename=null): array {
    $ch = curl_init();
    $cfile = new CURLFile($tmpPath, mime_content_type($tmpPath), $filename ?: basename($tmpPath));
    $payload = [
        'upload_preset' => $unsigned_preset,
        'file'          => $cfile,
        'folder'        => 'resources',
    ];
    curl_setopt_array($ch, [
        CURLOPT_URL            => $endpoint,
        CURLOPT_POST           => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POSTFIELDS     => $payload,
        CURLOPT_TIMEOUT        => 60,
    ]);
    $resp = curl_exec($ch);
    if ($resp === false) {
        $err = curl_error($ch);
        curl_close($ch);
        throw new RuntimeException("Cloudinary upload failed: $err");
    }
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $json = json_decode($resp, true);
    if ($status >= 400 || !is_array($json) || empty($json['secure_url'])) {
        $msg = is_array($json) && !empty($json['error']['message']) ? $json['error']['message'] : 'Unknown Cloudinary error';
        throw new RuntimeException("Cloudinary error ($status): " . $msg);
    }
    return [
        'secure_url'    => $json['secure_url'],
        'public_id'     => $json['public_id'] ?? null,
        'resource_type' => $json['resource_type'] ?? null,
        'bytes'         => $json['bytes'] ?? null,
        'version'       => $json['version'] ?? null,
    ];
}

/////////////////////////
// GET — public feed  //
/////////////////////////
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $excludeRecordings = isset($_GET['exclude_recordings']) && $_GET['exclude_recordings'] === '1';
        $sql = "SELECT * FROM resources WHERE visibility='public' ";
        if ($excludeRecordings) $sql .= "AND (kind IS NULL OR kind <> 'recording') ";
        $sql .= "ORDER BY COALESCE(shared_at, created_at) DESC";
        $rows = $pdo->query($sql)->fetchAll();

        $uid = current_user_id();
        if ($uid) {
            $b = $pdo->prepare("SELECT resource_id FROM bookmarks WHERE user_id=?");
            $b->execute([$uid]);
            $bookmarked = array_column($b->fetchAll(), 'resource_id');
            foreach ($rows as &$r) $r['bookmarked'] = in_array((int)$r['id'], $bookmarked, true);
        }
        echo json_encode(["status"=>"success","resources"=>$rows]);
    } catch (Throwable $e) {
        echo json_encode(["status"=>"error","message"=>$e->getMessage()]);
    }
    exit;
}

//////////////////////////
// POST — Mutations     //
//////////////////////////
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    // Toggle bookmark
    if ($action === 'toggle_bookmark') {
        if (!current_user_id()) { echo json_encode(["status"=>"error","message"=>"Not logged in"]); exit; }
        $uid = current_user_id();
        $rid = (int)($_POST['resource_id'] ?? 0);
        if (!$rid) { echo json_encode(["status"=>"error","message"=>"Missing resource ID"]); exit; }
        try {
            $q = $pdo->prepare("SELECT id FROM bookmarks WHERE user_id=? AND resource_id=?");
            $q->execute([$uid, $rid]);
            if ($q->fetch()) {
                $pdo->prepare("DELETE FROM bookmarks WHERE user_id=? AND resource_id=?")->execute([$uid, $rid]);
                echo json_encode(["status"=>"success","action"=>"removed"]); exit;
            } else {
                $pdo->prepare("INSERT INTO bookmarks (user_id, resource_id) VALUES (?,?)")->execute([$uid, $rid]);
                echo json_encode(["status"=>"success","action"=>"added"]); exit;
            }
        } catch (Throwable $e) {
            echo json_encode(["status"=>"error","message"=>$e->getMessage()]); exit;
        }
    }

    // Delete a personal resource (ownership required)
    if ($action === 'delete_resource') {
        if (!current_user_id()) { echo json_encode(["status"=>"error","message"=>"Not logged in"]); exit; }
        $uid = current_user_id();
        $rid = (int)($_POST['resource_id'] ?? 0);
        if (!$rid) { echo json_encode(["status"=>"error","message"=>"Missing resource ID"]); exit; }
        try {
            $q = $pdo->prepare("SELECT id,user_id FROM resources WHERE id=? LIMIT 1");
            $q->execute([$rid]);
            $res = $q->fetch();
            if (!$res) { echo json_encode(["status"=>"error","message"=>"Resource not found"]); exit; }
            if (!is_null($res['user_id']) && (int)$res['user_id'] !== $uid) {
                echo json_encode(["status"=>"error","message"=>"You can only delete your own resource"]); exit;
            }
            // Note: With unsigned uploads we cannot delete the actual Cloudinary asset server-side here.
            $pdo->prepare("DELETE FROM resources WHERE id=?")->execute([$rid]);
            $pdo->prepare("DELETE FROM bookmarks WHERE resource_id=?")->execute([$rid]); // clean up
            echo json_encode(["status"=>"success","message"=>"Resource deleted"]);
        } catch (Throwable $e) {
            echo json_encode(["status"=>"error","message"=>$e->getMessage()]);
        }
        exit;
    }

    // Share personal resource → public
    if ($action === 'share_resource') {
        if (!current_user_id()) { echo json_encode(["status"=>"error","message"=>"Not logged in"]); exit; }
        $uid = current_user_id();
        $rid = (int)($_POST['resource_id'] ?? 0);
        if (!$rid) { echo json_encode(["status"=>"error","message"=>"Missing resource ID"]); exit; }
        try {
            $q = $pdo->prepare("SELECT id,user_id,visibility FROM resources WHERE id=? LIMIT 1");
            $q->execute([$rid]);
            $res = $q->fetch();
            if (!$res) { echo json_encode(["status"=>"error","message"=>"Resource not found"]); exit; }
            if (!is_null($res['user_id']) && (int)$res['user_id'] !== $uid) {
                echo json_encode(["status"=>"error","message"=>"You can only share your own resource"]); exit;
            }
            if ($res['visibility'] === 'public') {
                echo json_encode(["status"=>"success","message"=>"Already shared","points_awarded"=>0]); exit;
            }
            $pdo->prepare("UPDATE resources SET visibility='public', shared_at=NOW() WHERE id=?")->execute([$rid]);
            $points = 15; award_points($pdo, $uid, $points, 'resource_share', $rid, "Shared personal resource");
            echo json_encode([
                "status"=>"success",
                "message"=>"Resource is now public. +{$points} points!",
                "points_awarded"=>$points,
                "resource_id"=>$rid
            ]);
        } catch (Throwable $e) {
            echo json_encode(["status"=>"error","message"=>$e->getMessage()]);
        }
        exit;
    }

    // Share a recording → copy into public resources (explicit only; never automatic)
    if ($action === 'share_recording') {
        if (!current_user_id()) { echo json_encode(["status"=>"error","message"=>"Not logged in"]); exit; }
        $uid = current_user_id();
        $rec_id = (int)($_POST['recording_id'] ?? 0);
        if (!$rec_id) { echo json_encode(["status"=>"error","message"=>"Missing recording ID"]); exit; }
        try {
            $r = $pdo->prepare("
              SELECT id,user_id,title,COALESCE(url,video_url) AS url,course,semester,
                     '' AS tags, description, COALESCE(author,user_name) AS author,
                     COALESCE(created_at, recorded_at) AS created_at
              FROM recordings WHERE id=? LIMIT 1
            ");
            $r->execute([$rec_id]);
            $rec = $r->fetch();
            if (!$rec) { echo json_encode(["status"=>"error","message"=>"Recording not found"]); exit; }
            if ((int)$rec['user_id'] !== $uid) { echo json_encode(["status"=>"error","message"=>"You can only share your own recording"]); exit; }

            $author = trim($rec['author'] ?? '');
            if ($author !== "Anonymous") {
                $u = $pdo->prepare("SELECT username FROM users WHERE id=?");
                $u->execute([$uid]);
                $rn = $u->fetchColumn();
                if ($rn) $author = $rn;
            }
            if ($author === "") $author = "Unknown";

            $ins = $pdo->prepare("
              INSERT INTO resources
                (user_id,title,kind,course,semester,tags,description,author,src_type,url,
                 cloudinary_public_id,cloudinary_resource_type,cloudinary_version,cloudinary_bytes,
                 votes,bookmarks,flagged,visibility,shared_from_recording_id,shared_at,created_at,updated_at)
              VALUES
                (:user_id,:title,'recording',:course,:semester,:tags,:description,:author,'file',:url,
                 NULL,NULL,NULL,NULL,
                 0,0,0,'public',:rec_id,NOW(),NOW(),NOW())
            ");
            $ins->execute([
                ":user_id"=>$uid, ":title"=>$rec['title'] ?: 'Recording',
                ":course"=>$rec['course'] ?: '', ":semester"=>$rec['semester'] ?: '',
                ":tags"=>$rec['tags'] ?: '', ":description"=>$rec['description'] ?: '',
                ":author"=>$author, ":url"=>$rec['url'] ?: '', ":rec_id"=>$rec['id'],
            ]);
            $rid = (int)$pdo->lastInsertId();
            $points = 25; award_points($pdo, $uid, $points, 'recording_share', $rid, "Shared a recording");
            echo json_encode([
                "status"=>"success",
                "message"=>"Recording shared. +{$points} points!",
                "points_awarded"=>$points,
                "resource_id"=>$rid
            ]);
        } catch (Throwable $e) {
            echo json_encode(["status"=>"error","message"=>$e->getMessage()]);
        }
        exit;
    }

    // Create resource (file→Cloudinary or external link). Default visibility='private'.
    try {
        $data = $_POST ?: json_decode(file_get_contents("php://input"), true) ?: [];
        if (empty($data['title']) || empty($data['course']) || empty($data['semester'])) {
            echo json_encode(["status"=>"error","message"=>"Missing required fields"]); exit;
        }

        $uid = current_user_id();
        $author = trim($data['author'] ?? '');
        if ($author !== "Anonymous" && $uid) {
            $s = $pdo->prepare("SELECT username FROM users WHERE id=?");
            $s->execute([$uid]);
            $rn = $s->fetchColumn();
            if ($rn) $author = $rn;
        }
        if ($author === "") $author = "Unknown";

        $visibility = in_array(($data['visibility'] ?? 'private'), ['public','private'], true) ? $data['visibility'] : 'private';
        $kind     = $data['kind'] ?? 'other';
        $course   = $data['course'];
        $semester = $data['semester'];
        $tags     = $data['tags'] ?? '';
        $desc     = $data['description'] ?? '';

        $src_type = $data['src_type'] ?? (isset($_FILES['file']) ? 'file' : 'link');
        $url      = trim($data['url'] ?? '');

        $c_public_id = $c_type = $c_version = $c_bytes = null;

        if ($src_type === 'file') {
            if (!isset($_FILES['file']) || ($_FILES['file']['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
                echo json_encode(["status"=>"error","message"=>"File upload error"]); exit;
            }
            // Validate Cloudinary config
            if (!$CLOUDINARY_CLOUD_NAME || !$CLOUDINARY_UPLOAD_PRESET) {
                echo json_encode(["status"=>"error","message"=>"Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME and CLOUDINARY_UPLOAD_PRESET (unsigned)."]); exit;
            }
            // Upload
            $tmp  = $_FILES['file']['tmp_name'];
            $name = $_FILES['file']['name'];
            $uploaded    = cloudinary_upload($CLOUDINARY_ENDPOINT, $CLOUDINARY_UPLOAD_PRESET, $tmp, $name);
            $url         = $uploaded['secure_url'];
            $c_public_id = $uploaded['public_id'];
            $c_type      = $uploaded['resource_type'];
            $c_version   = $uploaded['version'];
            $c_bytes     = $uploaded['bytes'];
            $src_type    = 'file';
        } else {
            if ($url === '') { echo json_encode(["status"=>"error","message"=>"Missing link URL"]); exit; }
        }

        $stmt = $pdo->prepare("
          INSERT INTO resources
            (user_id,title,kind,course,semester,tags,description,author,
             src_type,url,
             cloudinary_public_id,cloudinary_resource_type,cloudinary_version,cloudinary_bytes,
             votes,bookmarks,flagged,visibility,created_at,updated_at)
          VALUES
            (:user_id,:title,:kind,:course,:semester,:tags,:description,:author,
             :src_type,:url,
             :c_pid,:c_type,:c_ver,:c_bytes,
             0,0,0,:visibility,NOW(),NOW())
        ");
        $stmt->execute([
            ":user_id"=>$uid, ":title"=>$data['title'], ":kind"=>$kind, ":course"=>$course, ":semester"=>$semester,
            ":tags"=>$tags, ":description"=>$desc, ":author"=>$author,
            ":src_type"=>$src_type, ":url"=>$url,
            ":c_pid"=>$c_public_id, ":c_type"=>$c_type, ":c_ver"=>$c_version, ":c_bytes"=>$c_bytes,
            ":visibility"=>$visibility,
        ]);
        $rid = (int)$pdo->lastInsertId();

        if ($uid) {
            $points = ($visibility === 'public') ? 25 : 10;
            award_points($pdo, $uid, $points, 'resource_upload', $rid, "Uploaded resource: ".$data['title']);
            echo json_encode([
                "status"=>"success",
                "message"=>"Resource added successfully. +{$points} points!",
                "points_awarded"=>$points,
                "resource_id"=>$rid
            ]); exit;
        }
        echo json_encode(["status"=>"success","message"=>"Resource added successfully.","resource_id"=>$rid]);
    } catch (Throwable $e) {
        echo json_encode(["status"=>"error","message"=>$e->getMessage()]);
    }
    exit;
}

///////////////////////
// PUT — Update row  //
///////////////////////
if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    try {
        $data = json_decode(file_get_contents("php://input"), true);
        $id   = $data['id'] ?? null;
        if (!$id) { echo json_encode(["status"=>"error","message"=>"Missing resource ID"]); exit; }
        $fields = []; $params = [":id"=>$id];
        foreach (['votes','bookmarks','flagged'] as $col) {
            if (isset($data[$col])) { $fields[]="$col = :$col"; $params[":$col"]=(int)$data[$col]; }
        }
        if (!$fields) { echo json_encode(["status"=>"error","message"=>"No valid update fields"]); exit; }
        $sql = "UPDATE resources SET ".implode(', ', $fields).", updated_at=NOW() WHERE id=:id";
        $pdo->prepare($sql)->execute($params);
        echo json_encode(["status"=>"success","message"=>"Resource updated"]);
    } catch (Throwable $e) {
        echo json_encode(["status"=>"error","message"=>$e->getMessage()]);
    }
    exit;
}

///////////////////////////////
// Fallback (invalid method) //
///////////////////////////////
echo json_encode(["status"=>"error","message"=>"Invalid request method"]);
exit;
