<?php
require_once __DIR__ . '/db.php'; // Provides $pdo, CORS headers, session_start(), and error handlers
require_once __DIR__ . '/auth.php';

$AUTH_MODE = 'role';
$ADMIN_LINK_KEY = $_ENV['ADMIN_LINK_KEY'] ?? getenv('ADMIN_LINK_KEY') ?: '';
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

function logAdminAction($pdo, $action, $target_type = null, $target_id = null, $details = null)
{
    $admin_id = $_SESSION['user_id'] ?? null;
    $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    try {
        $stmt = $pdo->prepare("INSERT INTO audit_logs (admin_id, action, target_type, target_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([$admin_id, $action, $target_type, (string)$target_id, $details, $ip]);
    } catch (Throwable $e) {
        // silently fail log if it crashes
    }
}

/*************** Local-only safety ***************/
/* 
if ($ALLOW_LOCAL_ONLY) {
    $ip = $_SERVER['REMOTE_ADDR'] ?? '';
    if (!in_array($ip, ['127.0.0.1', '::1'])) {
        http_response_code(403);
        j(['ok' => false, 'error' => 'local_only']);
    }
}
*/

// Role and status columns are handled by bootstrap in db.php
$hasRole = true;
$hasStatus = true;

/*************** Routing + Auth ***************/
$action = $_GET['action'] ?? $_POST['action'] ?? '';
if ($action === 'health') {
    j(['ok' => true, 'status' => 'admin_api_up']);
}

// ✅ SECURE ROLE CHECK
$userId = StudyNestAuth::validate(['admin']);
if (!$userId) {
    // validate() handles 401/403 and exits
}

/*************** Routes ***************/
switch ($action) {
    /* ---------- Analytics ---------- */
    case 'stats': {
        $totalUsers = (int) $pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();
        $new30 = (int) $pdo->query("SELECT COUNT(*) FROM users WHERE created_at >= (CURRENT_TIMESTAMP - INTERVAL '30 days')")->fetchColumn();
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
        logAdminAction($pdo, "toggle_user_status", "User", $id, "Status changed to $next");
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
            logAdminAction($pdo, "set_user_role", "User", $id, "Role set to $role");
            j(['ok' => true, 'id' => $id, 'new_role' => $role]);
        }
    }

    case 'delete_user': {
        $b = body_json();
        $id = (int) ($b['id'] ?? 0);
        if (!$id)
            j(['ok' => false, 'error' => 'missing_id']);
        $pdo->prepare("DELETE FROM users WHERE id=?")->execute([$id]);
        logAdminAction($pdo, "delete_user", "User", $id);
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
                       CASE WHEN flagged=TRUE THEN 'Reported' ELSE 'Active' END AS status,
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
                       LEFT(REPLACE(REPLACE(a.body, CHR(10),' '), CHR(13),' '), 200) AS title,
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
                       CASE WHEN flagged=TRUE THEN 'Reported' ELSE 'Active' END AS status,
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
                       LEFT(REPLACE(REPLACE(a.body, CHR(10),' '), CHR(13),' '), 200) AS title,
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
        $next = $cur ? 0 : 1; 
        $pdo->prepare("UPDATE resources SET flagged=CASE WHEN ?=1 THEN TRUE ELSE FALSE END WHERE id=?")->execute([$next, $id]);
        logAdminAction($pdo, "toggle_resource_flag", "Resource", $id, $next ? "Flagged" : "Unflagged");
        j(['ok' => true, 'id' => $id, 'new_status' => $next === 1 ? 'Reported' : 'Active']);
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
        logAdminAction($pdo, "delete_content", $type, $id);
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
                $stmt = $pdo->prepare("INSERT INTO groups(section_name) VALUES (?) ON CONFLICT (section_name) DO NOTHING");
                $stmt->execute([$groupName]);
                if ($stmt->rowCount() > 0)
                    $created++;
            } catch (Throwable $e) {
                // ignore duplicates or errors
            }
        }
        logAdminAction($pdo, "bulk_upload_groups", "Groups", null, "Created $created groups via CSV");
        j(['ok' => true, 'created' => $created]);
    }


    case 'list_groups': {
        $stmt = $pdo->query("SELECT * FROM groups ORDER BY section_name");
        j(['ok' => true, 'groups' => $stmt->fetchAll()]);
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
        $stmt = $pdo->prepare("UPDATE group_members SET status=? WHERE id=? RETURNING user_id, group_id");
        $stmt->execute([$status, $id]);
        $gm = $stmt->fetch();
        
        if ($gm) {
            $user_id = $gm['user_id'];
            $group_id = $gm['group_id'];
            
            // Get student_id and group name
            $u = $pdo->prepare("SELECT student_id FROM users WHERE id=?");
            $u->execute([$user_id]);
            $sid = $u->fetchColumn();
            
            $g = $pdo->prepare("SELECT section_name FROM groups WHERE id=?");
            $g->execute([$group_id]);
            $gname = $g->fetchColumn();
            
            if ($sid) {
                $n_title = ($status === 'accepted') ? "🎉 Request Approved!" : "⚠️ Request Status";
                $n_msg = ($status === 'accepted') 
                    ? "Welcome! Your request to join \"$gname\" has been approved." 
                    : "Sorry, your request to join \"$gname\" was not approved at this time.";
                $n_link = "/groups";
                
                if ($status === 'accepted') {
                    awardPoints($pdo, $user_id, 50, 'group_join', $group_id, "Joined group: $gname");
                }

                $nstmt = $pdo->prepare("INSERT INTO notifications (student_id, title, message, link, type) VALUES (?, ?, ?, ?, 'group_status')");
                $nstmt->execute([$sid, $n_title, $n_msg, $n_link]);
            }
        }

        logAdminAction($pdo, "approve_group_member", "GroupMember", $id, "Status: $status");
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
    case 'audit_logs': {
        $stmt = $pdo->query("
            SELECT al.*, u.username as admin_name 
            FROM audit_logs al 
            LEFT JOIN users u ON al.admin_id = u.id 
            ORDER BY al.created_at DESC 
            LIMIT 500
        ");
        j(['ok' => true, 'logs' => $stmt->fetchAll()]);
    }

    case 'system_health': {
        $dbSizeRes = $pdo->query("SELECT pg_size_pretty(pg_database_size(current_database()))")->fetchColumn();
        $totalMessages = (int)$pdo->query("SELECT COUNT(*) FROM messages")->fetchColumn();
        $totalGroupMsgs = (int)$pdo->query("SELECT COUNT(*) FROM group_messages")->fetchColumn();
        $storageUsage = (int)$pdo->query("SELECT COUNT(*) FROM resources WHERE url LIKE '%cloudinary%'")->fetchColumn();
        
        j([
            'ok' => true,
            'health' => [
                'db_size' => $dbSizeRes,
                'total_messages' => $totalMessages + $totalGroupMsgs,
                'external_resources' => $storageUsage,
                'server_time' => date('Y-m-d H:i:s'),
                'php_version' => PHP_VERSION,
                'db_type' => 'PostgreSQL'
            ]
        ]);
    }

    case 'list_settings': {
        $stmt = $pdo->query("SELECT * FROM platform_settings ORDER BY key");
        j(['ok' => true, 'settings' => $stmt->fetchAll()]);
    }

    case 'update_setting': {
        $b = body_json();
        $key = $b['key'] ?? '';
        $val = $b['value'] ?? '';
        if (!$key) j(['ok' => false, 'error' => 'missing_key']);
        
        $stmt = $pdo->prepare("UPDATE platform_settings SET value=?, updated_at=CURRENT_TIMESTAMP WHERE key=?");
        $stmt->execute([$val, $key]);
        logAdminAction($pdo, "update_setting", "Setting", $key, "Value: $val");
        j(['ok' => true]);
    }

    /* ---------- Default ---------- */
    default:
        j(['ok' => false, 'error' => 'unknown_action']);
}
