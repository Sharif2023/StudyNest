<?php
require_once __DIR__ . '/db.php'; // uses $pdo + CORS set

session_start();

// --- Helpers ---
function json_out($arr, $code=200){ http_response_code($code); echo json_encode($arr); exit; }
function uid16(){ return substr(bin2hex(random_bytes(8)), 0, 16); }
function user_id(){
  // If you keep PHP sessions for auth, adapt this:
  return isset($_SESSION['user_id']) ? intval($_SESSION['user_id']) : null;
}
function body_json(){
  $raw = file_get_contents('php://input');
  if (!$raw) return [];
  $j = json_decode($raw, true);
  return is_array($j) ? $j : [];
}

// --- Routing ---
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'OPTIONS') { http_response_code(204); exit; }

// GET /meetings.php or /meetings.php?id=xxx
if ($method === 'GET' && basename($path) === 'meetings.php') {
  if (isset($_GET['id'])) {
    $stmt = $pdo->prepare("SELECT * FROM meetings WHERE id=? LIMIT 1");
    $stmt->execute([$_GET['id']]);
    $room = $stmt->fetch();
    if (!$room) json_out(['ok'=>false,'error'=>'not_found'],404);

    $p = $pdo->prepare("SELECT display_name, joined_at, left_at FROM meeting_participants WHERE meeting_id=? ORDER BY id ASC");
    $p->execute([$room['id']]);
    $room['participants_list'] = $p->fetchAll();

    json_out(['ok'=>true,'room'=>$room]);
  }

  // list visible rooms (live first, then scheduled soon)
  $stmt = $pdo->query("
    SELECT * FROM meetings
    WHERE status IN ('live','scheduled')
    ORDER BY status='live' DESC, created_at DESC
    LIMIT 60
  ");
  $rooms = $stmt->fetchAll();
  json_out(['ok'=>true,'rooms'=>$rooms]);
}

// POST /meetings.php  (create)
if ($method === 'POST' && basename($path) === 'meetings.php') {
  $u = user_id(); // can be null if you allow guest
  $b = body_json();
  $title  = trim($b['title'] ?? 'Quick Study Room');
  $course = trim($b['course'] ?? '');

  $id = substr(bin2hex(random_bytes(6)), 0, 12); // short nice id
  $stmt = $pdo->prepare("INSERT INTO meetings (id,title,course,created_by,status,participants) VALUES (?,?,?,?, 'live', 1)");
  $stmt->execute([$id,$title,$course ?: null,$u]);

  if ($u) {
    // Optional: resolve display name
    $name = null;
    $up = $pdo->prepare("SELECT COALESCE(name, student_id, email) AS dn FROM users WHERE id=? LIMIT 1");
    try { $up->execute([$u]); $r = $up->fetch(); $name = $r ? $r['dn'] : null; } catch(Throwable $e){}

    $pp = $pdo->prepare("INSERT INTO meeting_participants (meeting_id,user_id,display_name) VALUES (?,?,?)");
    $pp->execute([$id,$u,$name]);
  }

  json_out(['ok'=>true,'id'=>$id]);
}

// POST /meetings.php/join  (update participants count + presence row)
if ($method === 'POST' && preg_match('~/meetings\.php/join$~', $path)) {
  $b = body_json();
  $id = $b['id'] ?? null;
  $display = trim($b['display_name'] ?? '');
  if (!$id) json_out(['ok'=>false,'error'=>'missing_id'],400);

  $check = $pdo->prepare("SELECT id, participants FROM meetings WHERE id=? LIMIT 1");
  $check->execute([$id]);
  $r = $check->fetch();
  if (!$r) json_out(['ok'=>false,'error'=>'not_found'],404);

  $u = user_id();
  $pp = $pdo->prepare("INSERT INTO meeting_participants (meeting_id,user_id,display_name) VALUES (?,?,?)");
  $pp->execute([$id, $u, $display ?: null]);

  $upd = $pdo->prepare("UPDATE meetings SET participants = participants + 1 WHERE id=?");
  $upd->execute([$id]);

  json_out(['ok'=>true]);
}

// Fallback
json_out(['ok'=>false,'error'=>'route_not_found'],404);
