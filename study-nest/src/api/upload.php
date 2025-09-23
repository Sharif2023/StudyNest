<?php
// --- CORS + JSON ---
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '*';
header("Access-Control-Allow-Origin: $origin");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json; charset=utf-8");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}

function respond($ok, $data = []) {
  echo json_encode($ok ? array_merge(['ok' => true], $data)
                       : array_merge(['ok' => false], $data));
  exit;
}

// --- Guardrails ---
if (ini_get('file_uploads') != 1) {
  respond(false, ['error' => 'File uploads are disabled in PHP (file_uploads=0).']);
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  respond(false, ['error' => 'Invalid request method. Use POST.']);
}
if (!isset($_FILES['file'])) {
  respond(false, ['error' => 'No file provided. Use form field "file".']);
}
if (!is_uploaded_file($_FILES['file']['tmp_name'])) {
  respond(false, ['error' => 'Invalid upload.']);
}

// --- Validate file ---
$maxBytes = 5 * 1024 * 1024; // 5MB
$allowedExt = ['jpg','jpeg','png','gif','webp','bmp'];
$allowedMime = ['image/jpeg','image/png','image/gif','image/webp','image/bmp'];

$origName = $_FILES['file']['name'] ?? 'upload';
$size     = (int)($_FILES['file']['size'] ?? 0);
$tmp      = $_FILES['file']['tmp_name'];

if ($size <= 0)           respond(false, ['error' => 'Empty file.']);
if ($size > $maxBytes)    respond(false, ['error' => 'File too large (max 5MB).']);

$ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION));
if (!in_array($ext, $allowedExt, true)) {
  respond(false, ['error' => 'Unsupported file type. Allowed: '.implode(', ', $allowedExt)]);
}

// MIME sniff
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mime  = finfo_file($finfo, $tmp);
finfo_close($finfo);
if ($mime === false || !in_array($mime, $allowedMime, true)) {
  respond(false, ['error' => 'Unsupported MIME type: ' . ($mime ?: 'unknown')]);
}

// --- Storage paths ---
$uploadDir = __DIR__ . DIRECTORY_SEPARATOR . 'uploads';
if (!is_dir($uploadDir)) {
  if (!mkdir($uploadDir, 0777, true) && !is_dir($uploadDir)) {
    respond(false, ['error' => 'Failed to create uploads directory.']);
  }
}
if (!is_writable($uploadDir)) {
  respond(false, ['error' => 'Uploads directory is not writable.']);
}

// Unique filename to avoid collisions
$slug = preg_replace('/[^a-z0-9]+/i', '-', pathinfo($origName, PATHINFO_FILENAME));
$slug = trim($slug, '-') ?: 'file';
$filename = $slug . '-' . uniqid('', true) . '.' . $ext;

$targetPath = $uploadDir . DIRECTORY_SEPARATOR . $filename;

// --- Move the file ---
if (!move_uploaded_file($tmp, $targetPath)) {
  respond(false, ['error' => 'Failed to move uploaded file.']);
}

// --- Public URL ---
// Build a relative web path based on this script’s URL.
$basePath = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'])), '/');
$publicUrl = $basePath . '/uploads/' . $filename; // e.g. /StudyNest/study-nest/src/api/uploads/xxxx.jpg

respond(true, [
  'url' => $publicUrl,
  'filename' => $filename,
  'size' => $size,
  'mime' => $mime
]);
