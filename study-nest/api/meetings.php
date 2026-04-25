<?php
/**
 * Meetings API (PDO + CORS + auto schema + course snapshot fields + CSV import)
 */

require_once __DIR__ . '/db.php'; // Provides $pdo, CORS headers, and session_start()
require_once __DIR__ . '/auth.php'; // Provides JWT validation

// ---------- Helpers ----------
function json_out($arr, $code = 200)
{
  http_response_code($code);
  echo json_encode($arr, JSON_UNESCAPED_SLASHES);
  exit;
}
function body_json()
{
  $raw = file_get_contents('php://input');
  if (!$raw)
    return [];
  $j = json_decode($raw, true);
  return is_array($j) ? $j : [];
}
function user_id()
{
  return current_user_id();
}
function uid_short($bytes = 6)
{
  return substr(bin2hex(random_bytes($bytes)), 0, $bytes * 2);
}
function normalize_datetime_local($s)
{
  if (!$s)
    return null;
  $s = str_replace('T', ' ', trim((string) $s));
  if (preg_match('/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}$/', $s))
    $s .= ':00';
  try {
    $dt = new DateTime($s);
    return $dt->format('Y-m-d H:i:s');
  } catch (Throwable $e) {
    return null;
  }
}
// Safe for PHP 7+: case-insensitive “ends with”
function path_ends_with($path, $suffix)
{
  $path = strtolower(trim($path));
  $suffix = strtolower($suffix);
  return substr($path, -strlen($suffix)) === $suffix;
}


// ---------- Helpers for courses ----------
function import_courses_from_csv(PDO $pdo, $filePath)
{
  if (!file_exists($filePath))
    throw new Exception("CSV file not found: $filePath");
  $pdo->exec("TRUNCATE TABLE tmp_courses");
  if (($handle = fopen($filePath, "r")) !== false) {
    fgetcsv($handle);
    $ins = $pdo->prepare("
      INSERT INTO tmp_courses (course_code, course_title, department, program, course_thumbnail)
      VALUES (?, ?, ?, ?, ?)
    ");
    while (($row = fgetcsv($handle)) !== false) {
      $row = array_map('trim', $row);
      if (!$row[0])
        continue;
      $ins->execute($row);
    }
    fclose($handle);
  }
  $pdo->exec("
    INSERT INTO courses (course_code, course_title, department, program, course_thumbnail, created_at, updated_at)
    SELECT course_code, course_title, department, program, course_thumbnail, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    FROM tmp_courses
  ");
}
function fetch_course_snapshot(PDO $pdo, $course_code)
{
  if (!$course_code)
    return [null, null];
  $st = $pdo->prepare("SELECT course_title, course_thumbnail FROM courses WHERE course_code = ? LIMIT 1");
  $st->execute([$course_code]);
  $row = $st->fetch(PDO::FETCH_ASSOC);
  return $row ? [$row['course_title'] ?? null, $row['course_thumbnail'] ?? null] : [null, null];
}

// ---------- Routes ----------
try {
  $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
  $method = $_SERVER['REQUEST_METHOD'];
  error_log("🧩 Request path: $path");

  // GET list or single
  if ($method === 'GET' && basename($path) === 'meetings.php') {
    if (isset($_GET['id']) && $_GET['id'] !== '') {
      $st = $pdo->prepare("SELECT * FROM meetings WHERE id = ? LIMIT 1");
      $st->execute([$_GET['id']]);
      $room = $st->fetch(PDO::FETCH_ASSOC);
      if (!$room)
        json_out(['ok' => false, 'error' => 'not_found'], 404);
      if (!$room['course_title'] || !$room['course_thumbnail']) {
        [$ctitle, $cthumb] = fetch_course_snapshot($pdo, $room['course']);
        $room['course_title'] = $room['course_title'] ?: $ctitle;
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
        AND (status <> 'live' OR participants > 0)
      ORDER BY (status='live') DESC,
               COALESCE(starts_at, created_at) ASC
      LIMIT 60
    ");
    $rows = $st->fetchAll(PDO::FETCH_ASSOC);
    foreach ($rows as &$r) {
      if (!$r['course_title'] || !$r['course_thumbnail']) {
        [$ctitle, $cthumb] = fetch_course_snapshot($pdo, $r['course']);
        if (!$r['course_title'])
          $r['course_title'] = $ctitle;
        if (!$r['course_thumbnail'])
          $r['course_thumbnail'] = $cthumb;
      }
    }
    json_out(['ok' => true, 'rooms' => $rows]);
  }

  // POST create
  if ($method === 'POST' && basename($path) === 'meetings.php') {
    $u = user_id();
    $b = body_json();
    $title = trim((string) ($b['title'] ?? 'Quick Study Room'));
    $course = trim((string) ($b['course'] ?? ''));
    $name = trim((string) ($b['display_name'] ?? ''));
    $starts = normalize_datetime_local($b['starts_at'] ?? null);
    $status = $starts ? 'scheduled' : 'live';
    [$course_title, $course_thumb] = fetch_course_snapshot($pdo, $course);
    $id = uid_short(6);

    $creatorSess = $u ? null : session_id();

    // Start transaction to avoid partial creation
    $pdo->beginTransaction();
    try {
      $ins = $pdo->prepare("
        INSERT INTO meetings (id, title, course, course_title, course_thumbnail, created_by, status, starts_at, participants, creator_session_id)
        VALUES (?, ?, NULLIF(?, ''), ?, ?, ?, ?, ?, 1, ?)
      ");
      $ins->execute([$id, $title ?: 'Quick Study Room', $course, $course_title, $course_thumb, $u, $status, $starts, $creatorSess]);

      $pp = $pdo->prepare("INSERT INTO meeting_participants (meeting_id, user_id, display_name, session_id)
                           VALUES (?, ?, NULLIF(?, ''), ?)");
      $pp->execute([$id, $u, $name, session_id()]);

      $respData = ['ok' => true, 'id' => $id, 'status' => $status, 'pointsAwarded' => 0];

      // Award 30 points for creating a meeting (only for logged-in users)
      if ($u) {
        $newPointsTotal = awardPoints($pdo, $u, 30, 'meeting_created', $id, "Created meeting: " . ($title ?: 'Quick Study Room'));
        
        if ($newPointsTotal !== false) {
            $respData['pointsAwarded'] = 30;
            $respData['newPoints'] = $newPointsTotal;
        }

        // Proactive Notification: Notify other users interested in this course
        if ($course) {
            // Find users who have participated in meetings for this course OR uploaded resources for it
            // Exclude the creator ($u)
            $notifStmt = $pdo->prepare("
                SELECT DISTINCT u.student_id 
                FROM users u
                WHERE u.id <> ? 
                  AND (
                    u.id IN (SELECT user_id FROM meeting_participants WHERE meeting_id IN (SELECT id FROM meetings WHERE course = ?))
                    OR u.id IN (SELECT user_id FROM resources WHERE course = ?)
                    OR u.id IN (SELECT user_id FROM notes WHERE course = ?)
                  )
                LIMIT 50
            ");
            $notifStmt->execute([$u, $course, $course, $course]);
            $targets = $notifStmt->fetchAll(PDO::FETCH_COLUMN);

            if ($targets) {
                $n_title = "📚 New Study Room for {$course}";
                $n_msg = "A new room \"{$title}\" just started. Join your peers!";
                $n_link = "/rooms";
                
                $n_ins = $pdo->prepare("INSERT INTO notifications (student_id, title, message, link, type, reference_id) VALUES (?, ?, ?, ?, 'room_alert', ?)");
                foreach ($targets as $target_sid) {
                    $n_ins->execute([$target_sid, $n_title, $n_msg, $n_link, $id]);
                }
            }
        }
      }

      $pdo->commit();
      json_out($respData);

    } catch (Throwable $e) {
      $pdo->rollBack();
      throw $e; // Caught by the global catch block below
    }
  }

  // POST join
  if ($method === 'POST' && path_ends_with($path, '/meetings.php/join')) {
    $b = body_json();
    $id = $b['id'] ?? null;
    $name = trim((string) ($b['display_name'] ?? ''));
    if (!$id)
      json_out(['ok' => false, 'error' => 'missing_id'], 400);

    $chk = $pdo->prepare("SELECT id, status FROM meetings WHERE id=? LIMIT 1");
    $chk->execute([$id]);
    $room = $chk->fetch(PDO::FETCH_ASSOC);
    if (!$room)
      json_out(['ok' => false, 'error' => 'not_found'], 404);
    if ($room['status'] === 'ended')
      json_out(['ok' => false, 'error' => 'already_ended'], 409);

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
      $pdo->prepare("
        UPDATE meetings SET participants = (
          SELECT COUNT(*)::int FROM meeting_participants
          WHERE meeting_id = ? AND left_at IS NULL
        ) WHERE id = ?
      ")->execute([$id, $id]);

      // Award 15 points for joining a meeting (only for logged-in users)
      if ($u) {
        // Check if points were already awarded for this meeting
        $pointsCheck = $pdo->prepare("SELECT 1 FROM points_history 
                                          WHERE user_id = ? AND action_type = 'meeting_joined' AND reference_id = ?");
        $pointsCheck->execute([$u, $id]);
        $alreadyAwarded = $pointsCheck->fetchColumn();

        if (!$alreadyAwarded) {
          $newPointsTotal = awardPoints($pdo, $u, 15, 'meeting_joined', $id, "Joined meeting: " . $id);
          json_out(['ok' => true, 'pointsAwarded' => 15, 'newPoints' => $newPointsTotal]);
        } else {
          json_out(['ok' => true, 'pointsAwarded' => 0]);
        }
      } else {
        json_out(['ok' => true, 'pointsAwarded' => 0]);
      }
    } else {
      json_out(['ok' => true, 'pointsAwarded' => 0]);
    }
  }

  // POST leave (PostgreSQL-safe: no ORDER BY/LIMIT on UPDATE; sync count from truth)
  if ($method === 'POST' && path_ends_with($path, '/meetings.php/leave')) {
    $b = body_json();
    $id = $b['id'] ?? null;
    if (!$id)
      json_out(['ok' => false, 'error' => 'missing_id'], 400);
    $u = user_id();
    $sess = session_id();
    if ($u) {
      $p = $pdo->prepare("
        UPDATE meeting_participants mp
        SET left_at = CURRENT_TIMESTAMP
        FROM (
          SELECT id FROM meeting_participants
          WHERE meeting_id = ? AND user_id = ? AND left_at IS NULL
          ORDER BY id DESC
          LIMIT 1
        ) sub
        WHERE mp.id = sub.id
      ");
      $p->execute([$id, $u]);
    } else {
      $p = $pdo->prepare("
        UPDATE meeting_participants mp
        SET left_at = CURRENT_TIMESTAMP
        FROM (
          SELECT id FROM meeting_participants
          WHERE meeting_id = ? AND user_id IS NULL AND session_id = ? AND left_at IS NULL
          ORDER BY id DESC
          LIMIT 1
        ) sub
        WHERE mp.id = sub.id
      ");
      $p->execute([$id, $sess]);
    }
    $updated = $p->rowCount();
    if ($updated > 0) {
      $sync = $pdo->prepare("
        UPDATE meetings SET participants = (
          SELECT COUNT(*)::int FROM meeting_participants
          WHERE meeting_id = ? AND left_at IS NULL
        ) WHERE id = ?
      ");
      $sync->execute([$id, $id]);
    }
    json_out(['ok' => true, 'updated' => (int) $updated]);
  }

  // POST end
  if ($method === 'POST' && path_ends_with($path, '/meetings.php/end')) {
    $b = body_json();
    $id = $b['id'] ?? null;
    if (!$id)
      json_out(['ok' => false, 'error' => 'missing_id'], 400);
    $st = $pdo->prepare("SELECT id, created_by, status, creator_session_id FROM meetings WHERE id=? LIMIT 1");
    $st->execute([$id]);
    $room = $st->fetch(PDO::FETCH_ASSOC);
    if (!$room)
      json_out(['ok' => false, 'error' => 'not_found'], 404);
    $uid = user_id();
    $sess = session_id();
    $isLoggedHost = $room['created_by'] !== null && $room['created_by'] !== '' && $uid && (int) $room['created_by'] === (int) $uid;
    $anonHost = ($room['created_by'] === null || $room['created_by'] === '')
      && !empty($room['creator_session_id'])
      && $sess !== ''
      && hash_equals((string) $room['creator_session_id'], (string) $sess);
    if (!$isLoggedHost && !$anonHost)
      json_out(['ok' => false, 'error' => 'You Are Not Host'], 403);
    if ($room['status'] === 'ended')
      json_out(['ok' => true]);
    // Close all active participant rows, then end meeting (room drops from live list)
    $pdo->prepare("
      UPDATE meeting_participants SET left_at = CURRENT_TIMESTAMP
      WHERE meeting_id = ? AND left_at IS NULL
    ")->execute([$id]);
    $pdo->prepare("
      UPDATE meetings SET status = 'ended', ends_at = CURRENT_TIMESTAMP, participants = 0
      WHERE id = ?
    ")->execute([$id]);
    json_out(['ok' => true]);
  }

  // POST import courses
  if ($method === 'POST' && path_ends_with($path, '/meetings.php/import-courses')) {
    try {
      $csvFile = dirname(__DIR__) . "/src/Datasets/UIU_Course_List.csv";
      import_courses_from_csv($pdo, $csvFile);
      json_out(['ok' => true, 'message' => 'Courses imported successfully']);
    } catch (Throwable $e) {
      json_out(['ok' => false, 'error' => 'import_failed', 'detail' => $e->getMessage()], 500);
    }
  }

  json_out(['ok' => false, 'error' => 'route_not_found', 'path' => $path], 404);

} catch (PDOException $e) {
  // Return the actual SQL error message for better troubleshooting
  json_out([
    'ok' => false, 
    'error' => "DB Error: " . $e->getMessage(), 
    'detail' => $e->getMessage(), 
    'sqlstate' => $e->getCode()
  ], 500);
} catch (Throwable $t) {
  json_out([
    'ok' => false, 
    'error' => "Server Error: " . $t->getMessage(), 
    'detail' => $t->getMessage()
  ], 500);
}
