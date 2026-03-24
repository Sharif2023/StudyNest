<?php
require_once __DIR__ . '/db.php'; // Provides $pdo, CORS headers, and session_start()
require_once __DIR__ . '/auth.php'; // Provides JWT/Session validation

// Require authentication for mutations
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    $user_id = requireAuth();
}

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        // Fetch notes belonging to the current user
        try {
            $user_id = current_user_id();
            if (!$user_id) {
                echo json_encode(["status" => "error", "message" => "Authentication required"]);
                exit;
            }

            $stmt = $pdo->prepare("
                SELECT n.*, u.username, u.student_id, u.profile_picture_url 
                FROM notes n 
                LEFT JOIN users u ON n.user_id = u.id 
                WHERE n.user_id = ?
                ORDER BY n.created_at DESC
            ");
            $stmt->execute([$user_id]);
            $notes = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(["status" => "success", "notes" => $notes ?: []]);
        } catch (Throwable $e) {
            echo json_encode(["status" => "error", "message" => "Query failed: " . $e->getMessage()]);
        }
        break;

    case 'POST':
        // Check if the required POST fields are set
        if (!isset($_POST['title'], $_POST['course'], $_POST['semester'], $_POST['tags'], $_FILES['file'])) {
            http_response_code(400); 
            echo json_encode(["status" => "error", "message" => "Missing required fields or file."]);
            exit();
        }

        // Handle file upload
        $file_url = null;
        if (isset($_FILES['file'])) {
            $file = $_FILES['file'];

            if ($file['error'] !== UPLOAD_ERR_OK) {
                http_response_code(500);
                echo json_encode(["status" => "error", "message" => "File upload error code: " . $file['error']]);
                exit();
            }

            $uploadDir = __DIR__ . '/../../public/uploads/';
            $fileName = uniqid() . '-' . basename($file['name']);
            $uploadFile = $uploadDir . $fileName;

            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0775, true);
            }

            if (move_uploaded_file($file['tmp_name'], $uploadFile)) {
                $file_url = "/public/uploads/{$fileName}";
            } else {
                http_response_code(500);
                echo json_encode(["status" => "error", "message" => "Failed to move uploaded file."]);
                exit();
            }
        }

        $title = $_POST['title'];
        $course = $_POST['course'];
        $semester = $_POST['semester'];
        $tags = $_POST['tags'];
        $description = $_POST['description'] ?? '';

        try {
            $pdo->beginTransaction();
            $stmt = $pdo->prepare("INSERT INTO notes (title, course, semester, tags, description, file_url, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([$title, $course, $semester, $tags, $description, $file_url, $user_id]);
            $note_id = $pdo->lastInsertId();

            // Award points using the centralized helper
            $points_total = awardPoints($pdo, $user_id, 20, 'note_upload', $note_id, "Uploaded note: $title");
            
            $pdo->commit();

            echo json_encode([
                "status" => "success",
                "message" => "New note added successfully. +20 points awarded!",
                "file_url" => $file_url,
                "points_awarded" => 20,
                "new_points" => $points_total
            ]);
        } catch (Throwable $e) {
            $pdo->rollBack();
            http_response_code(500);
            echo json_encode(["status" => "error", "message" => "Database insertion failed: " . $e->getMessage()]);
        }
        break;

    case 'PUT':
        $data = json_decode(file_get_contents("php://input"), true);
        $id = $data['id'] ?? null;
        if (!$id) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Missing note ID."]);
            exit();
        }

        // --- OWNERSHIP CHECK ---
        $chk = $pdo->prepare("SELECT user_id FROM notes WHERE id = ?");
        $chk->execute([$id]);
        $owner_id = $chk->fetchColumn();
        if ($owner_id && (int)$owner_id !== $user_id) {
            http_response_code(403);
            echo json_encode(["status" => "error", "message" => "You can only update your own notes."]);
            exit();
        }

        unset($data['id']);
        $updates = [];
        $params = [];

        foreach ($data as $key => $value) {
            $updates[] = "$key = ?";
            $params[] = $value;
        }

        if (empty($updates)) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "No fields to update."]);
            exit();
        }

        try {
            $sql = "UPDATE notes SET " . implode(", ", $updates) . ", updated_at = NOW() WHERE id = ?";
            $params[] = $id;

            $stmt = $pdo->prepare($sql);
            if ($stmt->execute($params)) {
                echo json_encode(["status" => "success", "message" => "Note updated successfully."]);
            } else {
                echo json_encode(["status" => "error", "message" => "Update failed."]);
            }
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode(["status" => "error", "message" => "Error: " . $e->getMessage()]);
        }
        break;

    case 'DELETE':
        $id = $_GET['id'] ?? null;
        if (!$id) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Missing note ID."]);
            exit();
        }

        try {
            // --- OWNERSHIP CHECK ---
            $chk = $pdo->prepare("SELECT user_id FROM notes WHERE id = ?");
            $chk->execute([$id]);
            $owner_id = $chk->fetchColumn();
            if ($owner_id && (int)$owner_id !== $user_id) {
                http_response_code(403);
                echo json_encode(["status" => "error", "message" => "You can only delete your own notes."]);
                exit();
            }

            $stmt = $pdo->prepare("DELETE FROM notes WHERE id = ?");
            if ($stmt->execute([$id])) {
                echo json_encode(["status" => "success", "message" => "Note deleted successfully."]);
            } else {
                echo json_encode(["status" => "error", "message" => "Delete failed."]);
            }
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode(["status" => "error", "message" => "Error: " . $e->getMessage()]);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(["status" => "error", "message" => "Method not allowed"]);
        break;
}


?>