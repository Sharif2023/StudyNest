<?php
require_once "db.php";
header("Content-Type: application/json");

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
	// ensure notifications table (shared by multiple endpoints)
	$pdo->exec("
        CREATE TABLE IF NOT EXISTS notifications (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            user_id INT UNSIGNED NULL,
            student_id VARCHAR(32) NULL,
            type VARCHAR(64) NOT NULL,
            title VARCHAR(255) NOT NULL,
            body TEXT NULL,
            link VARCHAR(1024) NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            read_at DATETIME NULL,
            INDEX idx_user (user_id),
            INDEX idx_student (student_id),
            INDEX idx_read (read_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");
} catch (Exception $e) {
	echo json_encode(["ok" => false, "error" => "DB init failed: " . $e->getMessage()]);
	exit;
}
// ---------------------------------------

$method = $_SERVER["REQUEST_METHOD"];
$student_id = $_GET["student_id"] ?? null;

if (!$student_id) {
	echo json_encode(["ok" => false, "error" => "Missing student_id"]);
	exit;
}

switch ($method) {
	case "GET":
		$stmt = $pdo->prepare("SELECT * FROM todos WHERE student_id = ? ORDER BY created_at DESC");
		$stmt->execute([$student_id]);
		echo json_encode(["ok" => true, "todos" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
		break;

	case "POST":
		$data = json_decode(file_get_contents("php://input"), true);
		$stmt = $pdo->prepare("INSERT INTO todos (student_id, title, description, type, due_date, due_time) VALUES (?, ?, ?, ?, ?, ?)");
		$stmt->execute([
			$student_id,
			$data["title"] ?? "Untitled Task",
			$data["description"] ?? null,
			$data["type"] ?? "default",
			$data["due_date"] ?? null,
			$data["due_time"] ?? null
		]);
		$newId = $pdo->lastInsertId();
		// create notification (best-effort)
		try {
			$nt = $pdo->prepare("INSERT INTO notifications (student_id, type, title, body, link) VALUES (?,?,?,?,?)");
			$nt->execute([$student_id, 'todo_created', 'Task created', ($data['title'] ?? 'Untitled Task'), null]);
		} catch (Throwable $e) { }
		echo json_encode(["ok" => true, "id" => $newId]);
		break;

	case "PUT":
		$data = json_decode(file_get_contents("php://input"), true);
		$stmt = $pdo->prepare("UPDATE todos SET title=?, description=?, type=?, status=?, due_date=?, due_time=? WHERE id=? AND student_id=?");
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
		// notify on update
		try {
			$nt = $pdo->prepare("INSERT INTO notifications (student_id, type, title, body, link) VALUES (?,?,?,?,?)");
			$nt->execute([$student_id, 'todo_updated', 'Task updated', sprintf('%s (%s)', $data['title'] ?? 'Task', $data['status'] ?? 'updated'), null]);
		} catch (Throwable $e) { }
		echo json_encode(["ok" => true]);
		break;

	case "DELETE":
		$data = json_decode(file_get_contents("php://input"), true);
		$stmt = $pdo->prepare("DELETE FROM todos WHERE id=? AND student_id=?");
		$stmt->execute([$data["id"], $student_id]);
		// notify on delete
		try {
			$nt = $pdo->prepare("INSERT INTO notifications (student_id, type, title, body, link) VALUES (?,?,?,?,?)");
			$nt->execute([$student_id, 'todo_deleted', 'Task deleted', (string)($data['id'] ?? ''), null]);
		} catch (Throwable $e) { }
		echo json_encode(["ok" => true]);
		break;

	default:
		echo json_encode(["ok" => false, "error" => "Unsupported method"]);
}
