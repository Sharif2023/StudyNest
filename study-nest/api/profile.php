<?php
// profile.php

require_once __DIR__ . '/db.php'; // Provides $pdo, CORS headers, and session_start()

require_once __DIR__ . '/auth.php'; // Provides JWT/Session validation

// --- Authentication Check ---
$user_id = requireAuth(); // Automatically handles 401 if missing


// Verify the user exists
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
    $stmt = $pdo->prepare("SELECT * FROM notes WHERE user_id = ?");
    $stmt->execute([$user_id]);
    $notes = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $out['notes'] = $notes;

    // Resources - FIXED: Use user_id for robust filtering
    $stmt = $pdo->prepare("
      SELECT * 
      FROM resources 
      WHERE user_id = ?
    ");
    $stmt->execute([$user_id]);
    $out['resources'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Recordings
    $stmt = $pdo->prepare("
      SELECT id, title, description, course, semester, created_at, url, kind
      FROM resources 
      WHERE user_id = ? 
      AND kind = 'recording'
      ORDER BY created_at DESC
    ");
    $stmt->execute([$user_id]);
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
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM notes WHERE user_id = ?");
    $stmt->execute([$user_id]);
    $counts['notes'] = $stmt->fetchColumn();

    // Resources count
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM resources WHERE user_id = ?");
    $stmt->execute([$user_id]);
    $counts['resources'] = $stmt->fetchColumn();

    // Recordings count
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM resources WHERE user_id = ? AND kind = 'recording'");
    $stmt->execute([$user_id]);
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
// POST profile picture upload
// ------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'POST' && (isset($_FILES['profile_picture']) || isset($_FILES['file']))) {
  try {
    require_once __DIR__ . '/cloudinary_helper.php';
    $file = $_FILES['profile_picture'] ?? $_FILES['file'];
    
    if ($file['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        echo json_encode(["ok" => false, "error" => "Upload error code: " . $file['error']]);
        exit;
    }

    $upload = cloudinary_upload_file($file['tmp_name'], $file['name'], 'studynest_profiles');
    $ppurl = $upload['secure_url'];

    // Optional: Update name and bio if provided in the same POST request
    $name = trim($_POST['name'] ?? '');
    $bio = trim($_POST['bio'] ?? '');
    if ($name || $bio) {
        $upd_stmt = $pdo->prepare("UPDATE users SET username = COALESCE(NULLIF(?, ''), username), bio = COALESCE(NULLIF(?, ''), bio), profile_picture_url = ? WHERE id = ?");
        $upd_stmt->execute([$name, $bio, $ppurl, $user_id]);
    } else {
        $stmt = $pdo->prepare("UPDATE users SET profile_picture_url = ? WHERE id = ?");
        $stmt->execute([$ppurl, $user_id]);
    }

    echo json_encode([
        "ok" => true, 
        "message" => "Profile updated successfully", 
        "profile_picture_url" => $ppurl,
        "status" => "success"
    ]);
  } catch (Throwable $e) {
    http_response_code(500);
    error_log("Profile upload error: " . $e->getMessage());
    echo json_encode(["ok" => false, "status" => "error", "error" => "Upload failed: " . $e->getMessage()]);
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
      error_log("Password change error: " . $e->getMessage());
      echo json_encode([
          "status" => "error", 
          "message" => "Password change failed: " . $e->getMessage(),
          "detail" => $e->getTraceAsString()
      ]);
      exit();
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