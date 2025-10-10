<?php
session_start();
require_once "db.php"; // Add this line
header('Content-Type: application/json; charset=utf-8');

$allowedOrigin = "http://localhost:5173";
header("Access-Control-Allow-Origin: $allowedOrigin");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Credentials: true");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$action = $_GET['action'] ?? '';

if ($action === 'list') {
    $sid = $_GET['student_id'] ?? '';
    $limit = intval($_GET['limit'] ?? 30);
    
    try {
        $stmt = $pdo->prepare("
            SELECT * FROM notifications 
            WHERE student_id = ? 
            ORDER BY created_at DESC 
            LIMIT ?
        ");
        $stmt->execute([$sid, $limit]);
        $notifications = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Count unread
        $unreadStmt = $pdo->prepare("
            SELECT COUNT(*) as unread_count 
            FROM notifications 
            WHERE student_id = ? AND read_at IS NULL
        ");
        $unreadStmt->execute([$sid]);
        $unread = $unreadStmt->fetch(PDO::FETCH_ASSOC)['unread_count'] ?? 0;
        
        echo json_encode([
            "ok" => true, 
            "notifications" => $notifications, 
            "unread" => $unread
        ]);
    } catch (Exception $e) {
        echo json_encode(["ok" => false, "error" => $e->getMessage()]);
    }
    exit;
}

if ($action === 'mark_read' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $sid = $data['student_id'] ?? '';
    
    try {
        if (!empty($data['mark_all'])) {
            $stmt = $pdo->prepare("
                UPDATE notifications 
                SET read_at = NOW() 
                WHERE student_id = ? AND read_at IS NULL
            ");
            $stmt->execute([$sid]);
        } else if (!empty($data['notification_id'])) {
            $stmt = $pdo->prepare("
                UPDATE notifications 
                SET read_at = NOW() 
                WHERE id = ? AND student_id = ?
            ");
            $stmt->execute([$data['notification_id'], $sid]);
        }
        
        echo json_encode(["ok" => true]);
    } catch (Exception $e) {
        echo json_encode(["ok" => false, "error" => $e->getMessage()]);
    }
    exit;
}

/* --- Real-time Server Sent Events stream --- */
if ($action === 'stream') {
    header('Content-Type: text/event-stream');
    header('Cache-Control: no-cache');
    header('Connection: keep-alive');
    header('X-Accel-Buffering: no'); // Important for Nginx

    $sid = $_GET['student_id'] ?? '';
    if (!$sid) {
        echo "data: " . json_encode(["error" => "Missing student_id"]) . "\n\n";
        ob_flush();
        flush();
        exit;
    }

    $lastId = intval($_GET['last_id'] ?? 0);
    
    // Send initial connection message
    echo "data: " . json_encode(["type" => "connected", "last_id" => $lastId]) . "\n\n";
    ob_flush();
    flush();

    try {
        while (true) {
            // Check if client is still connected
            if (connection_aborted()) break;

            $stmt = $pdo->prepare("
                SELECT * FROM notifications 
                WHERE student_id = ? AND id > ? 
                ORDER BY id ASC
            ");
            $stmt->execute([$sid, $lastId]);
            $newNotifications = $stmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($newNotifications as $notification) {
                $lastId = $notification['id'];
                echo "event: message\n";
                echo "data: " . json_encode([
                    "type" => "new_notification", 
                    "notification" => $notification
                ]) . "\n\n";
                ob_flush();
                flush();
            }

            // Longer sleep to reduce server load
            sleep(5);
        }
    } catch (Exception $e) {
        echo "data: " . json_encode(["error" => $e->getMessage()]) . "\n\n";
        ob_flush();
        flush();
    }
    exit;
}

echo json_encode(["ok" => false, "error" => "Invalid action"]);
?>