<?php
require_once "db.php";
date_default_timezone_set('Asia/Dhaka'); // adjust to your local timezone

$allowedOrigin = "http://localhost:5173";
header("Access-Control-Allow-Origin: $allowedOrigin");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

try {
    // 1. Find reminders that are due (time reached but not yet sent)
    $stmt = $pdo->query("
        SELECT id, student_id, title, message, reference_id
        FROM notifications
        WHERE type='todo_reminder'
          AND sent_at IS NULL
          AND scheduled_at <= NOW()
    ");

    $dueReminders = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($dueReminders)) {
        echo json_encode(["ok" => true, "message" => "No due reminders."]);
        exit;
    }

    // 2. Process each reminder
    foreach ($dueReminders as $r) {
        // Mark as sent
        $upd = $pdo->prepare("UPDATE notifications SET sent_at=NOW() WHERE id=?");
        $upd->execute([$r['id']]);

        // Create the live (visible) notification entry
        $ins = $pdo->prepare("
            INSERT INTO notifications (student_id, title, message, type, reference_id, created_at)
            VALUES (?, ?, ?, 'todo_reminder_live', ?, NOW())
        ");
        $liveTitle = "⏰ Reminder: " . $r['title'];
        $liveMsg = !empty($r['message'])
            ? $r['message']
            : "Your to-do task is due soon. Don’t forget to complete it!";
        $ins->execute([$r['student_id'], $liveTitle, $liveMsg, $r['reference_id']]);
    }

    echo json_encode([
        "ok" => true,
        "message" => "Processed " . count($dueReminders) . " reminders."
    ]);

} catch (Exception $e) {
    echo json_encode([
        "ok" => false,
        "error" => $e->getMessage()
    ]);
}
?>
