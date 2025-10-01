<?php

/**
 * Meetings API (PDO + CORS + auto schema + course snapshot fields)
 *
 * Routes
 *  GET  /meetings.php                  -> list live + scheduled (with course_title & course_thumbnail)
 *  GET  /meetings.php?id=ROOM_ID       -> single meeting + participants
 *  POST /meetings.php                  -> create {title?, course?, starts_at?, display_name?}
 *  POST /meetings.php/join             -> join {id, display_name?}
 *  POST /meetings.php/end              -> end {id} (creator-only)  => sets status='ended' (kept in DB)
 */

require_once __DIR__ . '/db.php'; // must set $pdo (PDO)
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

function json_out($arr, $code = 200)
{
  http_response_code($code);
  echo json_encode($arr, JSON_UNESCAPED_SLASHES);
  exit;
}
function body_json()
{
  $raw = file_get_contents('php://input');
  if (!$raw) return [];
  $j = json_decode($raw, true);
  return is_array($j) ? $j : [];
}
function user_id()
{
  return isset($_SESSION['user_id']) ? (int)$_SESSION['user_id'] : null;
}
function uid_short($bytes = 6)
{
  return substr(bin2hex(random_bytes($bytes)), 0, $bytes * 2);
}
/** Accepts "YYYY-MM-DD HH:MM" or "YYYY-MM-DDTHH:MM" */
function normalize_datetime_local($s)
{
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

/** Ensure schema exists (idempotent) + add snapshot columns if missing */
function ensure_schema(PDO $pdo)
{
  // meetings
  $pdo->exec("
    CREATE TABLE IF NOT EXISTS meetings (
      id              VARCHAR(16)  PRIMARY KEY,
      title           VARCHAR(255) NOT NULL,
      course          VARCHAR(64)  NULL,            -- stores course_code (e.g., CSE220)
      course_title    VARCHAR(255) NULL,            -- snapshot so UI doesn't need joins
      course_thumbnail VARCHAR(1024) NULL,          -- snapshot image url
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

  // backwards-safe adds (MySQL 8 supports IF NOT EXISTS; ignore errors otherwise)
  try {
    $pdo->exec("ALTER TABLE meetings ADD COLUMN IF NOT EXISTS course_title VARCHAR(255) NULL");
  } catch (Throwable $e) {
  }
  try {
    $pdo->exec("ALTER TABLE meetings ADD COLUMN IF NOT EXISTS course_thumbnail VARCHAR(1024) NULL");
  } catch (Throwable $e) {
  }

  // meeting_participants
  $pdo->exec("
    CREATE TABLE IF NOT EXISTS meeting_participants (
      id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      meeting_id   VARCHAR(16) NOT NULL,
      user_id      INT UNSIGNED NULL,
      display_name VARCHAR(100) NULL,
      joined_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      left_at      TIMESTAMP NULL DEFAULT NULL,
      CONSTRAINT fk_mp_meeting FOREIGN KEY (meeting_id)
        REFERENCES meetings(id) ON DELETE CASCADE,
      INDEX idx_meeting (meeting_id),
      INDEX idx_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  ");
}

/** Look up course snapshot by code from courses table (optional) */
function fetch_course_snapshot(PDO $pdo, $course_code)
{
  if (!$course_code) return [null, null];
  $st = $pdo->prepare("SELECT course_title, course_thumbnail FROM courses WHERE course_code = ? LIMIT 1");
  $st->execute([$course_code]);
  $row = $st->fetch(PDO::FETCH_ASSOC);
  return $row ? [$row['course_title'] ?? null, $row['course_thumbnail'] ?? null] : [null, null];
}

try {
  ensure_schema($pdo);

  $path   = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
  $method = $_SERVER['REQUEST_METHOD'];

  /* ------------------------- GET ------------------------- */
  if ($method === 'GET' && basename($path) === 'meetings.php') {
    if (isset($_GET['id']) && $_GET['id'] !== '') {
      $st = $pdo->prepare("SELECT * FROM meetings WHERE id = ? LIMIT 1");
      $st->execute([$_GET['id']]);
      $room = $st->fetch(PDO::FETCH_ASSOC);
      if (!$room) json_out(['ok' => false, 'error' => 'not_found'], 404);

      // backfill course snapshot from courses table if missing
      if (!$room['course_title'] || !$room['course_thumbnail']) {
        [$ctitle, $cthumb] = fetch_course_snapshot($pdo, $room['course']);
        $room['course_title']     = $room['course_title']     ?: $ctitle;
        $room['course_thumbnail'] = $room['course_thumbnail'] ?: $cthumb;
      }

      $p = $pdo->prepare("SELECT display_name, user_id, joined_at, left_at
                          FROM meeting_participants
                          WHERE meeting_id = ?
                          ORDER BY id ASC");
      $p->execute([$room['id']]);
      $room['participants_list'] = $p->fetchAll(PDO::FETCH_ASSOC);

      json_out(['ok' => true, 'room' => $room]);
    }

    // list only live + scheduled; ended meetings are hidden from lobby/home
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

    // backfill snapshots if any row missed them (older rows)
    foreach ($rows as &$r) {
      if (!$r['course_title'] || !$r['course_thumbnail']) {
        [$ctitle, $cthumb] = fetch_course_snapshot($pdo, $r['course']);
        if (!$r['course_title'])     $r['course_title'] = $ctitle;
        if (!$r['course_thumbnail']) $r['course_thumbnail'] = $cthumb;
      }
    }
    unset($r);

    json_out(['ok' => true, 'rooms' => $rows]);
  }

  /* ------------------------- POST create ------------------------- */
  if ($method === 'POST' && basename($path) === 'meetings.php') {
    $u      = user_id(); // can be null (guest)
    $b      = body_json();
    $title  = trim((string)($b['title'] ?? 'Quick Study Room'));
    $course = trim((string)($b['course'] ?? '')); // course_code like "CSE220"
    $name   = trim((string)($b['display_name'] ?? ''));
    $starts = normalize_datetime_local($b['starts_at'] ?? null);
    $status = $starts ? 'scheduled' : 'live';
    if ($title === '') $title = 'Quick Study Room';

    // take snapshot of course title & thumbnail for UI cards
    [$course_title, $course_thumb] = fetch_course_snapshot($pdo, $course);

    $id = uid_short(6); // 12 hex (e.g., "4ca7b81ab8d6")
    $ins = $pdo->prepare("
      INSERT INTO meetings (id, title, course, course_title, course_thumbnail, created_by, status, starts_at, participants)
      VALUES (?, ?, NULLIF(?, ''), ?, ?, ?, ?, ?, 1)
    ");
    $ins->execute([$id, $title, $course, $course_title, $course_thumb, $u, $status, $starts]);

    // add creator as first participant (optional display name)
    $pp = $pdo->prepare("INSERT INTO meeting_participants (meeting_id, user_id, display_name) VALUES (?, ?, NULLIF(?, ''))");
    $pp->execute([$id, $u, $name]);

    json_out(['ok' => true, 'id' => $id, 'status' => $status]);
  }

  /* ------------------------- POST join ------------------------- */
  if ($method === 'POST' && preg_match('~/meetings\.php/join$~', $path)) {
    $b    = body_json();
    $id   = $b['id'] ?? null;
    $name = trim((string)($b['display_name'] ?? ''));
    if (!$id) json_out(['ok' => false, 'error' => 'missing_id'], 400);

    $chk = $pdo->prepare("SELECT id, status FROM meetings WHERE id=? LIMIT 1");
    $chk->execute([$id]);
    $room = $chk->fetch(PDO::FETCH_ASSOC);
    if (!$room) json_out(['ok' => false, 'error' => 'not_found'], 404);
    if ($room['status'] === 'ended') json_out(['ok' => false, 'error' => 'already_ended'], 409);

    $u = user_id();
    $pp = $pdo->prepare("INSERT INTO meeting_participants (meeting_id, user_id, display_name) VALUES (?, ?, NULLIF(?, ''))");
    $pp->execute([$id, $u, $name]);

    $upd = $pdo->prepare("UPDATE meetings SET participants = participants + 1 WHERE id=?");
    $upd->execute([$id]);

    json_out(['ok' => true]);
  }

  /* ------------------------- POST leave ------------------------- */
  if ($method === 'POST' && preg_match('~/meetings\.php/leave$~', $path)) {
    $b  = body_json();
    $id = $b['id'] ?? null;
    if (!$id) json_out(['ok' => false, 'error' => 'missing_id'], 400);

    // mark last open participant row as left
    $u = user_id();
    if ($u) {
      $p = $pdo->prepare("UPDATE meeting_participants
                      SET left_at = NOW()
                      WHERE meeting_id = ? AND user_id = ? AND left_at IS NULL
                      ORDER BY id DESC LIMIT 1");
      $p->execute([$id, $u]);
    }

    // decrement, but not below 0/1
    $pdo->prepare("UPDATE meetings SET participants = GREATEST(participants - 1, 0) WHERE id = ?")
      ->execute([$id]);

    json_out(['ok' => true]);
  }

  /* ------------------------- POST end (creator only) ------------------------- */
  if ($method === 'POST' && preg_match('~/meetings\.php/end$~', $path)) {
    $b  = body_json();
    $id = $b['id'] ?? null;
    if (!$id) json_out(['ok' => false, 'error' => 'missing_id'], 400);

    $st = $pdo->prepare("SELECT id, created_by, status FROM meetings WHERE id=? LIMIT 1");
    $st->execute([$id]);
    $room = $st->fetch(PDO::FETCH_ASSOC);
    if (!$room) json_out(['ok' => false, 'error' => 'not_found'], 404);

    // Only creator can end (if created_by IS NULL, allow anyone in dev)
    $uid = user_id();
    if ($room['created_by'] !== null && (int)$room['created_by'] !== (int)$uid) {
      json_out(['ok' => false, 'error' => 'forbidden_not_creator'], 403);
    }
    if ($room['status'] === 'ended') json_out(['ok' => true]); // already ended

    $up = $pdo->prepare("UPDATE meetings SET status='ended', ends_at=NOW() WHERE id=?");
    $up->execute([$id]);

    json_out(['ok' => true]);
  }

  json_out(['ok' => false, 'error' => 'route_not_found'], 404);
} catch (PDOException $e) {
  json_out(['ok' => false, 'error' => 'db_error', 'detail' => $e->getMessage()], 500);
} catch (Throwable $t) {
  json_out(['ok' => false, 'error' => 'server_error', 'detail' => $t->getMessage()], 500);
}
