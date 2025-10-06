<?php
header("Content-Type: application/json; charset=utf-8");
$origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Origin: $origin");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require_once __DIR__ . '/db.php';
if (session_status() !== PHP_SESSION_ACTIVE) { @session_start(); }

function n_json($arr, $code = 200){ http_response_code($code); echo json_encode($arr, JSON_UNESCAPED_SLASHES); exit; }
function n_body(){ $raw=file_get_contents('php://input'); if(!$raw) return []; $j=json_decode($raw,true); return is_array($j)?$j:[]; }

// Auto-create notifications table
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS notifications (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            user_id INT UNSIGNED NULL,
            student_id VARCHAR(32) NULL,
            type VARCHAR(64) NOT NULL,
            title VARCHAR(255) NOT NULL,
            body TEXT NULL,
            link VARCHAR(1024) NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            read_at DATETIME NULL,
            INDEX idx_user (user_id),
            INDEX idx_student (student_id),
            INDEX idx_read (read_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");
} catch (Throwable $e) {
    n_json(["ok"=>false,"error"=>"db_init_failed","detail"=>$e->getMessage()],500);
}

$action = $_GET['action'] ?? ($_POST['action'] ?? 'list');

try {
    switch ($action) {
        // ------------------------------------------------------------
        // GET list: ?user_id= or ?student_id=, optional limit
        // ------------------------------------------------------------
        case 'list': {
            $uid = isset($_GET['user_id']) ? (int)$_GET['user_id'] : null;
            $sid = isset($_GET['student_id']) ? trim((string)$_GET['student_id']) : null;
            $limit = (int)($_GET['limit'] ?? 30);
            if ($limit < 1 || $limit > 200) $limit = 30;

            if ($uid) {
                $q = $pdo->prepare("SELECT * FROM notifications WHERE user_id=? ORDER BY (read_at IS NULL) DESC, id DESC LIMIT $limit");
                $q->execute([$uid]);
                $rows = $q->fetchAll(PDO::FETCH_ASSOC);
                $c = $pdo->prepare("SELECT COUNT(*) FROM notifications WHERE user_id=? AND read_at IS NULL");
                $c->execute([$uid]);
                $unread = (int)$c->fetchColumn();
                n_json(["ok"=>true, "notifications"=>$rows, "unread"=>$unread]);
            }
            if ($sid) {
                $q = $pdo->prepare("SELECT * FROM notifications WHERE student_id=? ORDER BY (read_at IS NULL) DESC, id DESC LIMIT $limit");
                $q->execute([$sid]);
                $rows = $q->fetchAll(PDO::FETCH_ASSOC);
                $c = $pdo->prepare("SELECT COUNT(*) FROM notifications WHERE student_id=? AND read_at IS NULL");
                $c->execute([$sid]);
                $unread = (int)$c->fetchColumn();
                n_json(["ok"=>true, "notifications"=>$rows, "unread"=>$unread]);
            }
            n_json(["ok"=>false, "error"=>"missing_user_param"], 400);
        }

        // ------------------------------------------------------------
        // POST create: {user_id? , student_id?, type, title, body?, link?}
        // ------------------------------------------------------------
        case 'create': {
            $b = n_body();
            $uid = isset($b['user_id']) ? (int)$b['user_id'] : null;
            $sid = isset($b['student_id']) ? trim((string)$b['student_id']) : null;
            $type = trim((string)($b['type'] ?? 'activity'));
            $title = trim((string)($b['title'] ?? ''));
            $body = isset($b['body']) ? trim((string)$b['body']) : null;
            $link = isset($b['link']) ? trim((string)$b['link']) : null;
            if ($title === '' || (!$uid && $sid === '')) n_json(["ok"=>false,"error"=>"invalid_params"],400);

            $ins = $pdo->prepare("INSERT INTO notifications (user_id, student_id, type, title, body, link) VALUES (?,?,?,?,?,?)");
            $ins->execute([$uid ?: null, $sid ?: null, $type, $title, $body, $link]);
            n_json(["ok"=>true, "id"=>(int)$pdo->lastInsertId()]);
        }

        // ------------------------------------------------------------
        // POST mark_read: {ids: [..]} or mark_all_read
        // requires user scope via user_id or student_id to prevent mass marking
        // ------------------------------------------------------------
        case 'mark_read': {
            $b = n_body();
            $ids = isset($b['ids']) && is_array($b['ids']) ? array_map('intval', $b['ids']) : [];
            $uid = isset($b['user_id']) ? (int)$b['user_id'] : null;
            $sid = isset($b['student_id']) ? trim((string)$b['student_id']) : null;
            $now = date('Y-m-d H:i:s');

            if (($uid || $sid) && !empty($ids)) {
                $in = implode(',', array_fill(0, count($ids), '?'));
                if ($uid) {
                    $st = $pdo->prepare("UPDATE notifications SET read_at=? WHERE user_id=? AND id IN ($in)");
                    $st->execute(array_merge([$now, $uid], $ids));
                    n_json(["ok"=>true]);
                } else {
                    $st = $pdo->prepare("UPDATE notifications SET read_at=? WHERE student_id=? AND id IN ($in)");
                    $st->execute(array_merge([$now, $sid], $ids));
                    n_json(["ok"=>true]);
                }
            }

            if (($uid || $sid) && ($b['mark_all'] ?? false)) {
                if ($uid) {
                    $st = $pdo->prepare("UPDATE notifications SET read_at=? WHERE user_id=? AND read_at IS NULL");
                    $st->execute([$now, $uid]);
                } else {
                    $st = $pdo->prepare("UPDATE notifications SET read_at=? WHERE student_id=? AND read_at IS NULL");
                    $st->execute([$now, $sid]);
                }
                n_json(["ok"=>true]);
            }
            n_json(["ok"=>false, "error"=>"invalid_params"], 400);
        }

        default:
            n_json(["ok"=>false, "error"=>"unknown_action"], 404);
    }
} catch (Throwable $t) {
    n_json(["ok"=>false, "error"=>"server_error", "detail"=>$t->getMessage()], 500);
}


