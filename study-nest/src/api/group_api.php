<?php
session_start();

/*************** CORS ***************/
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

/*************** JSON + error handling ***************/
header("Content-Type: application/json; charset=utf-8");
ini_set('display_errors', '0');
ini_set('html_errors', '0');
error_reporting(E_ALL);

// Debug helper (optional, remove in production)
error_log("SESSION USER_ID: " . ($_SESSION['user_id'] ?? 'none'));

set_exception_handler(function ($e) {
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'error' => 'exception',
        'message' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
    exit;
});

/*************** Require login ***************/
if (!isset($_SESSION['user_id'])) {
    echo json_encode(["ok" => false, "error" => "Not logged in"]);
    exit;
}

$user_id = $_SESSION['user_id']; // ✅ always from session


/*************** DB Connection ***************/
require "db.php"; // must define $pdo (PDO connection)

/*************** Helpers ***************/
function j($data)
{
    echo json_encode($data);
    exit;
}

/*************** Auto-create tables ***************/
$pdo->exec("
    CREATE TABLE IF NOT EXISTS groups (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        section_name VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
");

$pdo->exec("
    CREATE TABLE IF NOT EXISTS group_members (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        group_id INT UNSIGNED NOT NULL,
        user_id INT UNSIGNED NOT NULL,
        status ENUM('pending','accepted','rejected') DEFAULT 'pending',
        proof_url VARCHAR(500) DEFAULT NULL,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_member (group_id, user_id),
        FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;
");

$pdo->exec("
    CREATE TABLE IF NOT EXISTS group_messages (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        group_id INT UNSIGNED NOT NULL,
        user_id INT UNSIGNED NOT NULL,
        message TEXT NOT NULL,
        attachment_url VARCHAR(255) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;
");

/*************** Routing ***************/
$action = $_GET['action'] ?? '';

switch ($action) {

    /* ---------- Join group ---------- */
    case "join_group": {
        if ($_SERVER['REQUEST_METHOD'] !== "POST") {
            j(["ok" => false, "error" => "invalid_method"]);
        }

        $group_id = intval($_POST['group_id'] ?? 0);
        if (!$group_id || !$user_id) {
            j(["ok" => false, "error" => "missing_group_or_user"]);
        }

        // Handle proof file
        $proofUrl = null;
        if (!empty($_FILES['proof']['name'])) {
            $uploadDir = __DIR__ . "/proofs/";
            if (!is_dir($uploadDir))
                mkdir($uploadDir, 0777, true);

            $filename = time() . "_" . basename($_FILES['proof']['name']);
            $target = $uploadDir . $filename;

            if (move_uploaded_file($_FILES['proof']['tmp_name'], $target)) {
                $proofUrl = "http://localhost/StudyNest/study-nest/src/api/proofs/" . $filename;
            }
        }

        // Check if row exists
        $stmt = $pdo->prepare("SELECT id, status FROM group_members WHERE group_id=? AND user_id=?");
        $stmt->execute([$group_id, $user_id]);
        $existing = $stmt->fetch();

        if ($existing) {
            if ($existing['status'] === 'rejected') {
                // reset rejected → pending
                $stmt = $pdo->prepare("UPDATE group_members SET status='pending', proof_url=? WHERE id=?");
                $stmt->execute([$proofUrl, $existing['id']]);
            } else {
                // update proof if already pending
                $stmt = $pdo->prepare("UPDATE group_members SET status='pending', proof_url=? WHERE id=?");
                $stmt->execute([$proofUrl, $existing['id']]);
            }
        } else {
            // fresh insert
            $stmt = $pdo->prepare("
            INSERT INTO group_members (group_id, user_id, status, proof_url)
            VALUES (?, ?, 'pending', ?)
        ");
            $stmt->execute([$group_id, $user_id, $proofUrl]);
        }

        j(["ok" => true, "message" => "Join request sent"]);
    }

    /* ---------- Leave group ---------- */
    case "leave_group": {
        if ($_SERVER['REQUEST_METHOD'] !== "POST") {
            j(["ok" => false, "error" => "invalid_method"]);
        }

        $data = json_decode(file_get_contents("php://input"), true);
        $group_id = intval($data['group_id'] ?? ($_POST['group_id'] ?? 0));

        if (!$group_id || !$user_id) {
            j(["ok" => false, "error" => "missing_group_or_user"]);
        }

        $stmt = $pdo->prepare("DELETE FROM group_members WHERE group_id = ? AND user_id = ?");
        $stmt->execute([$group_id, $user_id]);

        j(["ok" => true, "message" => "You left the group"]);
    }

    /* ---------- List my groups ---------- */
    case "my_groups": {
        $stmt = $pdo->prepare("
            SELECT g.id, g.section_name, gm.status
            FROM group_members gm
            JOIN groups g ON gm.group_id = g.id
            WHERE gm.user_id = ?
        ");
        $stmt->execute([$user_id]);
        j(["ok" => true, "groups" => $stmt->fetchAll()]);
    }

    /* ---------- Get group messages ---------- */
    case "messages": {
        $group_id = intval($_GET['group_id'] ?? 0);
        if (!$group_id)
            j(["ok" => false, "error" => "missing_group_id"]);

        $stmt = $pdo->prepare("
        SELECT gm.id, gm.user_id, u.username, gm.message, gm.attachment_url, gm.created_at
        FROM group_messages gm
        JOIN users u ON gm.user_id = u.id
        WHERE gm.group_id = ?
        ORDER BY gm.created_at ASC
    ");
        $stmt->execute([$group_id]);
        j(["ok" => true, "messages" => $stmt->fetchAll()]);
    }

    /* ---------- Send a message ---------- */
    case "send_message": {
        if ($_SERVER['REQUEST_METHOD'] !== "POST") {
            j(["ok" => false, "error" => "invalid_method"]);
        }

        $group_id = intval($_POST['group_id'] ?? 0);
        $msg = trim($_POST['message'] ?? "");
        $attachmentUrl = null;

        // ✅ Handle file upload (image, pdf, audio, video, etc.)
        if (!empty($_FILES['attachment']['name'])) {
            $uploadDir = __DIR__ . "/uploads/";
            if (!is_dir($uploadDir))
                mkdir($uploadDir, 0777, true);

            $filename = time() . "_" . basename($_FILES['attachment']['name']);
            $target = $uploadDir . $filename;

            if (move_uploaded_file($_FILES['attachment']['tmp_name'], $target)) {
                $attachmentUrl = "http://localhost/StudyNest/study-nest/src/api/uploads/" . $filename;
            }
        }

        if (!$group_id || (!$msg && !$attachmentUrl)) {
            j(["ok" => false, "error" => "missing_group_or_message"]);
        }

        $stmt = $pdo->prepare("
        INSERT INTO group_messages (group_id, user_id, message, attachment_url)
        VALUES (?, ?, ?, ?)
    ");
        $stmt->execute([$group_id, $user_id, $msg, $attachmentUrl]);

        j(["ok" => true, "message" => "Message sent"]);
    }

    /* ---------- Cancel join request ---------- */
    case "cancel_request": {
        if ($_SERVER['REQUEST_METHOD'] !== "POST") {
            j(["ok" => false, "error" => "invalid_method"]);
        }
        $data = json_decode(file_get_contents("php://input"), true);
        $group_id = intval($data['group_id'] ?? 0);
        if (!$group_id || !$user_id) {
            j(["ok" => false, "error" => "missing_group_or_user"]);
        }

        $stmt = $pdo->prepare("DELETE FROM group_members WHERE group_id = ? AND user_id = ? AND status='pending'");
        $stmt->execute([$group_id, $user_id]);

        j(["ok" => true, "message" => "Join request cancelled"]);
    }

    /* ---------- Get group members ---------- */
    case "members": {
        $group_id = intval($_GET['group_id'] ?? 0);
        if (!$group_id) {
            j(["ok" => false, "error" => "missing_group_id"]);
        }

        $stmt = $pdo->prepare("
            SELECT u.id, u.username, u.email, gm.status, gm.joined_at
            FROM group_members gm
            JOIN users u ON gm.user_id = u.id
            WHERE gm.group_id = ? AND gm.status = 'accepted'
            ORDER BY u.username ASC
        ");
        $stmt->execute([$group_id]);
        $members = $stmt->fetchAll(PDO::FETCH_ASSOC);

        j(["ok" => true, "members" => $members]);
    }


    /* ---------- Default ---------- */
    default:
        j(["ok" => false, "error" => "unknown_action"]);
}
