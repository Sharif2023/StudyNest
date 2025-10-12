<?php
// profile.php

function allow_cors()
{
  $origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
  header("Access-Control-Allow-Origin: $origin");
  header("Access-Control-Allow-Credentials: true");
  header("Access-Control-Allow-Headers: Content-Type, Authorization");
  header("Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS");
  header("Content-Type: application/json; charset=utf-8");
  if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
  }
}
allow_cors();

// --- Session Configuration ---
session_set_cookie_params([
  'lifetime' => 86400,
  'path' => '/',
  'domain' => $_SERVER['HTTP_HOST'] ?? 'localhost',
  'secure' => false, // Set to true in production with HTTPS
  'httponly' => true,
  'samesite' => 'Lax'
]);

session_start();

// --- DB config ---
$host = 'localhost';
$db_name = 'studynest';
$user = 'root';
$pass = '';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db_name;charset=$charset";
$options = [
  PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
  PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
  PDO::ATTR_EMULATE_PREPARES => false,
];

try {
  $pdo = new PDO($dsn, $user, $pass, $options);
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(["ok" => false, "error" => "DB connect error", "detail" => $e->getMessage()]);
  exit;
}

// --- Enhanced Authentication Check ---
$user_id = $_SESSION['user_id'] ?? null;

// If no session user_id, check for auth token in headers or request
if (!$user_id) {
  // Check for Authorization header
  $auth_header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
  if (str_starts_with($auth_header, 'Bearer ')) {
    $token = substr($auth_header, 7);
    // You would validate the token here and get user_id
  }
  
  // Check for user_id in request (for testing)
  $input = json_decode(file_get_contents('php://input'), true) ?? [];
  $user_id = $input['user_id'] ?? $_GET['user_id'] ?? null;
}

// Debug: Log session and authentication info
error_log("Profile API - User ID: " . ($user_id ?? 'NULL'));
error_log("Profile API - Session ID: " . session_id());
error_log("Profile API - Session Data: " . json_encode($_SESSION));

if (!$user_id) {
  http_response_code(401);
  echo json_encode([
    "ok" => false, 
    "error" => "Not authenticated",
    "session_id" => session_id(),
    "session_data" => $_SESSION
  ]);
  exit;
}

// First, verify the user exists
try {
  $stmt = $pdo->prepare("SELECT id, username FROM users WHERE id = ?");
  $stmt->execute([$user_id]);
  $user = $stmt->fetch();
  
  if (!$user) {
    http_response_code(404);
    echo json_encode(["ok" => false, "error" => "User not found in database"]);
    exit;
  }
  
  $username = $user['username'];
  error_log("Profile API - Found user: " . $username);
  
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(["ok" => false, "error" => "User verification failed", "detail" => $e->getMessage()]);
  exit;
}

// ------------------------------------------
// ✅ GET content route (MUST be before other GET logic)
// ------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['content'])) {
  try {
    $out = [];

    // Notes - FIXED: notes table doesn't have user_id, so get all notes
    $notes = [];
    $stmt = $pdo->query("SELECT * FROM notes");
    $notes = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $out['notes'] = $notes;

    // Resources - FIXED: Use direct username comparison
    $stmt = $pdo->prepare("
      SELECT * 
      FROM resources 
      WHERE author = ?
    ");
    $stmt->execute([$username]);
    $out['resources'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Recordings
    $stmt = $pdo->prepare("
      SELECT id, title, description, course, semester, created_at, url, kind
      FROM resources 
      WHERE author = ? 
      AND kind = 'recording'
      ORDER BY created_at DESC
    ");
    $stmt->execute([$username]);
    $out['recordings'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Rooms
    $stmt = $pdo->prepare("SELECT * FROM meetings WHERE created_by = ?");
    $stmt->execute([$user_id]);
    $out['rooms'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Questions
    $stmt = $pdo->prepare("
      SELECT id, title, body, tags, author, user_id, votes, created_at
      FROM questions
      WHERE user_id = ?
      ORDER BY created_at DESC
    ");
    $stmt->execute([$user_id]);
    $out['questions'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Bookmarks
    $stmt = $pdo->prepare("
      SELECT r.id, r.title, r.author, r.course, r.semester, r.created_at, r.kind
      FROM bookmarks b
      JOIN resources r ON b.resource_id = r.id
      WHERE b.user_id = ?
      ORDER BY b.created_at DESC
    ");
    $stmt->execute([$user_id]);
    $out['bookmarks'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
      "ok" => true, 
      "content" => $out,
      "debug" => [
        "user_id" => $user_id,
        "username" => $username,
        "notes_count" => count($out['notes']),
        "resources_count" => count($out['resources']),
        "recordings_count" => count($out['recordings']),
        "rooms_count" => count($out['rooms']),
        "questions_count" => count($out['questions']),
        "bookmarks_count" => count($out['bookmarks'])
      ]
    ]);
  } catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(["ok" => false, "error" => $e->getMessage(), "trace" => $e->getTraceAsString()]);
  }
  exit;
}

// ------------------------------------------
// GET profile (basic profile info without content)
// ------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
  try {
    $stmt = $pdo->prepare("
      SELECT 
        id,
        student_id,
        username AS name,
        email,
        profile_picture_url,
        bio
      FROM users
      WHERE id = ?
      LIMIT 1
    ");
    $stmt->execute([$user_id]);
    $row = $stmt->fetch();

    if (!$row) {
      echo json_encode(["ok" => false, "error" => "User not found"]);
      exit;
    }

    // Get counts for profile overview
    $counts = [];
    
    // Notes count - FIXED: notes table doesn't have user_id
    $stmt = $pdo->query("SELECT COUNT(*) FROM notes");
    $counts['notes'] = $stmt->fetchColumn();
    
    // Resources count
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM resources WHERE author = ?");
    $stmt->execute([$row['name']]);
    $counts['resources'] = $stmt->fetchColumn();
    
    // Recordings count
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM resources WHERE author = ? AND kind = 'recording'");
    $stmt->execute([$row['name']]);
    $counts['recordings'] = $stmt->fetchColumn();
    
    // Rooms count
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM meetings WHERE created_by = ?");
    $stmt->execute([$user_id]);
    $counts['rooms'] = $stmt->fetchColumn();
    
    // Questions count
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM questions WHERE user_id = ?");
    $stmt->execute([$user_id]);
    $counts['questions'] = $stmt->fetchColumn();
    
    // Bookmarks count
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM bookmarks WHERE user_id = ?");
    $stmt->execute([$user_id]);
    $counts['bookmarks'] = $stmt->fetchColumn();

    echo json_encode([
      "ok" => true, 
      "profile" => $row,
      "counts" => $counts,
      "debug" => [
        "user_id" => $user_id,
        "username" => $row['name']
      ]
    ]);
  } catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(["ok" => false, "error" => "Server error", "detail" => $e->getMessage()]);
  }
  exit;
}

// ------------------------------------------
// PUT update profile
// ------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
  $payload = json_decode(file_get_contents('php://input'), true) ?: [];

  // Password change
  if (!empty($payload['old_password']) && !empty($payload['new_password'])) {
    try {
      $stmt = $pdo->prepare("SELECT password_hash FROM users WHERE id=? LIMIT 1");
      $stmt->execute([$user_id]);
      $u = $stmt->fetch();
      if (!$u) {
        echo json_encode(["ok" => false, "error" => "User not found"]);
        exit;
      }

      if (!password_verify($payload['old_password'], $u['password_hash'])) {
        echo json_encode(["ok" => false, "error" => "Invalid current password"]);
        exit;
      }

      $newHash = password_hash($payload['new_password'], PASSWORD_DEFAULT);
      $upd = $pdo->prepare("UPDATE users SET password_hash=? WHERE id=?");
      $upd->execute([$newHash, $user_id]);

      echo json_encode(["ok" => true, "message" => "Password updated"]);
      exit;
    } catch (Throwable $e) {
      http_response_code(500);
      echo json_encode(["ok" => false, "error" => "Server error", "detail" => $e->getMessage()]);
      exit;
    }
  }

  // Profile update
  $name = trim($payload['name'] ?? '');
  $bio = trim($payload['bio'] ?? '');
  $ppurl = trim($payload['profile_picture_url'] ?? '');

  try {
    $stmt = $pdo->prepare("UPDATE users SET username=?, bio=?, profile_picture_url=? WHERE id=?");
    $stmt->execute([$name, $bio, $ppurl, $user_id]);

    $stmt = $pdo->prepare("
      SELECT id, student_id, username AS name, email, profile_picture_url, bio
      FROM users WHERE id = ? LIMIT 1
    ");
    $stmt->execute([$user_id]);
    $row = $stmt->fetch();

    echo json_encode(["ok" => true, "profile" => $row]);
  } catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(["ok" => false, "error" => "Server error", "detail" => $e->getMessage()]);
  }
  exit;
}

http_response_code(405);
echo json_encode(["ok" => false, "error" => "Method not allowed"]);