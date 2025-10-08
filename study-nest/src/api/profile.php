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

$user_id = $_SESSION['user_id'] ?? null;
if (!$user_id) {
  http_response_code(401);
  echo json_encode(["ok" => false, "error" => "Not authenticated"]);
  exit;
}

// ------------------------------------------
// ✅ GET content route (MUST be before other GET logic)
// ------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['content'])) {
  try {
    $out = [];

    // Notes
    $notes = [];
    if (in_array('user_id', array_column($pdo->query("DESCRIBE notes")->fetchAll(PDO::FETCH_ASSOC), 'Field'))) {
      $stmt = $pdo->prepare("SELECT * FROM notes WHERE user_id = ?");
      $stmt->execute([$user_id]);
      $notes = $stmt->fetchAll(PDO::FETCH_ASSOC);
    } else {
      $notes = $pdo->query("SELECT * FROM notes")->fetchAll(PDO::FETCH_ASSOC);
    }
    $out['notes'] = $notes;

    // Resources
    $stmt = $pdo->prepare("
  SELECT *
  FROM resources
  WHERE CONVERT(author USING utf8mb4) COLLATE utf8mb4_unicode_ci
  IN (
    SELECT CONVERT(username USING utf8mb4) COLLATE utf8mb4_unicode_ci
    FROM users WHERE id = ?
  )
");
    $stmt->execute([$user_id]);
    $out['resources'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

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

    echo json_encode(["ok" => true, "content" => $out]);
  } catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(["ok" => false, "error" => $e->getMessage()]);
  }
  exit;
}

// ------------------------------------------
// GET profile
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

    echo json_encode(["ok" => true, "profile" => $row]);
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
