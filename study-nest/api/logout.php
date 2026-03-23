<?php
// logout.php
require_once __DIR__ . '/db.php'; // Provides CORS headers and session_start()

session_start();
session_destroy();
setcookie(session_name(), '', time() - 3600, '/');

echo json_encode(["ok" => true, "message" => "Logged out successfully"]);