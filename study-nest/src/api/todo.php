<?php
require_once "db.php";

header("Content-Type: application/json; charset=utf-8");
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Credentials: true");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

error_reporting(E_ALL);
ini_set('display_errors', 0); // disable raw HTML error output
set_exception_handler(function ($e) {
    echo json_encode(["ok" => false, "error" => $e->getMessage()]);
    exit;
});

// ---------- AUTO CREATE TABLE ----------
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS todos (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            student_id VARCHAR(32) NOT NULL,
            title VARCHAR(255) NOT NULL,
            description TEXT NULL,
            type ENUM('default','assignment','report','exam','class_test','midterm','final') DEFAULT 'default',
            status ENUM('pending','in-progress','completed') DEFAULT 'pending',
            due_date DATE NULL,
            due_time TIME NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_student (student_id),
            FOREIGN KEY (student_id) REFERENCES users(student_id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");
} catch (Exception $e) {
    echo json_encode(["ok" => false, "error" => "DB init failed: " . $e->getMessage()]);
    exit;
}
// ---------------------------------------

// ---------- Reminder Helper ----------
function createReminderNotification($pdo, $student_id, $todo)
{
    // Skip if no due date/time
    if (empty($todo['due_date']) || empty($todo['due_time'])) return;

    $dueDateTime = strtotime($todo['due_date'] . ' ' . $todo['due_time']);
    $reminderTime = $dueDateTime - (6 * 60 * 60); // 6 hours before

    if ($reminderTime <= time()) return; // Too late for reminder

    // Check if notification already exists for this task
    $check = $pdo->prepare("SELECT id FROM notifications WHERE student_id=? AND type='todo_reminder' AND reference_id=?");
    $check->execute([$student_id, $todo['id']]);
    if ($check->fetch()) return;

    // Schedule notification
    $stmt = $pdo->prepare("
        INSERT INTO notifications (student_id, title, message, type, reference_id, created_at, scheduled_at)
        VALUES (?, ?, ?, 'todo_reminder', ?, NOW(), FROM_UNIXTIME(?))
    ");
    $title = "Upcoming Task: " . $todo['title'];
    $msg = "Your task '{$todo['title']}' is due soon (in less than 6 hours).";
    $stmt->execute([$student_id, $title, $msg, $todo['id'], $reminderTime]);
}
// ---------------------------------------

$method = $_SERVER["REQUEST_METHOD"];
$student_id = $_GET["student_id"] ?? null;

if (!$student_id) {
    echo json_encode(["ok" => false, "error" => "Missing student_id"]);
    exit;
}

switch ($method) {
    // ----- GET -----
    case "GET":
        $stmt = $pdo->prepare("SELECT * FROM todos WHERE student_id = ? ORDER BY created_at DESC");
        $stmt->execute([$student_id]);
        echo json_encode(["ok" => true, "todos" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        break;

    // ----- POST (create new task) -----
    case "POST":
        $data = json_decode(file_get_contents("php://input"), true);

        $stmt = $pdo->prepare("
            INSERT INTO todos (student_id, title, description, type, due_date, due_time)
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $student_id,
            $data["title"] ?? "Untitled Task",
            $data["description"] ?? null,
            $data["type"] ?? "default",
            $data["due_date"] ?? null,
            $data["due_time"] ?? null
        ]);

        $newId = $pdo->lastInsertId();

        // Schedule reminder notification
        createReminderNotification($pdo, $student_id, [
            "id" => $newId,
            "title" => $data["title"] ?? "Untitled Task",
            "due_date" => $data["due_date"] ?? null,
            "due_time" => $data["due_time"] ?? null
        ]);

        echo json_encode(["ok" => true, "id" => $newId]);
        break;

    // ----- PUT (update existing task) -----
    case "PUT":
        $data = json_decode(file_get_contents("php://input"), true);
        $stmt = $pdo->prepare("
            UPDATE todos
            SET title=?, description=?, type=?, status=?, due_date=?, due_time=?
            WHERE id=? AND student_id=?
        ");
        $stmt->execute([
            $data["title"],
            $data["description"],
            $data["type"],
            $data["status"],
            $data["due_date"],
            $data["due_time"],
            $data["id"],
            $student_id
        ]);

        // Update or create reminder again (in case date/time changed)
        createReminderNotification($pdo, $student_id, [
            "id" => $data["id"],
            "title" => $data["title"],
            "due_date" => $data["due_date"],
            "due_time" => $data["due_time"]
        ]);

        echo json_encode(["ok" => true]);
        break;

    // ----- DELETE -----
    case "DELETE":
        $data = json_decode(file_get_contents("php://input"), true);
        $stmt = $pdo->prepare("DELETE FROM todos WHERE id=? AND student_id=?");
        $stmt->execute([$data["id"], $student_id]);

        // Clean up any related scheduled reminders
        $del = $pdo->prepare("DELETE FROM notifications WHERE reference_id=? AND student_id=? AND type='todo_reminder'");
        $del->execute([$data["id"], $student_id]);

        echo json_encode(["ok" => true]);
        break;

    default:
        echo json_encode(["ok" => false, "error" => "Unsupported method"]);
}
