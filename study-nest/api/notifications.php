<?php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

$user_id = requireAuth();
$action = $_GET['action'] ?? '';

function notification_json(array $data, int $code = 200): void
{
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_SLASHES);
    exit;
}

function current_student_id(PDO $pdo, int $user_id): string
{
    $stmt = $pdo->prepare("SELECT student_id FROM users WHERE id = ? LIMIT 1");
    $stmt->execute([$user_id]);
    $sid = (string)($stmt->fetchColumn() ?: '');
    if ($sid === '') notification_json(["ok" => false, "error" => "user_not_found"], 404);
    return $sid;
}

$student_id = current_student_id($pdo, (int)$user_id);

if ($action === 'list') {
    $limit = max(1, min(100, (int)($_GET['limit'] ?? 30)));

    try {
        $stmt = $pdo->prepare("
            SELECT id, student_id, title, message, link, type, reference_id,
                   scheduled_at, sent_at, read_at, created_at
            FROM notifications
            WHERE student_id = ?
            ORDER BY created_at DESC
            LIMIT ?
        ");
        $stmt->execute([$student_id, $limit]);
        $notifications = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $unreadStmt = $pdo->prepare("
            SELECT COUNT(*) as unread_count
            FROM notifications
            WHERE student_id = ? AND read_at IS NULL
        ");
        $unreadStmt->execute([$student_id]);
        $unread = (int)($unreadStmt->fetch(PDO::FETCH_ASSOC)['unread_count'] ?? 0);

        notification_json([
            "ok" => true,
            "notifications" => $notifications,
            "unread" => $unread
        ]);
    } catch (Throwable $e) {
        error_log("notifications list error: " . $e->getMessage());
        notification_json(["ok" => false, "error" => "server_error"], 500);
    }
}

if ($action === 'mark_read' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true) ?: [];

    try {
        if (!empty($data['mark_all'])) {
            $stmt = $pdo->prepare("
                UPDATE notifications
                SET read_at = CURRENT_TIMESTAMP
                WHERE student_id = ? AND read_at IS NULL
            ");
            $stmt->execute([$student_id]);
            notification_json(["ok" => true, "message" => "All notifications marked as read"]);
        }

        if (!empty($data['notification_id'])) {
            $stmt = $pdo->prepare("
                UPDATE notifications
                SET read_at = CURRENT_TIMESTAMP
                WHERE id = ? AND student_id = ?
            ");
            $stmt->execute([(int)$data['notification_id'], $student_id]);
            notification_json(["ok" => true, "message" => "Notification marked as read"]);
        }

        notification_json(["ok" => false, "error" => "No valid action specified"], 400);
    } catch (Throwable $e) {
        error_log("notifications mark_read error: " . $e->getMessage());
        notification_json(["ok" => false, "error" => "server_error"], 500);
    }
}

if ($action === 'stream') {
    header('Content-Type: text/event-stream');
    header('Cache-Control: no-cache');
    header('Connection: keep-alive');
    header('X-Accel-Buffering: no');

    $lastId = (int)($_GET['last_id'] ?? 0);
    echo "data: " . json_encode(["type" => "connected", "last_id" => $lastId]) . "\n\n";
    @ob_flush();
    flush();

    try {
        while (true) {
            if (connection_aborted()) break;

            $stmt = $pdo->prepare("
                SELECT *
                FROM notifications
                WHERE student_id = ? AND id > ?
                ORDER BY id ASC
            ");
            $stmt->execute([$student_id, $lastId]);
            $newNotifications = $stmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($newNotifications as $notification) {
                $lastId = (int)$notification['id'];
                echo "event: message\n";
                echo "data: " . json_encode([
                    "type" => "new_notification",
                    "notification" => $notification
                ]) . "\n\n";
                @ob_flush();
                flush();
            }

            sleep(5);
        }
    } catch (Throwable $e) {
        error_log("notifications stream error: " . $e->getMessage());
        echo "data: " . json_encode(["error" => "server_error"]) . "\n\n";
        @ob_flush();
        flush();
    }
    exit;
}

notification_json(["ok" => false, "error" => "Invalid action"], 404);
?>
