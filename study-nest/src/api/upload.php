<?php
require __DIR__ . '/db.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Require login
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'error' => 'Unauthorized']);
    exit;
}

$user_id = intval($_SESSION['user_id']);

// Check file
if (!isset($_FILES['file'])) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'No file uploaded']);
    exit;
}

$file = $_FILES['file'];
$tmp  = $file['tmp_name'];

if (!file_exists($tmp)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'File not found']);
    exit;
}

// --- Force save in public/images ---
$uploadDir = "C:/xampp/htdocs/StudyNest/study-nest/public/images";

// Create dir if missing
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0777, true);
}

$ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
$allowed = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
if (!in_array($ext, $allowed)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Invalid file type']);
    exit;
}

$filename = uniqid("pp_") . "." . $ext;
$target = $uploadDir . DIRECTORY_SEPARATOR . $filename;

if (!move_uploaded_file($tmp, $target)) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Failed to save file']);
    exit;
}

// Build URL relative to React frontend
// since /public is served as root, /images/... is correct
$url = "/images/" . $filename;

// Save in DB
$stmt = $pdo->prepare("UPDATE users SET profile_pic_url = ? WHERE id = ? LIMIT 1");
$stmt->execute([$url, $user_id]);

echo json_encode(['ok' => true, 'url' => $url]);
