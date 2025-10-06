<?php
/**
 * Meetings API (PDO + CORS + auto schema + course snapshot fields + CSV import)
 */

require_once __DIR__ . '/db.php'; // must set $pdo (PDO)

// ---------- CORS ----------
$origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Credentials: true');
header("Access-Control-Allow-Origin: $origin");
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}
if (session_status() !== PHP_SESSION_ACTIVE) {
  @session_start();
}

// ---------- Helpers ----------
function json_out($arr, $code = 200) {
  http_response_code($code);
  echo json_encode($arr, JSON_UNESCAPED_SLASHES);
  exit;
}
function body_json() {
  $raw = file_get_contents('php://input');
  if (!$raw) return [];
  $j = json_decode($raw, true);
  return is_array($j) ? $j : [];
}
function user_id() {
  return isset($_SESSION['user_id']) ? (int)$_SESSION['user_id'] : null;
}
function uid_short($bytes = 6) {
  return substr(bin2hex(random_bytes($bytes)), 0, $bytes * 2);
}
function normalize_datetime_local($s) {
  if (!$s) return null;
  $s = str_replace('T', ' ', trim((string)$s));
  if (preg_match('/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}$/', $s)) $s .= ':00';
  try {
    $dt = new DateTime($s);
    return $dt->format('Y-m-d H:i:s');
  } catch (Throwable $e) {
    return null;
  }
}
// Safe for PHP 7+: case-insensitive “ends with”
function path_ends_with($path, $suffix) {
  $path = strtolower(trim($path));
  $suffix = strtolower($suffix);
  return substr($path, -strlen($suffix)) === $suffix;
}

// ---------- Schema ----------
function ensure_schema(PDO $pdo) {
  $pdo->exec("
    CREATE TABLE IF NOT EXISTS meetings (
      id              VARCHAR(16)  PRIMARY KEY,
      title           VARCHAR(255) NOT NULL,
      course          VARCHAR(64)  NULL,
      course_title    VARCHAR(255) NULL,
      course_thumbnail VARCHAR(1024) NULL,
      created_by      INT UNSIGNED NULL,
      created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      status          ENUM('live','ended','scheduled') NOT NULL DEFAULT 'live',
      starts_at       DATETIME NULL,
      ends_at         DATETIME NULL,
      participants    INT UNSIGNED NOT NULL DEFAULT 1,
      INDEX idx_status (status),
      INDEX idx_created (created_at),
      INDEX idx_starts (starts_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  ");

  $pdo->exec("
    CREATE TABLE IF NOT EXISTS meeting_participants (
      id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      meeting_id   VARCHAR(16) NOT NULL,
      user_id      INT UNSIGNED NULL,
      session_id   VARCHAR(64) NULL,
      display_name VARCHAR(100) NULL,
      joined_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      left_at      TIMESTAMP NULL DEFAULT NULL,
      CONSTRAINT fk_mp_meeting FOREIGN KEY (meeting_id)
        REFERENCES meetings(id) ON DELETE CASCADE,
      INDEX idx_meeting (meeting_id),
      INDEX idx_user (user_id),
      INDEX idx_session (session_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  ");

  $pdo->exec("
    CREATE TABLE IF NOT EXISTS courses (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      course_code VARCHAR(32) NOT NULL,
      course_title VARCHAR(255) NOT NULL,
      department VARCHAR(120) NOT NULL,
      program VARCHAR(120) NOT NULL,
      course_thumbnail VARCHAR(512) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_department (department),
      KEY idx_program (program)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  ");

  $pdo->exec("
    CREATE TABLE IF NOT EXISTS tmp_courses (
      course_code      VARCHAR(32)  NOT NULL,
      course_title     VARCHAR(255) NOT NULL,
      department       VARCHAR(120) NOT NULL,
      program          VARCHAR(120) NOT NULL,
      course_thumbnail VARCHAR(512) NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  ");
}

// ---------- Helpers for courses ----------
function import_courses_from_csv(PDO $pdo, $filePath) {
  if (!file_exists($filePath)) throw new Exception("CSV file not found: $filePath");
  $pdo->exec("TRUNCATE tmp_courses");
  if (($handle = fopen($filePath, "r")) !== false) {
    fgetcsv($handle);
    $ins = $pdo->prepare("
      INSERT INTO tmp_courses (course_code, course_title, department, program, course_thumbnail)
      VALUES (?, ?, ?, ?, ?)
    ");
    while (($row = fgetcsv($handle)) !== false) {
      $row = array_map('trim', $row);
      if (!$row[0]) continue;
      $ins->execute($row);
    }
    fclose($handle);
  }
  $pdo->exec("
    INSERT INTO courses (course_code, course_title, department, program, course_thumbnail, created_at, updated_at)
    SELECT course_code, course_title, department, program, course_thumbnail, NOW(), NOW()
    FROM tmp_courses
  ");
}
function fetch_course_snapshot(PDO $pdo, $course_code) {
  if (!$course_code) return [null, null];
  $st = $pdo->prepare("SELECT course_title, course_thumbnail FROM courses WHERE course_code = ? LIMIT 1");
  $st->execute([$course_code]);
  $row = $st->fetch(PDO::FETCH_ASSOC);
  return $row ? [$row['course_title'] ?? null, $row['course_thumbnail'] ?? null] : [null, null];
}

// ---------- Routes ----------
try {
  ensure_schema($pdo);
  $path   = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
  $method = $_SERVER['REQUEST_METHOD'];
  error_log("🧩 Request path: $path");

  // GET list or single
  if ($method === 'GET' && basename($path) === 'meetings.php') {
    if (isset($_GET['id']) && $_GET['id'] !== '') {
      $st = $pdo->prepare("SELECT * FROM meetings WHERE id = ? LIMIT 1");
      $st->execute([$_GET['id']]);
      $room = $st->fetch(PDO::FETCH_ASSOC);
      if (!$room) json_out(['ok' => false, 'error' => 'not_found'], 404);
      if (!$room['course_title'] || !$room['course_thumbnail']) {
        [$ctitle, $cthumb] = fetch_course_snapshot($pdo, $room['course']);
        $room['course_title']     = $room['course_title']     ?: $ctitle;
        $room['course_thumbnail'] = $room['course_thumbnail'] ?: $cthumb;
      }
      $p = $pdo->prepare("SELECT display_name, user_id, joined_at
                          FROM meeting_participants
                          WHERE meeting_id = ? AND left_at IS NULL
                          ORDER BY id ASC");
      $p->execute([$room['id']]);
      $room['participants_list'] = $p->fetchAll(PDO::FETCH_ASSOC);
      json_out(['ok' => true, 'room' => $room]);
    }
    $st = $pdo->query("
      SELECT id, title, course, course_title, course_thumbnail,
             created_by, created_at, status, starts_at, participants
      FROM meetings
      WHERE status IN ('live','scheduled')
      ORDER BY (status='live') DESC,
               COALESCE(starts_at, created_at) ASC
      LIMIT 60
    ");
    $rows = $st->fetchAll(PDO::FETCH_ASSOC);
    foreach ($rows as &$r) {
      if (!$r['course_title'] || !$r['course_thumbnail']) {
        [$ctitle, $cthumb] = fetch_course_snapshot($pdo, $r['course']);
        if (!$r['course_title'])     $r['course_title'] = $ctitle;
        if (!$r['course_thumbnail']) $r['course_thumbnail'] = $cthumb;
      }
    }
    json_out(['ok' => true, 'rooms' => $rows]);
  }

  // POST create
  if ($method === 'POST' && basename($path) === 'meetings.php') {
    $u      = user_id();
    $b      = body_json();
    $title  = trim((string)($b['title'] ?? 'Quick Study Room'));
    $course = trim((string)($b['course'] ?? ''));
    $name   = trim((string)($b['display_name'] ?? ''));
    $starts = normalize_datetime_local($b['starts_at'] ?? null);
    $status = $starts ? 'scheduled' : 'live';
    [$course_title, $course_thumb] = fetch_course_snapshot($pdo, $course);
    $id = uid_short(6);
    $ins = $pdo->prepare("
      INSERT INTO meetings (id, title, course, course_title, course_thumbnail, created_by, status, starts_at, participants)
      VALUES (?, ?, NULLIF(?, ''), ?, ?, ?, ?, ?, 1)
    ");
    $ins->execute([$id, $title ?: 'Quick Study Room', $course, $course_title, $course_thumb, $u, $status, $starts]);
    $pp = $pdo->prepare("INSERT INTO meeting_participants (meeting_id, user_id, display_name, session_id)
                         VALUES (?, ?, NULLIF(?, ''), ?)");
    $pp->execute([$id, $u, $name, session_id()]);
    json_out(['ok' => true, 'id' => $id, 'status' => $status]);
  }

  // POST join
  if ($method === 'POST' && path_ends_with($path, '/meetings.php/join')) {
    $b = body_json();
    $id = $b['id'] ?? null;
    $name = trim((string)($b['display_name'] ?? ''));
    if (!$id) json_out(['ok' => false, 'error' => 'missing_id'], 400);

    $chk = $pdo->prepare("SELECT id, status FROM meetings WHERE id=? LIMIT 1");
    $chk->execute([$id]);
    $room = $chk->fetch(PDO::FETCH_ASSOC);
    if (!$room) json_out(['ok' => false, 'error' => 'not_found'], 404);
    if ($room['status'] === 'ended') json_out(['ok' => false, 'error' => 'already_ended'], 409);

    $u = user_id();
    $sess = session_id();
    $q = $pdo->prepare("SELECT 1 FROM meeting_participants
                        WHERE meeting_id=? AND left_at IS NULL
                        AND ((user_id IS NOT NULL AND user_id=?) OR (user_id IS NULL AND session_id=?))
                        LIMIT 1");
    $q->execute([$id, $u, $sess]);
    if (!$q->fetchColumn()) {
      $pp = $pdo->prepare("INSERT INTO meeting_participants (meeting_id, user_id, display_name, session_id)
                           VALUES (?, ?, NULLIF(?,''), ?)");
      $pp->execute([$id, $u, $name, $sess]);
      $pdo->prepare("UPDATE meetings SET participants=participants+1 WHERE id=?")->execute([$id]);
    }
    json_out(['ok' => true]);
  }

  // POST leave
  if ($method === 'POST' && path_ends_with($path, '/meetings.php/leave')) {
    $b = body_json();
    $id = $b['id'] ?? null;
    if (!$id) json_out(['ok' => false, 'error' => 'missing_id'], 400);
    $u = user_id();
    $sess = session_id();
    if ($u) {
      $p = $pdo->prepare("UPDATE meeting_participants SET left_at=NOW()
                          WHERE meeting_id=? AND user_id=? AND left_at IS NULL
                          ORDER BY id DESC LIMIT 1");
      $p->execute([$id, $u]);
    } else {
      $p = $pdo->prepare("UPDATE meeting_participants SET left_at=NOW()
                          WHERE meeting_id=? AND session_id=? AND left_at IS NULL
                          ORDER BY id DESC LIMIT 1");
      $p->execute([$id, $sess]);
    }
    $pdo->prepare("UPDATE meetings SET participants=GREATEST(participants-1,0) WHERE id=?")->execute([$id]);
    json_out(['ok' => true]);
  }

  // POST end
  if ($method === 'POST' && path_ends_with($path, '/meetings.php/end')) {
    $b = body_json();
    $id = $b['id'] ?? null;
    if (!$id) json_out(['ok' => false, 'error' => 'missing_id'], 400);
    $st = $pdo->prepare("SELECT id, created_by, status FROM meetings WHERE id=? LIMIT 1");
    $st->execute([$id]);
    $room = $st->fetch(PDO::FETCH_ASSOC);
    if (!$room) json_out(['ok' => false, 'error' => 'not_found'], 404);
    $uid = user_id();
    if ($room['created_by'] !== null && (int)$room['created_by'] !== (int)$uid)
      json_out(['ok' => false, 'error' => 'You Are Not Host'], 403);
    if ($room['status'] === 'ended') json_out(['ok' => true]);
    $pdo->prepare("UPDATE meetings SET status='ended', ends_at=NOW() WHERE id=?")->execute([$id]);
    json_out(['ok' => true]);
  }

  // POST import courses
  if ($method === 'POST' && path_ends_with($path, '/meetings.php/import-courses')) {
    try {
      $csvFile = __DIR__ . "/Datasets/UIU_Course_List.csv";
      import_courses_from_csv($pdo, $csvFile);
      json_out(['ok' => true, 'message' => 'Courses imported successfully']);
    } catch (Throwable $e) {
      json_out(['ok' => false, 'error' => 'import_failed', 'detail' => $e->getMessage()], 500);
    }
  }

  json_out(['ok' => false, 'error' => 'route_not_found', 'path' => $path], 404);

} catch (PDOException $e) {
  json_out(['ok' => false, 'error' => 'db_error', 'detail' => $e->getMessage()], 500);
} catch (Throwable $t) {
  json_out(['ok' => false, 'error' => 'server_error', 'detail' => $t->getMessage()], 500);
}
