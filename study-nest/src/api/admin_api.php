<?php
/*************** Force JSON + convert PHP errors to JSON ***************/
header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', '0');
ini_set('html_errors', '0');
error_reporting(E_ALL);

set_error_handler(function ($errno, $errstr, $errfile, $errline) {
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'error' => 'php_error',
        'type' => $errno,
        'message' => $errstr,
        'file' => $errfile,
        'line' => $errline
    ]);
    exit;
});

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

// If anything still echoes HTML, capture and wrap as JSON
ob_start();
register_shutdown_function(function () {
    $out = ob_get_clean();
    if ($out === null)
        return;
    $trim = ltrim($out);
    if ($trim === '' || str_starts_with($trim, '{') || str_starts_with($trim, '[')) {
        echo $out; // already JSON
    } else {
        if (!headers_sent())
            http_response_code(500);
        echo json_encode(['ok' => false, 'error' => 'unexpected_output', 'raw' => $out]);
    }
});

/*************** CORS ***************/
$origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
header("Access-Control-Allow-Origin: $origin");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

/*************** CONFIG ***************/
$DB_HOST = 'localhost';
$DB_NAME = 'studynest';
$DB_USER = 'root';
$DB_PASS = '';
$DB_CHARSET = 'utf8mb4';

$AUTH_MODE = 'link_key';    // or 'none' for dev
$ADMIN_LINK_KEY = 'MYKEY123';   // must match frontend
$ALLOW_LOCAL_ONLY = true;

/*************** Helpers ***************/
function j($data)
{
    echo json_encode($data);
    exit;
}
function body_json()
{
    $raw = file_get_contents('php://input');
    if (!$raw)
        return [];
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

/*************** Local-only safety ***************/
if ($ALLOW_LOCAL_ONLY) {
    $ip = $_SERVER['REMOTE_ADDR'] ?? '';
    if (!in_array($ip, ['127.0.0.1', '::1'])) {
        http_response_code(403);
        j(['ok' => false, 'error' => 'local_only']);
    }
}

/*************** DB ***************/
$dsn = "mysql:host=$DB_HOST;dbname=$DB_NAME;charset=$DB_CHARSET";
$options = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
];
try {
    $pdo = new PDO($dsn, $DB_USER, $DB_PASS, $options);
    $hasRole = false;
    $hasStatus = false;
    try {
        $colStmt = $pdo->prepare("
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME IN ('role','status')
        ");
        $colStmt->execute([$DB_NAME]);
        $cols = $colStmt->fetchAll(PDO::FETCH_COLUMN);
        $hasRole = in_array('role', $cols, true);
        $hasStatus = in_array('status', $cols, true);
    } catch (Throwable $e) {
        // ignore
    }
} catch (Throwable $e) {
    http_response_code(500);
    j(['ok' => false, 'error' => 'db_connect_failed', 'detail' => $e->getMessage()]);
}

/*************** Routing + Auth ***************/
$action = $_GET['action'] ?? $_POST['action'] ?? '';
if ($action === 'health') {
    j(['ok' => true, 'status' => 'admin_api_up']);
}

if ($AUTH_MODE === 'link_key') {
    $k = $_GET['k'] ?? ($_POST['k'] ?? (body_json()['k'] ?? ''));
    if (!is_string($k) || !hash_equals($ADMIN_LINK_KEY, $k)) {
        http_response_code(403);
        j(['ok' => false, 'error' => 'forbidden', 'detail' => 'missing_or_invalid_key']);
    }
}

/*************** Routes ***************/
switch ($action) {
    /* ---------- Analytics ---------- */
    case 'stats': {
        $totalUsers = (int) $pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();
        $new30 = (int) $pdo->query("SELECT COUNT(*) FROM users WHERE created_at >= (NOW() - INTERVAL 30 DAY)")->fetchColumn();
        try {
            $activeRooms = (int) $pdo->query("SELECT COUNT(*) FROM meetings WHERE status='live'")->fetchColumn();
        } catch (Throwable $e) {
            $activeRooms = 0;
        }
        j([
            'ok' => true,
            'stats' => [
                'total_users' => $totalUsers,
                'new_signups_30d' => $new30,
                'active_rooms' => $activeRooms
            ]
        ]);
    }

    /* ---------- Users ---------- */
    case 'list_users': {
        $q = trim($_GET['q'] ?? '');
        $selectRole = $hasRole ? "role" : "'User'";
        $selectStatus = $hasStatus ? "status" : "'Active'";
        $baseSql = "SELECT id, username, email, $selectRole AS role, $selectStatus AS status, created_at FROM users";
        $order = " ORDER BY created_at DESC LIMIT 500";
        if ($q !== '') {
            if ($hasRole) {
                $sql = $baseSql . " WHERE username LIKE :q OR email LIKE :q OR role LIKE :q" . $order;
            } else {
                $sql = $baseSql . " WHERE username LIKE :q OR email LIKE :q" . $order;
            }
            $stmt = $pdo->prepare($sql);
            $stmt->execute([':q' => "%$q%"]);
        } else {
            $stmt = $pdo->query($baseSql . $order);
        }
        j(['ok' => true, 'users' => $stmt->fetchAll()]);
    }

    case 'toggle_user_status': {
        $b = body_json();
        $id = (int) ($b['id'] ?? 0);
        if (!$id)
            j(['ok' => false, 'error' => 'missing_id']);
        if (!$hasStatus) {
            j(['ok' => true, 'id' => $id, 'new_status' => 'Active', 'note' => 'status_column_missing']);
        }
        $row = $pdo->prepare("SELECT status FROM users WHERE id=?");
        $row->execute([$id]);
        $cur = $row->fetchColumn();
        if ($cur === false)
            j(['ok' => false, 'error' => 'user_not_found']);
        $next = ($cur === 'Active') ? 'Banned' : 'Active';
        $pdo->prepare("UPDATE users SET status=? WHERE id=?")->execute([$next, $id]);
        j(['ok' => true, 'id' => $id, 'new_status' => $next]);
    }

    case 'set_user_role': {
        $b = body_json();
        $id = (int) ($b['id'] ?? 0);
        $role = $b['role'] ?? '';
        if (!$id || !in_array($role, ['User', 'Admin'], true))
            j(['ok' => false, 'error' => 'invalid_input']);
        if (!$hasRole) {
            j(['ok' => true, 'id' => $id, 'new_role' => $role, 'note' => 'role_column_missing']);
        } else {
            $pdo->prepare("UPDATE users SET role=? WHERE id=?")->execute([$role, $id]);
            j(['ok' => true, 'id' => $id, 'new_role' => $role]);
        }
    }

    case 'delete_user': {
        $b = body_json();
        $id = (int) ($b['id'] ?? 0);
        if (!$id)
            j(['ok' => false, 'error' => 'missing_id']);
        $pdo->prepare("DELETE FROM users WHERE id=?")->execute([$id]);
        j(['ok' => true, 'deleted_id' => $id]);
    }

    /* ---------- Content ---------- */
    case 'list_content': {
        $q = trim($_GET['q'] ?? '');

        try {
            if ($q === '') {
                // Get resources
                $resources = $pdo->query("
                SELECT 'Resource' AS type, id, title, author,
                       CASE WHEN flagged=1 THEN 'Reported' ELSE 'Active' END AS status,
                       created_at 
                FROM resources 
                ORDER BY created_at DESC 
                LIMIT 200
            ")->fetchAll();

                // Get notes with username
                $notes = $pdo->query("
                SELECT 'Note' AS type, n.id, n.title, 
                       COALESCE(u.username, 'Unknown') AS author,
                       'Active' AS status, n.created_at 
                FROM notes n 
                LEFT JOIN users u ON n.user_id = u.id 
                ORDER BY n.created_at DESC 
                LIMIT 100
            ")->fetchAll();

                // Get questions - handle author field properly
                $questions = $pdo->query("
                SELECT 'Q&A' AS type, q.id, q.title, 
                       CASE 
                           WHEN q.author IS NULL OR q.author = '' OR q.author = 'You' THEN COALESCE(u.username, 'Unknown')
                           ELSE q.author 
                       END AS author,
                       'Active' AS status, q.created_at 
                FROM questions q 
                LEFT JOIN users u ON q.user_id = u.id 
                ORDER BY q.created_at DESC 
                LIMIT 100
            ")->fetchAll();

                // Get answers - handle author field properly
                $answers = $pdo->query("
                SELECT 'Answer' AS type, a.id,
                       LEFT(REPLACE(REPLACE(a.body, CHAR(10),' '), CHAR(13),' '), 200) AS title,
                       CASE 
                           WHEN a.author IS NULL OR a.author = '' OR a.author = 'You' THEN COALESCE(u.username, 'Unknown')
                           ELSE a.author 
                       END AS author,
                       'Active' AS status, a.created_at 
                FROM answers a 
                LEFT JOIN users u ON a.user_id = u.id 
                ORDER BY a.created_at DESC 
                LIMIT 100
            ")->fetchAll();

                // Combine all results
                $content = array_merge($resources, $notes, $questions, $answers);

                // Sort by creation date
                usort($content, function ($a, $b) {
                    return strtotime($b['created_at']) - strtotime($a['created_at']);
                });

                // Limit to 500 total
                $content = array_slice($content, 0, 500);

            } else {
                $like = "%$q%";

                // Get resources with search
                $stmt = $pdo->prepare("
                SELECT 'Resource' AS type, id, title, author,
                       CASE WHEN flagged=1 THEN 'Reported' ELSE 'Active' END AS status,
                       created_at 
                FROM resources 
                WHERE (title LIKE ? OR author LIKE ?)
                ORDER BY created_at DESC 
                LIMIT 200
            ");
                $stmt->execute([$like, $like]);
                $resources = $stmt->fetchAll();

                // Get notes with search and username
                $stmt = $pdo->prepare("
                SELECT 'Note' AS type, n.id, n.title, 
                       COALESCE(u.username, 'Unknown') AS author,
                       'Active' AS status, n.created_at 
                FROM notes n 
                LEFT JOIN users u ON n.user_id = u.id 
                WHERE n.title LIKE ?
                ORDER BY n.created_at DESC 
                LIMIT 100
            ");
                $stmt->execute([$like]);
                $notes = $stmt->fetchAll();

                // Get questions with search - handle author field properly
                $stmt = $pdo->prepare("
                SELECT 'Q&A' AS type, q.id, q.title, 
                       CASE 
                           WHEN q.author IS NULL OR q.author = '' OR q.author = 'You' THEN COALESCE(u.username, 'Unknown')
                           ELSE q.author 
                       END AS author,
                       'Active' AS status, q.created_at 
                FROM questions q 
                LEFT JOIN users u ON q.user_id = u.id 
                WHERE (q.title LIKE ? OR q.author LIKE ?)
                ORDER BY q.created_at DESC 
                LIMIT 100
            ");
                $stmt->execute([$like, $like]);
                $questions = $stmt->fetchAll();

                // Get answers with search - handle author field properly
                $stmt = $pdo->prepare("
                SELECT 'Answer' AS type, a.id,
                       LEFT(REPLACE(REPLACE(a.body, CHAR(10),' '), CHAR(13),' '), 200) AS title,
                       CASE 
                           WHEN a.author IS NULL OR a.author = '' OR a.author = 'You' THEN COALESCE(u.username, 'Unknown')
                           ELSE a.author 
                       END AS author,
                       'Active' AS status, a.created_at 
                FROM answers a 
                LEFT JOIN users u ON a.user_id = u.id 
                WHERE (a.author LIKE ? OR a.body LIKE ?)
                ORDER BY a.created_at DESC 
                LIMIT 100
            ");
                $stmt->execute([$like, $like]);
                $answers = $stmt->fetchAll();

                // Combine all results
                $content = array_merge($resources, $notes, $questions, $answers);

                // Sort by creation date
                usort($content, function ($a, $b) {
                    return strtotime($b['created_at']) - strtotime($a['created_at']);
                });

                // Limit to 500 total
                $content = array_slice($content, 0, 500);
            }

            j(['ok' => true, 'content' => $content]);

        } catch (Throwable $e) {
            http_response_code(500);
            j([
                'ok' => false,
                'error' => 'content_query_failed',
                'detail' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }
    }

    case 'toggle_content_status': {
        $b = body_json();
        $id = (int) ($b['id'] ?? 0);
        if (!$id)
            j(['ok' => false, 'error' => 'missing_id']);
        $row = $pdo->prepare("SELECT flagged FROM resources WHERE id=?");
        $row->execute([$id]);
        $cur = $row->fetchColumn();
        $next = ($cur ? 0 : 1);
        $pdo->prepare("UPDATE resources SET flagged=? WHERE id=?")->execute([$next, $id]);
        j(['ok' => true, 'id' => $id, 'new_status' => $next ? 'Reported' : 'Active']);
    }

    case 'delete_content': {
        $b = body_json();
        $type = $b['type'] ?? '';
        $id = (int) ($b['id'] ?? 0);
        if (!$id || !$type)
            j(['ok' => false, 'error' => 'invalid_input']);
        switch ($type) {
            case 'Resource':
                $pdo->prepare("DELETE FROM resources WHERE id=?")->execute([$id]);
                break;
            case 'Note':
                $pdo->prepare("DELETE FROM notes WHERE id=?")->execute([$id]);
                break;
            case 'Q&A':
                $pdo->prepare("DELETE FROM questions WHERE id=?")->execute([$id]);
                break;
            case 'Answer':
                $pdo->prepare("DELETE FROM answers WHERE id=?")->execute([$id]);
                break;
            default:
                j(['ok' => false, 'error' => 'unknown_type']);
        }
        j(['ok' => true, 'deleted' => ['type' => $type, 'id' => $id]]);
    }

    /* ---------- Groups Management ---------- */
    case 'upload_csv': {
        if ($_SERVER['REQUEST_METHOD'] !== "POST")
            j(['ok' => false, 'error' => 'invalid_method']);
        if (!isset($_FILES['csv']))
            j(['ok' => false, 'error' => 'no_file_uploaded']);
        $file = $_FILES['csv']['tmp_name'];
        $csv = array_map('str_getcsv', file($file));

        $created = 0;
        $first = true;
        foreach ($csv as $row) {
            if ($first) {
                $first = false;
                continue;
            } // skip header row

            $program = trim($row[0] ?? '');
            $code = trim($row[1] ?? '');
            $title = trim($row[2] ?? '');
            $section = trim($row[3] ?? '');

            if ($program === '' || $code === '' || $title === '' || $section === '')
                continue;

            // Build group name as Program/Course Code/Course Title/Section
            $groupName = "$program / $code / $title / $section";

            try {
                $stmt = $pdo->prepare("INSERT IGNORE INTO groups(section_name) VALUES (?)");
                $stmt->execute([$groupName]);
                if ($stmt->rowCount() > 0)
                    $created++;
            } catch (Throwable $e) {
                // ignore duplicates or errors
            }
        }
        j(['ok' => true, 'created' => $created]);
    }


    case 'list_groups': {
        $stmt = $pdo->query("SELECT * FROM groups ORDER BY section_name");
        j(['ok' => true, 'groups' => $stmt->fetchAll()]);
    }

        if ($action === "list_requests") {
            $res = $conn->query("
        SELECT gm.id, u.username, g.section_name, gm.status, gm.proof_url
        FROM group_members gm
        JOIN users u ON gm.user_id = u.id
        JOIN groups g ON gm.group_id = g.id
        WHERE gm.status='pending'
    ");
            echo json_encode(["ok" => true, "requests" => $res->fetch_all(MYSQLI_ASSOC)]);
            exit;
        }

    /* ---------- Groups: list join requests ---------- */
    case 'list_requests': {
        $stmt = $pdo->query("
        SELECT gm.id, u.username, u.student_id, g.section_name, gm.status, gm.proof_url
        FROM group_members gm
        JOIN users u ON gm.user_id = u.id
        JOIN groups g ON gm.group_id = g.id
        WHERE gm.status='pending'
        ORDER BY gm.id DESC
    ");
        j(['ok' => true, 'requests' => $stmt->fetchAll()]);
    }

    /* ---------- Approve or reject a join request ---------- */
    case 'approve_member': {
        if ($_SERVER['REQUEST_METHOD'] !== "POST")
            j(['ok' => false, 'error' => 'invalid_method']);
        $b = body_json();
        $id = (int) ($b['id'] ?? 0);
        $status = ($b['status'] === 'accepted') ? 'accepted' : 'rejected';
        $stmt = $pdo->prepare("UPDATE group_members SET status=? WHERE id=?");
        $stmt->execute([$status, $id]);
        j(['ok' => true, 'status' => $status]);
    }

    case 'list_members': {
        $group_id = (int) ($_GET['group_id'] ?? 0);
        $sql = "
            SELECT u.id, u.username, u.email, gm.status, gm.joined_at
            FROM group_members gm
            JOIN users u ON gm.user_id = u.id
            WHERE gm.group_id = ? AND gm.status='accepted'
        ";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$group_id]);
        j(['ok' => true, 'members' => $stmt->fetchAll()]);
    }

    /* ---------- Delete a group ---------- */
    case 'delete_group': {
        $b = body_json();
        $id = (int) ($b['id'] ?? 0);
        if (!$id)
            j(['ok' => false, 'error' => 'missing_group_id']);
        // Delete group → members + messages auto-deleted via ON DELETE CASCADE
        $pdo->prepare("DELETE FROM groups WHERE id=?")->execute([$id]);
        j(['ok' => true, 'deleted_group' => $id]);
    }

    /* ---------- Remove a member from group ---------- */
    case 'delete_member': {
        $b = body_json();
        $id = (int) ($b['id'] ?? 0); // row id in group_members
        if (!$id)
            j(['ok' => false, 'error' => 'missing_member_id']);
        $pdo->prepare("DELETE FROM group_members WHERE id=?")->execute([$id]);
        j(['ok' => true, 'deleted_member' => $id]);
    }

    /* ---------- Delete all groups ---------- */
    case 'delete_all_groups': {
        if ($_SERVER['REQUEST_METHOD'] !== "POST") {
            j(['ok' => false, 'error' => 'invalid_method']);
        }
        // CASCADE will remove members + messages automatically
        $pdo->exec("DELETE FROM groups");
        j(['ok' => true, 'message' => 'All groups deleted']);
    }

    /* ---------- Delete all pending requests ---------- */
    case 'delete_all_requests': {
        if ($_SERVER['REQUEST_METHOD'] !== "POST") {
            j(['ok' => false, 'error' => 'invalid_method']);
        }
        $pdo->exec("DELETE FROM group_members WHERE status='pending'");
        j(['ok' => true, 'message' => 'All pending requests deleted']);
    }

    /* ---------- Default ---------- */
    default:
        j(['ok' => false, 'error' => 'unknown_action']);
}