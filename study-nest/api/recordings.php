<?php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

$user_id = requireAuth();

function rec_json(array $data, int $code = 200): void
{
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_SLASHES);
    exit;
}

function current_username(PDO $pdo, int $user_id): string
{
    $stmt = $pdo->prepare("SELECT username FROM users WHERE id = ? LIMIT 1");
    $stmt->execute([$user_id]);
    return (string)($stmt->fetchColumn() ?: 'Unknown');
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $data = json_decode(file_get_contents("php://input"), true) ?: [];

        if (empty($data['video_url']) || empty($data['room_id'])) {
            rec_json(["ok" => false, "status" => "error", "message" => "Missing required fields"], 400);
        }

        $videoUrl = trim((string)$data['video_url']);
        if (!preg_match('/^https:\/\/res\.cloudinary\.com\/[a-zA-Z0-9_-]+\//', $videoUrl)) {
            rec_json(["ok" => false, "status" => "error", "message" => "Unsupported recording URL"], 422);
        }

        $username = current_username($pdo, (int)$user_id);
        $title = trim((string)($data["title"] ?? "Study Session Recording"));
        $course = trim((string)($data["course"] ?? "General"));
        $semester = trim((string)($data["semester"] ?? "Current"));
        $description = trim((string)($data["description"] ?? "Study session recording"));

        $pdo->beginTransaction();

        $recording_stmt = $pdo->prepare("
            INSERT INTO recordings
                (room_id, video_url, user_name, user_id, duration, recorded_at, title, description, course, semester)
            VALUES
                (:room_id, :video_url, :user_name, :user_id, :duration, :recorded_at, :title, :description, :course, :semester)
            RETURNING id
        ");
        $recording_stmt->execute([
            ":room_id" => (string)$data["room_id"],
            ":video_url" => $videoUrl,
            ":user_name" => $username,
            ":user_id" => $user_id,
            ":duration" => (int)($data["duration"] ?? 0),
            ":recorded_at" => $data["recorded_at"] ?? date('Y-m-d H:i:s'),
            ":title" => $title,
            ":description" => $description,
            ":course" => $course,
            ":semester" => $semester
        ]);
        $recording_id = (int)$recording_stmt->fetchColumn();

        $resource_stmt = $pdo->prepare("
            INSERT INTO resources
                (user_id, title, kind, course, semester, description, author, src_type, url,
                 votes, bookmarks, flagged, visibility, shared_from_recording_id, created_at, updated_at)
            VALUES
                (:user_id, :title, 'recording', :course, :semester, :description, :author, 'link', :url,
                 0, 0, false, 'private', :recording_id, NOW(), NOW())
            RETURNING id
        ");
        $resource_stmt->execute([
            ":user_id" => $user_id,
            ":title" => $title,
            ":course" => $course,
            ":semester" => $semester,
            ":description" => $description,
            ":author" => $username,
            ":url" => $videoUrl,
            ":recording_id" => $recording_id,
        ]);
        $resource_id = (int)$resource_stmt->fetchColumn();

        $pdo->commit();

        rec_json([
            "ok" => true,
            "status" => "success",
            "message" => "Recording saved successfully",
            "recording_id" => $recording_id,
            "resource_id" => $resource_id
        ]);
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        error_log("recordings save error: " . $e->getMessage());
        rec_json(["ok" => false, "status" => "error", "message" => "Failed to save recording"], 500);
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $stmt = $pdo->prepare("
            SELECT *
            FROM resources
            WHERE user_id = ? AND kind = 'recording'
            ORDER BY created_at DESC
        ");
        $stmt->execute([$user_id]);
        rec_json([
            "ok" => true,
            "status" => "success",
            "recordings" => $stmt->fetchAll(PDO::FETCH_ASSOC)
        ]);
    } catch (Throwable $e) {
        error_log("recordings list error: " . $e->getMessage());
        rec_json(["ok" => false, "status" => "error", "message" => "Failed to load recordings"], 500);
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    try {
        $recording_id = $_GET['id'] ?? null;
        if (!$recording_id) {
            $input = json_decode(file_get_contents('php://input'), true) ?: [];
            $recording_id = $input['id'] ?? null;
        }
        $resource_id = (int)$recording_id;
        if ($resource_id <= 0) {
            rec_json(["ok" => false, "status" => "error", "message" => "Recording ID is required"], 400);
        }

        $stmt = $pdo->prepare("
            SELECT id, url, shared_from_recording_id
            FROM resources
            WHERE id = ? AND user_id = ? AND kind = 'recording'
            LIMIT 1
        ");
        $stmt->execute([$resource_id, $user_id]);
        $resource = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$resource) {
            rec_json(["ok" => false, "status" => "error", "message" => "Recording not found"], 404);
        }

        $pdo->beginTransaction();
        $pdo->prepare("DELETE FROM resources WHERE id = ? AND user_id = ? AND kind = 'recording'")
            ->execute([$resource_id, $user_id]);
        if (!empty($resource['shared_from_recording_id'])) {
            $pdo->prepare("DELETE FROM recordings WHERE id = ? AND user_id = ?")
                ->execute([(int)$resource['shared_from_recording_id'], $user_id]);
        }
        $pdo->commit();

        rec_json([
            "ok" => true,
            "status" => "success",
            "message" => "Recording deleted successfully"
        ]);
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        error_log("recordings delete error: " . $e->getMessage());
        rec_json(["ok" => false, "status" => "error", "message" => "Failed to delete recording"], 500);
    }
}

rec_json(["ok" => false, "status" => "error", "message" => "Invalid request method"], 405);
?>
