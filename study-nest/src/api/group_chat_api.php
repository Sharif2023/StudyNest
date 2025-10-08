<?php
// Group Chat API for students
// Handles group chat messages, participants, and real-time functionality

header("Content-Type: application/json; charset=utf-8");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '*';
header("Access-Control-Allow-Origin: $origin");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/db.php';

// Start session if not already started
if (session_status() !== PHP_SESSION_ACTIVE) {
    @session_start();
}

// Helper functions
function json_ok($data = []) {
    echo json_encode(['ok' => true] + $data, JSON_UNESCAPED_SLASHES);
    exit;
}

function json_err($msg, $code = 400, $extra = []) {
    http_response_code($code);
    echo json_encode(['ok' => false, 'error' => $msg] + $extra, JSON_UNESCAPED_SLASHES);
    exit;
}

function getCurrentUser($pdo) {
    $uid = $_SESSION['user_id'] ?? null;
    if (!$uid) {
        json_err("unauthorized", 401);
    }
    
    $stmt = $pdo->prepare("SELECT id, username, email, student_id FROM users WHERE id=?");
    $stmt->execute([$uid]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$user) {
        json_err("unauthorized", 401);
    }
    
    return $user;
}

// Ensure group chat tables exist
function ensureGroupChatTables($pdo) {
    // These tables should already exist from admin_api.php, but let's ensure they're here
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS group_chats (
          id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          chat_name VARCHAR(255) NOT NULL,
          course_section_id INT UNSIGNED NOT NULL,
          description TEXT NULL,
          is_active BOOLEAN DEFAULT TRUE,
          created_by INT UNSIGNED NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (course_section_id) REFERENCES course_sections(id) ON DELETE CASCADE,
          FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_course_section_id (course_section_id),
          INDEX idx_created_by (created_by),
          INDEX idx_is_active (is_active)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");
    
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS group_chat_participants (
          id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          group_chat_id INT UNSIGNED NOT NULL,
          user_id INT UNSIGNED NOT NULL,
          joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          is_admin BOOLEAN DEFAULT FALSE,
          UNIQUE KEY unique_chat_user (group_chat_id, user_id),
          FOREIGN KEY (group_chat_id) REFERENCES group_chats(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_group_chat_id (group_chat_id),
          INDEX idx_user_id (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");
    
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS group_chat_messages (
          id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          group_chat_id INT UNSIGNED NOT NULL,
          sender_id INT UNSIGNED NOT NULL,
          message_type ENUM('text', 'file', 'image', 'system') DEFAULT 'text',
          body TEXT NULL,
          attachment_url VARCHAR(1024) NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (group_chat_id) REFERENCES group_chats(id) ON DELETE CASCADE,
          FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_group_chat_id (group_chat_id, created_at),
          INDEX idx_sender_id (sender_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");
    
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS group_chat_message_reads (
          group_chat_id INT UNSIGNED NOT NULL,
          user_id INT UNSIGNED NOT NULL,
          last_read_message_id BIGINT UNSIGNED NOT NULL DEFAULT 0,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (group_chat_id, user_id),
          FOREIGN KEY (group_chat_id) REFERENCES group_chats(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_user_id (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");
}

try {
    ensureGroupChatTables($pdo);
    $user = getCurrentUser($pdo);
} catch (Exception $e) {
    json_err("Database error", 500, ['detail' => $e->getMessage()]);
}

$action = $_GET['action'] ?? null;

switch ($action) {
    // Get user's group chats
    case 'my_group_chats':
        $sql = "
            SELECT gc.*, cs.section_name, c.course_code, c.course_title, at.term_name,
                   COUNT(gcm.id) as message_count,
                   (SELECT gcm2.body FROM group_chat_messages gcm2 
                    WHERE gcm2.group_chat_id = gc.id 
                    ORDER BY gcm2.created_at DESC LIMIT 1) as last_message,
                   (SELECT gcm2.created_at FROM group_chat_messages gcm2 
                    WHERE gcm2.group_chat_id = gc.id 
                    ORDER BY gcm2.created_at DESC LIMIT 1) as last_message_time
            FROM group_chat_participants gcp
            JOIN group_chats gc ON gcp.group_chat_id = gc.id
            JOIN course_sections cs ON gc.course_section_id = cs.id
            JOIN courses c ON cs.course_id = c.id
            JOIN academic_terms at ON cs.term_id = at.id
            LEFT JOIN group_chat_messages gcm ON gc.id = gcm.group_chat_id
            WHERE gcp.user_id = ? AND gc.is_active = 1
            GROUP BY gc.id
            ORDER BY last_message_time DESC, gc.created_at DESC
        ";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$user['id']]);
        json_ok(['group_chats' => $stmt->fetchAll()]);

    // Get group chat messages
    case 'get_messages':
        $group_chat_id = (int) ($_GET['group_chat_id'] ?? 0);
        $since_id = (int) ($_GET['since_id'] ?? 0);
        
        if (!$group_chat_id) {
            json_err("group_chat_id required");
        }
        
        // Check if user is participant
        $stmt = $pdo->prepare("SELECT 1 FROM group_chat_participants WHERE group_chat_id = ? AND user_id = ?");
        $stmt->execute([$group_chat_id, $user['id']]);
        if (!$stmt->fetchColumn()) {
            json_err("forbidden", 403);
        }
        
        if ($since_id > 0) {
            // Get new messages since last check
            $sql = "
                SELECT gcm.*, u.username, u.student_id
                FROM group_chat_messages gcm
                JOIN users u ON gcm.sender_id = u.id
                WHERE gcm.group_chat_id = ? AND gcm.id > ?
                ORDER BY gcm.created_at ASC
                LIMIT 200
            ";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$group_chat_id, $since_id]);
        } else {
            // Get last 50 messages
            $sql = "
                SELECT gcm.*, u.username, u.student_id
                FROM group_chat_messages gcm
                JOIN users u ON gcm.sender_id = u.id
                WHERE gcm.group_chat_id = ?
                ORDER BY gcm.created_at DESC
                LIMIT 50
            ";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$group_chat_id]);
            $messages = $stmt->fetchAll();
            $messages = array_reverse($messages); // Reverse to show oldest first
        }
        
        json_ok(['messages' => $messages ?? []]);

    // Send message to group chat
    case 'send_message':
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $group_chat_id = (int) ($input['group_chat_id'] ?? 0);
        $body = trim($input['body'] ?? '');
        $message_type = $input['message_type'] ?? 'text';
        $attachment_url = $input['attachment_url'] ?? null;
        
        if (!$group_chat_id || (!$body && !$attachment_url)) {
            json_err("group_chat_id and body or attachment_url required");
        }
        
        // Check if user is participant
        $stmt = $pdo->prepare("SELECT 1 FROM group_chat_participants WHERE group_chat_id = ? AND user_id = ?");
        $stmt->execute([$group_chat_id, $user['id']]);
        if (!$stmt->fetchColumn()) {
            json_err("forbidden", 403);
        }
        
        // Insert message
        $stmt = $pdo->prepare("
            INSERT INTO group_chat_messages (group_chat_id, sender_id, message_type, body, attachment_url) 
            VALUES (?, ?, ?, ?, ?)
        ");
        $stmt->execute([$group_chat_id, $user['id'], $message_type, $body ?: null, $attachment_url]);
        $message_id = $pdo->lastInsertId();
        
        // Update read status
        $stmt = $pdo->prepare("
            INSERT INTO group_chat_message_reads (group_chat_id, user_id, last_read_message_id) 
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE last_read_message_id = GREATEST(last_read_message_id, VALUES(last_read_message_id))
        ");
        $stmt->execute([$group_chat_id, $user['id'], $message_id]);
        
        // Get the message with user info
        $stmt = $pdo->prepare("
            SELECT gcm.*, u.username, u.student_id
            FROM group_chat_messages gcm
            JOIN users u ON gcm.sender_id = u.id
            WHERE gcm.id = ?
        ");
        $stmt->execute([$message_id]);
        $message = $stmt->fetch(PDO::FETCH_ASSOC);
        
        json_ok(['message' => $message]);

    // Mark messages as read
    case 'mark_read':
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $group_chat_id = (int) ($input['group_chat_id'] ?? 0);
        $last_read_message_id = (int) ($input['last_read_message_id'] ?? 0);
        
        if (!$group_chat_id) {
            json_err("group_chat_id required");
        }
        
        // Check if user is participant
        $stmt = $pdo->prepare("SELECT 1 FROM group_chat_participants WHERE group_chat_id = ? AND user_id = ?");
        $stmt->execute([$group_chat_id, $user['id']]);
        if (!$stmt->fetchColumn()) {
            json_err("forbidden", 403);
        }
        
        $stmt = $pdo->prepare("
            INSERT INTO group_chat_message_reads (group_chat_id, user_id, last_read_message_id) 
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE last_read_message_id = GREATEST(last_read_message_id, VALUES(last_read_message_id))
        ");
        $stmt->execute([$group_chat_id, $user['id'], $last_read_message_id]);
        
        json_ok();

    // Get group chat participants
    case 'get_participants':
        $group_chat_id = (int) ($_GET['group_chat_id'] ?? 0);
        
        if (!$group_chat_id) {
            json_err("group_chat_id required");
        }
        
        // Check if user is participant
        $stmt = $pdo->prepare("SELECT 1 FROM group_chat_participants WHERE group_chat_id = ? AND user_id = ?");
        $stmt->execute([$group_chat_id, $user['id']]);
        if (!$stmt->fetchColumn()) {
            json_err("forbidden", 403);
        }
        
        $sql = "
            SELECT u.id, u.username, u.student_id, u.email, gcp.joined_at, gcp.is_admin
            FROM group_chat_participants gcp
            JOIN users u ON gcp.user_id = u.id
            WHERE gcp.group_chat_id = ?
            ORDER BY gcp.is_admin DESC, gcp.joined_at ASC
        ";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$group_chat_id]);
        
        json_ok(['participants' => $stmt->fetchAll()]);

    // Join group chat (if user is enrolled in the course section)
    case 'join_group_chat':
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $group_chat_id = (int) ($input['group_chat_id'] ?? 0);
        
        if (!$group_chat_id) {
            json_err("group_chat_id required");
        }
        
        // Check if user is already a participant
        $stmt = $pdo->prepare("SELECT 1 FROM group_chat_participants WHERE group_chat_id = ? AND user_id = ?");
        $stmt->execute([$group_chat_id, $user['id']]);
        if ($stmt->fetchColumn()) {
            json_err("already_participant");
        }
        
        // For now, allow anyone to join any group chat
        // In a real system, you might want to check if user is enrolled in the course section
        $stmt = $pdo->prepare("INSERT INTO group_chat_participants (group_chat_id, user_id) VALUES (?, ?)");
        $stmt->execute([$group_chat_id, $user['id']]);
        
        json_ok(['joined' => true]);

    // Leave group chat
    case 'leave_group_chat':
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $group_chat_id = (int) ($input['group_chat_id'] ?? 0);
        
        if (!$group_chat_id) {
            json_err("group_chat_id required");
        }
        
        $stmt = $pdo->prepare("DELETE FROM group_chat_participants WHERE group_chat_id = ? AND user_id = ?");
        $stmt->execute([$group_chat_id, $user['id']]);
        
        json_ok(['left' => true]);

    // Get unread message counts for all group chats
    case 'get_unread_counts':
        $sql = "
            SELECT gc.id as group_chat_id, 
                   COUNT(gcm.id) as unread_count
            FROM group_chat_participants gcp
            JOIN group_chats gc ON gcp.group_chat_id = gc.id
            LEFT JOIN group_chat_messages gcm ON gc.id = gcm.group_chat_id
            LEFT JOIN group_chat_message_reads gcmr ON gc.id = gcmr.group_chat_id AND gcmr.user_id = ?
            WHERE gcp.user_id = ? 
              AND gc.is_active = 1
              AND gcm.id > COALESCE(gcmr.last_read_message_id, 0)
            GROUP BY gc.id
        ";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$user['id'], $user['id']]);
        
        $unread_counts = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $unread_counts[$row['group_chat_id']] = (int) $row['unread_count'];
        }
        
        json_ok(['unread_counts' => $unread_counts]);

    default:
        json_ok([
            'endpoints' => [
                'GET  group_chat_api.php?action=my_group_chats',
                'GET  group_chat_api.php?action=get_messages&group_chat_id=123&since_id=0',
                'POST group_chat_api.php?action=send_message {group_chat_id, body, message_type, attachment_url}',
                'POST group_chat_api.php?action=mark_read {group_chat_id, last_read_message_id}',
                'GET  group_chat_api.php?action=get_participants&group_chat_id=123',
                'POST group_chat_api.php?action=join_group_chat {group_chat_id}',
                'POST group_chat_api.php?action=leave_group_chat {group_chat_id}',
                'GET  group_chat_api.php?action=get_unread_counts'
            ]
        ]);
}

