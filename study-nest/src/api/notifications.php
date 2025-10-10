<?php
session_start();
header('Content-Type: application/json; charset=utf-8');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Credentials: true");

$servername = "localhost";
$username = "root";
$password = "";
$dbname = "studynest";

$conn = new mysqli($servername, $username, $password, $dbname);
if ($conn->connect_error) {
  http_response_code(500);
  echo json_encode(["ok" => false, "error" => "DB error"]);
  exit;
}

$action = $_GET['action'] ?? '';
if ($action === 'list') {
  $sid = $_GET['student_id'] ?? '';
  $limit = intval($_GET['limit'] ?? 30);
  $res = $conn->prepare("SELECT * FROM notifications WHERE student_id=? ORDER BY id DESC LIMIT ?");
  $res->bind_param("si", $sid, $limit);
  $res->execute();
  $result = $res->get_result();
  $rows = $result->fetch_all(MYSQLI_ASSOC);
  $unread = 0;
  foreach ($rows as $r) if (empty($r['read_at'])) $unread++;
  echo json_encode(["ok" => true, "notifications" => $rows, "unread" => $unread]);
  exit;
}

if ($action === 'mark_read' && $_SERVER['REQUEST_METHOD'] === 'POST') {
  $data = json_decode(file_get_contents('php://input'), true);
  $sid = $data['student_id'] ?? '';
  if ($sid) {
    $stmt = $conn->prepare("UPDATE notifications SET read_at=NOW() WHERE student_id=? AND read_at IS NULL");
    $stmt->bind_param("s", $sid);
    $stmt->execute();
  }
  echo json_encode(["ok" => true]);
  exit;
}

/* --- Real-time Server Sent Events stream --- */
if ($action === 'stream') {
  header('Content-Type: text/event-stream');
  header('Cache-Control: no-cache');
  header('Connection: keep-alive');

  $sid = $_GET['student_id'] ?? '';
  if (!$sid) exit;

  $lastId = 0;
  while (true) {
    clearstatcache();
    $stmt = $conn->prepare("SELECT * FROM notifications WHERE student_id=? AND id>? ORDER BY id ASC");
    $stmt->bind_param("si", $sid, $lastId);
    $stmt->execute();
    $result = $stmt->get_result();
    while ($row = $result->fetch_assoc()) {
      $lastId = $row['id'];
      echo "event: message\n";
      echo "data: " . json_encode(["type" => "new_notification", "notification" => $row]) . "\n\n";
      ob_flush();
      flush();
    }
    sleep(3); // small delay to avoid CPU hog
  }
}
?>
