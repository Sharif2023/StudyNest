<?php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

$user_id = requireAuth();

function j(array $data, int $code = 200): void
{
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_SLASHES);
    exit;
}

function request_data(): array
{
    $raw = file_get_contents("php://input");
    $json = $raw ? json_decode($raw, true) : null;
    return is_array($json) ? $json : $_POST;
}

function safe_upload(array $file, string $subdir, array $allowedExt, int $maxBytes): ?string
{
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        j(["ok" => false, "error" => "upload_error"], 400);
    }
    if (!is_uploaded_file($file['tmp_name'])) {
        j(["ok" => false, "error" => "invalid_upload"], 400);
    }
    if ((int)($file['size'] ?? 0) <= 0 || (int)$file['size'] > $maxBytes) {
        j(["ok" => false, "error" => "file_too_large"], 400);
    }

    $origName = (string)($file['name'] ?? 'file');
    $ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION));
    if (!$ext || !in_array($ext, $allowedExt, true)) {
        j(["ok" => false, "error" => "unsupported_file_type"], 400);
    }

    $base = preg_replace('/[^a-zA-Z0-9._-]/', '_', pathinfo($origName, PATHINFO_FILENAME));
    $base = trim($base, '._-') ?: 'file';
    $filename = $base . '_' . bin2hex(random_bytes(8)) . '.' . $ext;

    $dir = __DIR__ . DIRECTORY_SEPARATOR . $subdir;
    if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
        j(["ok" => false, "error" => "upload_dir_failed"], 500);
    }

    $target = $dir . DIRECTORY_SEPARATOR . $filename;
    if (!move_uploaded_file($file['tmp_name'], $target)) {
        j(["ok" => false, "error" => "upload_save_failed"], 500);
    }

    return $subdir . "/" . $filename;
}

function ensure_group_exists(PDO $pdo, int $group_id): void
{
    $stmt = $pdo->prepare("SELECT 1 FROM groups WHERE id = ? LIMIT 1");
    $stmt->execute([$group_id]);
    if (!$stmt->fetchColumn()) {
        j(["ok" => false, "error" => "group_not_found"], 404);
    }
}

function ensure_group_member(PDO $pdo, int $group_id, int $user_id): void
{
    $stmt = $pdo->prepare("
        SELECT 1
        FROM group_members
        WHERE group_id = ? AND user_id = ? AND status = 'accepted'
        LIMIT 1
    ");
    $stmt->execute([$group_id, $user_id]);
    if (!$stmt->fetchColumn()) {
        j(["ok" => false, "error" => "forbidden"], 403);
    }
}

$action = $_GET['action'] ?? $_POST['action'] ?? '';

switch ($action) {
    case "list_groups": {
        $stmt = $pdo->query("SELECT id, section_name, created_at FROM groups ORDER BY section_name");
        j(["ok" => true, "groups" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    }

    case "group_meta": {
        $group_id = (int)($_GET['group_id'] ?? 0);
        if (!$group_id) j(["ok" => false, "error" => "missing_group_id"], 400);
        $stmt = $pdo->prepare("SELECT id, section_name, created_at FROM groups WHERE id = ? LIMIT 1");
        $stmt->execute([$group_id]);
        $group = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$group) j(["ok" => false, "error" => "group_not_found"], 404);
        j(["ok" => true, "group" => $group]);
    }

    case "join_group": {
        if ($_SERVER['REQUEST_METHOD'] !== "POST") j(["ok" => false, "error" => "invalid_method"], 405);
        $group_id = (int)($_POST['group_id'] ?? 0);
        if (!$group_id) j(["ok" => false, "error" => "missing_group_or_user"], 400);
        ensure_group_exists($pdo, $group_id);

        $proofUrl = null;
        if (!empty($_FILES['proof']['name'])) {
            $proofUrl = safe_upload(
                $_FILES['proof'],
                "proofs",
                ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'csv'],
                10 * 1024 * 1024
            );
        }

        $stmt = $pdo->prepare("SELECT id FROM group_members WHERE group_id = ? AND user_id = ? LIMIT 1");
        $stmt->execute([$group_id, $user_id]);
        $existingId = $stmt->fetchColumn();

        if ($existingId) {
            $stmt = $pdo->prepare("UPDATE group_members SET status = 'pending', proof_url = COALESCE(?, proof_url) WHERE id = ?");
            $stmt->execute([$proofUrl, $existingId]);
        } else {
            $stmt = $pdo->prepare("
                INSERT INTO group_members (group_id, user_id, status, proof_url)
                VALUES (?, ?, 'pending', ?)
            ");
            $stmt->execute([$group_id, $user_id, $proofUrl]);
        }

        j(["ok" => true, "message" => "Join request sent"]);
    }

    case "leave_group": {
        if ($_SERVER['REQUEST_METHOD'] !== "POST") j(["ok" => false, "error" => "invalid_method"], 405);
        $data = request_data();
        $group_id = (int)($data['group_id'] ?? 0);
        if (!$group_id) j(["ok" => false, "error" => "missing_group_or_user"], 400);

        $stmt = $pdo->prepare("DELETE FROM group_members WHERE group_id = ? AND user_id = ?");
        $stmt->execute([$group_id, $user_id]);
        j(["ok" => true, "message" => "You left the group"]);
    }

    case "my_groups": {
        $stmt = $pdo->prepare("
            SELECT g.id, g.section_name, gm.status
            FROM group_members gm
            JOIN groups g ON gm.group_id = g.id
            WHERE gm.user_id = ?
            ORDER BY g.section_name
        ");
        $stmt->execute([$user_id]);
        j(["ok" => true, "groups" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    }

    case "messages": {
        $group_id = (int)($_GET['group_id'] ?? 0);
        if (!$group_id) j(["ok" => false, "error" => "missing_group_id"], 400);
        ensure_group_member($pdo, $group_id, (int)$user_id);

        $stmt = $pdo->prepare("
            SELECT gm.id, gm.user_id, u.username, gm.message, gm.attachment_url, gm.created_at
            FROM group_messages gm
            JOIN users u ON gm.user_id = u.id
            WHERE gm.group_id = ?
            ORDER BY gm.created_at ASC, gm.id ASC
        ");
        $stmt->execute([$group_id]);
        j(["ok" => true, "messages" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    }

    case "send_message": {
        if ($_SERVER['REQUEST_METHOD'] !== "POST") j(["ok" => false, "error" => "invalid_method"], 405);
        $group_id = (int)($_POST['group_id'] ?? 0);
        $msg = trim((string)($_POST['message'] ?? ""));
        if (!$group_id) j(["ok" => false, "error" => "missing_group_id"], 400);
        ensure_group_member($pdo, $group_id, (int)$user_id);

        $attachmentUrl = null;
        if (!empty($_FILES['attachment']['name'])) {
            $attachmentUrl = safe_upload(
                $_FILES['attachment'],
                "uploads",
                ['png','jpg','jpeg','gif','webp','pdf','txt','md','doc','docx','ppt','pptx','xls','xlsx','csv','zip','mp3','wav','ogg','m4a','webm','mp4','mov'],
                25 * 1024 * 1024
            );
        }

        if ($msg === "" && !$attachmentUrl) {
            j(["ok" => false, "error" => "missing_group_or_message"], 400);
        }

        $stmt = $pdo->prepare("
            INSERT INTO group_messages (group_id, user_id, message, attachment_url)
            VALUES (?, ?, NULLIF(?, ''), ?)
        ");
        $stmt->execute([$group_id, $user_id, $msg, $attachmentUrl]);

        j(["ok" => true, "message" => "Message sent"]);
    }

    case "cancel_request": {
        if ($_SERVER['REQUEST_METHOD'] !== "POST") j(["ok" => false, "error" => "invalid_method"], 405);
        $data = request_data();
        $group_id = (int)($data['group_id'] ?? 0);
        if (!$group_id) j(["ok" => false, "error" => "missing_group_or_user"], 400);

        $stmt = $pdo->prepare("DELETE FROM group_members WHERE group_id = ? AND user_id = ? AND status = 'pending'");
        $stmt->execute([$group_id, $user_id]);
        j(["ok" => true, "message" => "Join request cancelled"]);
    }

    case "members": {
        $group_id = (int)($_GET['group_id'] ?? 0);
        if (!$group_id) j(["ok" => false, "error" => "missing_group_id"], 400);
        ensure_group_member($pdo, $group_id, (int)$user_id);

        $stmt = $pdo->prepare("
            SELECT u.id, u.username, u.email, gm.status, gm.joined_at
            FROM group_members gm
            JOIN users u ON gm.user_id = u.id
            WHERE gm.group_id = ? AND gm.status = 'accepted'
            ORDER BY u.username ASC
        ");
        $stmt->execute([$group_id]);
        j(["ok" => true, "members" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    }

    default:
        j(["ok" => false, "error" => "unknown_action"], 404);
}
?>
