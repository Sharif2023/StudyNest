<?php
require_once "db.php";
date_default_timezone_set('Asia/Dhaka');

$allowedOrigin = "http://localhost:5173";
header("Access-Control-Allow-Origin: $allowedOrigin");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

try {
    // Find due reminders that haven't been sent
    $stmt = $pdo->prepare("
        SELECT id, student_id, title, message, reference_id, scheduled_at
        FROM notifications 
        WHERE type = 'todo_reminder'
          AND sent_at IS NULL
          AND scheduled_at <= NOW()
    ");
    $stmt->execute();
    $dueReminders = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($dueReminders)) {
        echo json_encode(["ok" => true, "message" => "No due reminders."]);
        exit;
    }

    $processed = 0;
    foreach ($dueReminders as $reminder) {
        // Mark as sent first to avoid duplicates
        $updateStmt = $pdo->prepare("
            UPDATE notifications 
            SET sent_at = NOW() 
            WHERE id = ? AND sent_at IS NULL
        ");
        $updateStmt->execute([$reminder['id']]);
        
        if ($updateStmt->rowCount() === 0) {
            continue; // Already processed by another request
        }

        // Create visible notification
        $insertStmt = $pdo->prepare("
            INSERT INTO notifications 
            (student_id, title, message, type, reference_id, created_at, link)
            VALUES (?, ?, ?, 'todo_reminder', ?, NOW(), ?)
        ");
        
        $title = "⏰ Task Reminder: " . $reminder['title'];
        $message = $reminder['message'] ?: "Your task is due soon!";
        $link = "/to-do-list"; // Link to todo list page
        
        $insertStmt->execute([
            $reminder['student_id'],
            $title,
            $message,
            $reminder['reference_id'],
            $link
        ]);
        
        $processed++;
    }

    echo json_encode([
        "ok" => true,
        "message" => "Processed $processed reminders.",
        "processed" => $processed
    ]);

} catch (Exception $e) {
    error_log("notify_due_todos error: " . $e->getMessage());
    echo json_encode([
        "ok" => false,
        "error" => "Server error processing reminders"
    ]);
}
?>