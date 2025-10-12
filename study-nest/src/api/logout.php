<?php
// logout.php
function allow_cors()
{
  $origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
  header("Access-Control-Allow-Origin: $origin");
  header("Access-Control-Allow-Credentials: true");
  header("Access-Control-Allow-Headers: Content-Type, Authorization");
  header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
  header("Content-Type: application/json; charset=utf-8");
  if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
  }
}
allow_cors();

session_start();
session_destroy();
setcookie(session_name(), '', time() - 3600, '/');

echo json_encode(["ok" => true, "message" => "Logged out successfully"]);