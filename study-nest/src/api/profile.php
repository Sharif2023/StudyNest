<?php
// profile.php

// --- CORS ---
function allow_cors() {
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
  echo json_encode(["ok"=>false,"error"=>"DB connect error","detail"=>$e->getMessage()]);
  exit;
}

// Require logged-in user
$user_id = $_SESSION['user_id'] ?? null;
if (!$user_id) {
  http_response_code(401);
  echo json_encode(["ok"=>false,"error"=>"Not authenticated"]);
  exit;
}

// ---------- GET profile ----------
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
  try {
    $stmt = $pdo->prepare("
      SELECT 
        id,
        student_id,
        username AS name,                -- ✅ alias to match frontend
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
      echo json_encode(["ok"=>false,"error"=>"User not found"]);
      exit;
    }

    echo json_encode(["ok"=>true,"profile"=>$row]);
  } catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(["ok"=>false,"error"=>"Server error","detail"=>$e->getMessage()]);
  }
  exit;
}

// ---------- PUT update profile ----------
if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
  $payload = json_decode(file_get_contents('php://input'), true) ?: [];

  // Password change
  if (!empty($payload['old_password']) && !empty($payload['new_password'])) {
    try {
      $stmt = $pdo->prepare("SELECT password_hash FROM users WHERE id=? LIMIT 1");
      $stmt->execute([$user_id]);
      $u = $stmt->fetch();
      if (!$u) { echo json_encode(["ok"=>false,"error"=>"User not found"]); exit; }

      if (!password_verify($payload['old_password'], $u['password_hash'])) {
        echo json_encode(["ok"=>false,"error"=>"Invalid current password"]); exit;
      }

      $newHash = password_hash($payload['new_password'], PASSWORD_DEFAULT);
      $upd = $pdo->prepare("UPDATE users SET password_hash=? WHERE id=?");
      $upd->execute([$newHash, $user_id]);

      echo json_encode(["ok"=>true,"message"=>"Password updated"]); exit;
    } catch (Throwable $e) {
      http_response_code(500);
      echo json_encode(["ok"=>false,"error"=>"Server error","detail"=>$e->getMessage()]);
      exit;
    }
  }

  // Profile update
  $name  = trim($payload['name'] ?? '');
  $bio   = trim($payload['bio'] ?? '');
  $ppurl = trim($payload['profile_picture_url'] ?? '');

  try {
    $sets = [];
    $vals = [];

    if ($name !== '') {
      $sets[] = "username = ?";
      $vals[] = $name;
    }

    $sets[] = "bio = ?";
    $vals[] = $bio;

    $sets[] = "profile_picture_url = ?";
    $vals[] = $ppurl;

    if (!$sets) {
      echo json_encode(["ok"=>false,"error"=>"No fields to update"]);
      exit;
    }

    $vals[] = $user_id;
    $sql = "UPDATE users SET ".implode(", ", $sets)." WHERE id=?";
    $upd = $pdo->prepare($sql);
    $upd->execute($vals);

    // Return updated profile
    $stmt = $pdo->prepare("
      SELECT 
        id,
        student_id,
        username AS name,               -- ✅ alias
        email,
        profile_picture_url,
        bio
      FROM users
      WHERE id = ?
      LIMIT 1
    ");
    $stmt->execute([$user_id]);
    $row = $stmt->fetch();

    echo json_encode(["ok"=>true,"profile"=>$row]);
  } catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(["ok"=>false,"error"=>"Server error","detail"=>$e->getMessage()]);
  }
  exit;
}

http_response_code(405);
echo json_encode(["ok"=>false,"error"=>"Method not allowed"]);
