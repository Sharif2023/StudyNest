<?php
// todo.php

require_once __DIR__ . '/db.php'; // Provides $pdo, CORS headers, and session_start()

require_once __DIR__ . '/auth.php'; // Provides JWT/Session validation

// --- Authentication Check ---
$user_id = requireAuth(); // Automatically handles 401 if missing

$method = $_SERVER["REQUEST_METHOD"];


// Verify user exists before proceeding
try {
    $userCheck = $pdo->prepare("SELECT id FROM users WHERE id = ?");
    $userCheck->execute([$user_id]);
    if (!$userCheck->fetch()) {
        echo json_encode(["ok" => false, "error" => "User not found with ID: " . $user_id]);
        exit;
    }
} catch (Exception $e) {
    echo json_encode(["ok" => false, "error" => "User validation failed: " . $e->getMessage()]);
    exit;
}

switch ($method) {
    // ----- GET ----- 
    case "GET":
        try {
            $stmt = $pdo->prepare("SELECT * FROM todos WHERE user_id = ? ORDER BY created_at DESC");
            $stmt->execute([$user_id]);
            $todos = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(["ok" => true, "todos" => $todos]);
        } catch (Exception $e) {
            echo json_encode(["ok" => false, "error" => "Failed to fetch todos: " . $e->getMessage()]);
        }
        break;

    // ----- POST (create new task) -----
    case "POST":
        $input = file_get_contents("php://input");
        $data = json_decode($input, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            echo json_encode(["ok" => false, "error" => "Invalid JSON: " . json_last_error_msg()]);
            break;
        }

        if (empty($data["title"])) {
            echo json_encode(["ok" => false, "error" => "Title is required"]);
            break;
        }

        try {
            $stmt = $pdo->prepare("
                INSERT INTO todos (user_id, title, description, type, due_date, due_time, status)
                VALUES (?, ?, ?, ?, ?, ?, 'pending')
            ");
            
            $stmt->execute([
                $user_id,
                $data["title"] ?? "Untitled Task",
                $data["description"] ?? null,
                $data["type"] ?? "default",
                $data["due_date"] ?? null,
                $data["due_time"] ?? null
            ]);
            
            $newId = $pdo->lastInsertId();
            echo json_encode(["ok" => true, "id" => $newId]);
        } catch (Exception $e) {
            echo json_encode(["ok" => false, "error" => "Database error: " . $e->getMessage()]);
        }
        break;

    // ----- PUT (update existing task) -----
    case "PUT":
        $input = file_get_contents("php://input");
        $data = json_decode($input, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            echo json_encode(["ok" => false, "error" => "Invalid JSON: " . json_last_error_msg()]);
            break;
        }

        if (empty($data["id"])) {
            echo json_encode(["ok" => false, "error" => "Task ID is required for update"]);
            break;
        }

        try {
            $stmt = $pdo->prepare("
                UPDATE todos 
                SET title = ?, description = ?, type = ?, status = ?, due_date = ?, due_time = ?
                WHERE id = ? AND user_id = ?
            ");
            
            $stmt->execute([
                $data["title"] ?? "Untitled Task",
                $data["description"] ?? null,
                $data["type"] ?? "default",
                $data["status"] ?? "pending",
                $data["due_date"] ?? null,
                $data["due_time"] ?? null,
                $data["id"],
                $user_id
            ]);
            
            echo json_encode(["ok" => true]);
        } catch (Exception $e) {
            echo json_encode(["ok" => false, "error" => "Database error: " . $e->getMessage()]);
        }
        break;

    // ----- DELETE -----
    case "DELETE":
        $input = file_get_contents("php://input");
        $data = json_decode($input, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            echo json_encode(["ok" => false, "error" => "Invalid JSON: " . json_last_error_msg()]);
            break;
        }

        if (empty($data["id"])) {
            echo json_encode(["ok" => false, "error" => "Task ID is required for deletion"]);
            break;
        }

        try {
            // Delete the task
            $stmt = $pdo->prepare("DELETE FROM todos WHERE id = ? AND user_id = ?");
            $stmt->execute([$data["id"], $user_id]);
            
            echo json_encode(["ok" => true]);
        } catch (Exception $e) {
            echo json_encode(["ok" => false, "error" => "Database error: " . $e->getMessage()]);
        }
        break;

    default:
        echo json_encode(["ok" => false, "error" => "Unsupported method: " . $method]);
}
?>