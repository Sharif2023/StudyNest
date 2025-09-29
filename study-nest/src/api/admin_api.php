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
        return; // nothing printed
    // If output doesn't look like JSON, wrap it
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

/**
 * Auth modes:
 *   - "link_key" (recommended for dev): require secret key via ?k=...
 *   - "none"     (totally open; for local DEV ONLY)
 */
$AUTH_MODE = 'link_key';   // change to 'none' to disable auth entirely
$ADMIN_LINK_KEY = 'MYKEY123';   // must match your frontend
$ALLOW_LOCAL_ONLY = true;         // block non-local IPs for safety

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
    
    // Ensure course and section management tables exist
    ensureCourseSectionTables($pdo);
    
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
  $hasRole   = in_array('role',   $cols, true);
  $hasStatus = in_array('status', $cols, true);
} catch (Throwable $e) {
  // ignore — we'll fall back to defaults
}
} catch (Throwable $e) {
    http_response_code(500);
    j(['ok' => false, 'error' => 'db_connect_failed', 'detail' => $e->getMessage()]);
}

// Function to ensure course and section management tables exist
function ensureCourseSectionTables($pdo) {
    // Create academic_terms table
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS academic_terms (
          id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          term_name VARCHAR(100) NOT NULL,
          term_code VARCHAR(20) NOT NULL UNIQUE,
          start_date DATE NOT NULL,
          end_date DATE NOT NULL,
          is_active BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_term_code (term_code),
          INDEX idx_is_active (is_active)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");
    
    // Create course_sections table
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS course_sections (
          id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          course_id INT UNSIGNED NOT NULL,
          section_name VARCHAR(10) NOT NULL,
          term_id INT UNSIGNED NOT NULL,
          instructor_name VARCHAR(255) NULL,
          max_students INT UNSIGNED DEFAULT 50,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY unique_course_section_term (course_id, section_name, term_id),
          FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
          FOREIGN KEY (term_id) REFERENCES academic_terms(id) ON DELETE CASCADE,
          INDEX idx_course_id (course_id),
          INDEX idx_term_id (term_id),
          INDEX idx_is_active (is_active)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");
    
    // Create group_chats table
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
    
    // Create group_chat_participants table
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
    
    // Create group_chat_messages table
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
    
    // Create group_chat_message_reads table
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
    
    // Add role and status columns to users table if they don't exist
    try {
        $pdo->exec("ALTER TABLE users ADD COLUMN role ENUM('User', 'Admin', 'Instructor') DEFAULT 'User'");
    } catch (PDOException $e) {
        // Column already exists, ignore
    }
    
    try {
        $pdo->exec("ALTER TABLE users ADD COLUMN status ENUM('Active', 'Banned', 'Suspended') DEFAULT 'Active'");
    } catch (PDOException $e) {
        // Column already exists, ignore
    }
    
    // Insert default academic term if none exists
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM academic_terms WHERE is_active = 1");
    $stmt->execute();
    if ($stmt->fetchColumn() == 0) {
        $pdo->exec("
            INSERT INTO academic_terms (term_name, term_code, start_date, end_date, is_active) 
            VALUES ('Fall 2024', 'FALL2024', '2024-09-01', '2024-12-15', TRUE)
            ON DUPLICATE KEY UPDATE term_name = VALUES(term_name)
        ");
    }
}

/*************** Routing + Auth ***************/
$action = $_GET['action'] ?? $_POST['action'] ?? '';

// Health is open (no auth)
if ($action === 'health') {
    j(['ok' => true, 'status' => 'admin_api_up']);
}

// Link-key auth (if enabled)
if ($AUTH_MODE === 'link_key') {
    $k = $_GET['k'] ?? ($_POST['k'] ?? (body_json()['k'] ?? ''));
    if (!is_string($k) || !hash_equals($ADMIN_LINK_KEY, $k)) {
        http_response_code(403);
        j(['ok' => false, 'error' => 'forbidden', 'detail' => 'missing_or_invalid_key']);
    }
}
// If $AUTH_MODE === 'none', no auth is enforced.

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

        // If the columns don't exist, substitute constants so SELECT still works.
        $selectRole = $hasRole ? "role" : "'User'";
        $selectStatus = $hasStatus ? "status" : "'Active'";

        $baseSql = "
    SELECT id, username, email,
           $selectRole   AS role,
           $selectStatus AS status,
           created_at
    FROM users
  ";
        $order = " ORDER BY created_at DESC LIMIT 500";

        if ($q !== '') {
            // Only add role filter if the column exists
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
            // Column not present — report a friendly note and don't fail hard
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

    /* ---------- Content Moderation ---------- */
    case 'list_content': {
        $q = trim($_GET['q'] ?? '');

        if ($q === '') {
            // No filters -> simple, fast query
            $union = "
      SELECT 'Resource' AS type, id, title, author,
             CASE WHEN flagged=1 THEN 'Reported' ELSE 'Active' END AS status,
             0 AS reports, created_at
      FROM resources
      UNION ALL
      SELECT 'Note' AS type, id, title, NULL AS author,
             'Active' AS status, 0 AS reports, created_at
      FROM notes
      UNION ALL
      SELECT 'Q&A' AS type, id, title, author,
             'Active' AS status, 0 AS reports, created_at
      FROM questions
      UNION ALL
      SELECT 'Answer' AS type, id,
             LEFT(REPLACE(REPLACE(body, CHAR(10),' '), CHAR(13),' '), 200) AS title,
             author, 'Active' AS status, 0 AS reports, created_at
      FROM answers
    ";
            $final = "SELECT * FROM ( $union ) t ORDER BY created_at DESC LIMIT 500";
            $stmt = $pdo->query($final);
        } else {
            $like = "%$q%";
            // Use positional placeholders for each segment
            $union = "
      SELECT 'Resource' AS type, id, title, author,
             CASE WHEN flagged=1 THEN 'Reported' ELSE 'Active' END AS status,
             0 AS reports, created_at
      FROM resources
      WHERE (title LIKE ? OR author LIKE ? OR kind LIKE ? OR course LIKE ?)

      UNION ALL

      SELECT 'Note' AS type, id, title, NULL AS author,
             'Active' AS status, 0 AS reports, created_at
      FROM notes
      WHERE (title LIKE ? OR course LIKE ? OR semester LIKE ?)

      UNION ALL

      SELECT 'Q&A' AS type, id, title, author,
             'Active' AS status, 0 AS reports, created_at
      FROM questions
      WHERE (title LIKE ? OR author LIKE ? OR tags LIKE ?)

      UNION ALL

      SELECT 'Answer' AS type, id,
             LEFT(REPLACE(REPLACE(body, CHAR(10),' '), CHAR(13),' '), 200) AS title,
             author, 'Active' AS status, 0 AS reports, created_at
      FROM answers
      WHERE (author LIKE ? OR body LIKE ?)
    ";
            $final = "SELECT * FROM ( $union ) t ORDER BY created_at DESC LIMIT 500";
            $stmt = $pdo->prepare($final);
            $stmt->execute([
                // resources (4)
                $like,
                $like,
                $like,
                $like,
                // notes (3)
                $like,
                $like,
                $like,
                // questions (3)
                $like,
                $like,
                $like,
                // answers (2)
                $like,
                $like,
            ]);
        }

        j(['ok' => true, 'content' => $stmt->fetchAll()]);
    }


    case 'toggle_content_status': {
        $b = body_json();
        $type = $b['type'] ?? '';
        $id = (int) ($b['id'] ?? 0);
        if (!$id || !$type)
            j(['ok' => false, 'error' => 'invalid_input']);
        if ($type !== 'Resource')
            j(['ok' => false, 'error' => 'toggle_not_supported_for_type']);
        $row = $pdo->prepare("SELECT flagged FROM resources WHERE id=?");
        $row->execute([$id]);
        $cur = $row->fetchColumn();
        if ($cur === false)
            j(['ok' => false, 'error' => 'not_found']);
        $next = ($cur ? 0 : 1);
        $pdo->prepare("UPDATE resources SET flagged=? WHERE id=?")->execute([$next, $id]);
        j(['ok' => true, 'id' => $id, 'new_status' => ($next ? 'Reported' : 'Active')]);
    }

    case 'delete_content': {
        $b = body_json();
        $type = $b['type'] ?? '';
        $id = (int) ($b['id'] ?? 0);
        if (!$id || !$type)
            j(['ok' => false, 'error' => 'invalid_input']);
        switch ($type) {
            case 'Resource':
                $stmt = $pdo->prepare("DELETE FROM resources WHERE id=?");
                break;
            case 'Note':
                $stmt = $pdo->prepare("DELETE FROM notes WHERE id=?");
                break;
            case 'Q&A':
                $stmt = $pdo->prepare("DELETE FROM questions WHERE id=?");
                break;
            case 'Answer':
                $stmt = $pdo->prepare("DELETE FROM answers WHERE id=?");
                break;
            default:
                j(['ok' => false, 'error' => 'unknown_type']);
        }
        $stmt->execute([$id]);
        j(['ok' => true, 'deleted' => ['type' => $type, 'id' => $id]]);
    }

    /* ---------- Meetings ---------- */
    case 'end_meeting': {
        $b = body_json();
        $id = $b['id'] ?? '';
        if (!$id)
            j(['ok' => false, 'error' => 'missing_meeting_id']);
        $pdo->prepare("UPDATE meetings SET status='ended', ends_at=COALESCE(ends_at, NOW()) WHERE id=?")->execute([$id]);
        j(['ok' => true, 'meeting_id' => $id, 'status' => 'ended']);
    }

    /* ---------- Academic Terms Management ---------- */
    case 'list_terms': {
        $stmt = $pdo->query("SELECT * FROM academic_terms ORDER BY created_at DESC");
        j(['ok' => true, 'terms' => $stmt->fetchAll()]);
    }

    case 'create_term': {
        $b = body_json();
        $term_name = trim($b['term_name'] ?? '');
        $term_code = trim($b['term_code'] ?? '');
        $start_date = $b['start_date'] ?? '';
        $end_date = $b['end_date'] ?? '';
        $is_active = (bool) ($b['is_active'] ?? false);

        if (!$term_name || !$term_code || !$start_date || !$end_date)
            j(['ok' => false, 'error' => 'missing_required_fields']);

        // If setting as active, deactivate other terms
        if ($is_active) {
            $pdo->exec("UPDATE academic_terms SET is_active = FALSE");
        }

        $stmt = $pdo->prepare("INSERT INTO academic_terms (term_name, term_code, start_date, end_date, is_active) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([$term_name, $term_code, $start_date, $end_date, $is_active ? 1 : 0]);
        j(['ok' => true, 'term_id' => $pdo->lastInsertId()]);
    }

    case 'update_term': {
        $b = body_json();
        $id = (int) ($b['id'] ?? 0);
        $term_name = trim($b['term_name'] ?? '');
        $term_code = trim($b['term_code'] ?? '');
        $start_date = $b['start_date'] ?? '';
        $end_date = $b['end_date'] ?? '';
        $is_active = (bool) ($b['is_active'] ?? false);

        if (!$id || !$term_name || !$term_code || !$start_date || !$end_date)
            j(['ok' => false, 'error' => 'missing_required_fields']);

        // If setting as active, deactivate other terms
        if ($is_active) {
            $pdo->exec("UPDATE academic_terms SET is_active = FALSE WHERE id != ?");
        }

        $stmt = $pdo->prepare("UPDATE academic_terms SET term_name=?, term_code=?, start_date=?, end_date=?, is_active=? WHERE id=?");
        $stmt->execute([$term_name, $term_code, $start_date, $end_date, $is_active ? 1 : 0, $id]);
        j(['ok' => true, 'updated' => $id]);
    }

    case 'delete_term': {
        $b = body_json();
        $id = (int) ($b['id'] ?? 0);
        if (!$id)
            j(['ok' => false, 'error' => 'missing_id']);
        $pdo->prepare("DELETE FROM academic_terms WHERE id=?")->execute([$id]);
        j(['ok' => true, 'deleted_id' => $id]);
    }

    /* ---------- Courses Management ---------- */
    case 'list_courses': {
        $stmt = $pdo->query("SELECT * FROM courses ORDER BY course_code");
        j(['ok' => true, 'courses' => $stmt->fetchAll()]);
    }

    /* ---------- Course Sections Management ---------- */
    case 'list_course_sections': {
        $term_id = (int) ($_GET['term_id'] ?? 0);
        $course_id = (int) ($_GET['course_id'] ?? 0);
        
        $where = [];
        $params = [];
        
        if ($term_id > 0) {
            $where[] = "cs.term_id = ?";
            $params[] = $term_id;
        }
        
        if ($course_id > 0) {
            $where[] = "cs.course_id = ?";
            $params[] = $course_id;
        }
        
        $whereClause = $where ? "WHERE " . implode(" AND ", $where) : "";
        
        $sql = "
            SELECT cs.*, c.course_code, c.course_title, at.term_name, at.term_code
            FROM course_sections cs
            JOIN courses c ON cs.course_id = c.id
            JOIN academic_terms at ON cs.term_id = at.id
            $whereClause
            ORDER BY c.course_code, cs.section_name
        ";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        j(['ok' => true, 'sections' => $stmt->fetchAll()]);
    }

    case 'create_course_section': {
        $b = body_json();
        $course_id = (int) ($b['course_id'] ?? 0);
        $section_name = trim($b['section_name'] ?? '');
        $term_id = (int) ($b['term_id'] ?? 0);
        $instructor_name = trim($b['instructor_name'] ?? '');
        $max_students = (int) ($b['max_students'] ?? 50);

        if (!$course_id || !$section_name || !$term_id)
            j(['ok' => false, 'error' => 'missing_required_fields']);

        $stmt = $pdo->prepare("INSERT INTO course_sections (course_id, section_name, term_id, instructor_name, max_students) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([$course_id, $section_name, $term_id, $instructor_name, $max_students]);
        j(['ok' => true, 'section_id' => $pdo->lastInsertId()]);
    }

    case 'update_course_section': {
        $b = body_json();
        $id = (int) ($b['id'] ?? 0);
        $course_id = (int) ($b['course_id'] ?? 0);
        $section_name = trim($b['section_name'] ?? '');
        $term_id = (int) ($b['term_id'] ?? 0);
        $instructor_name = trim($b['instructor_name'] ?? '');
        $max_students = (int) ($b['max_students'] ?? 50);
        $is_active = (bool) ($b['is_active'] ?? true);

        if (!$id || !$course_id || !$section_name || !$term_id)
            j(['ok' => false, 'error' => 'missing_required_fields']);

        $stmt = $pdo->prepare("UPDATE course_sections SET course_id=?, section_name=?, term_id=?, instructor_name=?, max_students=?, is_active=? WHERE id=?");
        $stmt->execute([$course_id, $section_name, $term_id, $instructor_name, $max_students, $is_active ? 1 : 0, $id]);
        j(['ok' => true, 'updated' => $id]);
    }

    case 'delete_course_section': {
        $b = body_json();
        $id = (int) ($b['id'] ?? 0);
        if (!$id)
            j(['ok' => false, 'error' => 'missing_id']);
        $pdo->prepare("DELETE FROM course_sections WHERE id=?")->execute([$id]);
        j(['ok' => true, 'deleted_id' => $id]);
    }

    /* ---------- Group Chat Management ---------- */
    case 'list_group_chats': {
        $course_section_id = (int) ($_GET['course_section_id'] ?? 0);
        
        $where = $course_section_id > 0 ? "WHERE gc.course_section_id = ?" : "";
        $params = $course_section_id > 0 ? [$course_section_id] : [];
        
        $sql = "
            SELECT gc.*, cs.section_name, c.course_code, c.course_title, at.term_name,
                   u.username as created_by_username,
                   COUNT(gcp.user_id) as participant_count
            FROM group_chats gc
            JOIN course_sections cs ON gc.course_section_id = cs.id
            JOIN courses c ON cs.course_id = c.id
            JOIN academic_terms at ON cs.term_id = at.id
            JOIN users u ON gc.created_by = u.id
            LEFT JOIN group_chat_participants gcp ON gc.id = gcp.group_chat_id
            $where
            GROUP BY gc.id
            ORDER BY gc.created_at DESC
        ";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        j(['ok' => true, 'group_chats' => $stmt->fetchAll()]);
    }

    case 'create_group_chat': {
        $b = body_json();
        $chat_name = trim($b['chat_name'] ?? '');
        $course_section_id = (int) ($b['course_section_id'] ?? 0);
        $description = trim($b['description'] ?? '');
        $created_by = (int) ($b['created_by'] ?? 0);

        if (!$chat_name || !$course_section_id || !$created_by)
            j(['ok' => false, 'error' => 'missing_required_fields']);

        $stmt = $pdo->prepare("INSERT INTO group_chats (chat_name, course_section_id, description, created_by) VALUES (?, ?, ?, ?)");
        $stmt->execute([$chat_name, $course_section_id, $description, $created_by]);
        $chat_id = $pdo->lastInsertId();

        // Add creator as admin participant
        $pdo->prepare("INSERT INTO group_chat_participants (group_chat_id, user_id, is_admin) VALUES (?, ?, 1)")->execute([$chat_id, $created_by]);

        j(['ok' => true, 'group_chat_id' => $chat_id]);
    }

    case 'update_group_chat': {
        $b = body_json();
        $id = (int) ($b['id'] ?? 0);
        $chat_name = trim($b['chat_name'] ?? '');
        $description = trim($b['description'] ?? '');
        $is_active = (bool) ($b['is_active'] ?? true);

        if (!$id || !$chat_name)
            j(['ok' => false, 'error' => 'missing_required_fields']);

        $stmt = $pdo->prepare("UPDATE group_chats SET chat_name=?, description=?, is_active=? WHERE id=?");
        $stmt->execute([$chat_name, $description, $is_active ? 1 : 0, $id]);
        j(['ok' => true, 'updated' => $id]);
    }

    case 'delete_group_chat': {
        $b = body_json();
        $id = (int) ($b['id'] ?? 0);
        if (!$id)
            j(['ok' => false, 'error' => 'missing_id']);
        $pdo->prepare("DELETE FROM group_chats WHERE id=?")->execute([$id]);
        j(['ok' => true, 'deleted_id' => $id]);
    }

    case 'add_group_chat_participant': {
        $b = body_json();
        $group_chat_id = (int) ($b['group_chat_id'] ?? 0);
        $user_id = (int) ($b['user_id'] ?? 0);

        if (!$group_chat_id || !$user_id)
            j(['ok' => false, 'error' => 'missing_required_fields']);

        $stmt = $pdo->prepare("INSERT INTO group_chat_participants (group_chat_id, user_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE joined_at = CURRENT_TIMESTAMP");
        $stmt->execute([$group_chat_id, $user_id]);
        j(['ok' => true, 'added' => true]);
    }

    case 'remove_group_chat_participant': {
        $b = body_json();
        $group_chat_id = (int) ($b['group_chat_id'] ?? 0);
        $user_id = (int) ($b['user_id'] ?? 0);

        if (!$group_chat_id || !$user_id)
            j(['ok' => false, 'error' => 'missing_required_fields']);

        $pdo->prepare("DELETE FROM group_chat_participants WHERE group_chat_id=? AND user_id=?")->execute([$group_chat_id, $user_id]);
        j(['ok' => true, 'removed' => true]);
    }

    /* ---------- Bulk Operations ---------- */
    case 'create_sections_for_course': {
        $b = body_json();
        $course_id = (int) ($b['course_id'] ?? 0);
        $term_id = (int) ($b['term_id'] ?? 0);
        $sections = $b['sections'] ?? []; // Array of section names like ['A', 'B', 'C']
        $instructor_name = trim($b['instructor_name'] ?? '');
        $max_students = (int) ($b['max_students'] ?? 50);

        if (!$course_id || !$term_id || empty($sections))
            j(['ok' => false, 'error' => 'missing_required_fields']);

        $created_sections = [];
        $pdo->beginTransaction();
        
        try {
            foreach ($sections as $section_name) {
                $section_name = trim($section_name);
                if (empty($section_name)) continue;
                
                $stmt = $pdo->prepare("INSERT INTO course_sections (course_id, section_name, term_id, instructor_name, max_students) VALUES (?, ?, ?, ?, ?)");
                $stmt->execute([$course_id, $section_name, $term_id, $instructor_name, $max_students]);
                $created_sections[] = $pdo->lastInsertId();
            }
            
            $pdo->commit();
            j(['ok' => true, 'created_sections' => $created_sections]);
        } catch (Exception $e) {
            $pdo->rollBack();
            j(['ok' => false, 'error' => 'failed_to_create_sections', 'detail' => $e->getMessage()]);
        }
    }

    case 'create_group_chats_for_sections': {
        $b = body_json();
        $course_section_ids = $b['course_section_ids'] ?? []; // Array of course section IDs
        $created_by = (int) ($b['created_by'] ?? 0);

        if (empty($course_section_ids) || !$created_by)
            j(['ok' => false, 'error' => 'missing_required_fields']);

        $created_chats = [];
        $pdo->beginTransaction();
        
        try {
            foreach ($course_section_ids as $section_id) {
                // Get course and section info for chat name
                $stmt = $pdo->prepare("
                    SELECT c.course_code, c.course_title, cs.section_name, at.term_name
                    FROM course_sections cs
                    JOIN courses c ON cs.course_id = c.id
                    JOIN academic_terms at ON cs.term_id = at.id
                    WHERE cs.id = ?
                ");
                $stmt->execute([$section_id]);
                $section_info = $stmt->fetch();
                
                if (!$section_info) continue;
                
                $chat_name = "{$section_info['course_code']} - Section {$section_info['section_name']} ({$section_info['term_name']})";
                $description = "Group chat for {$section_info['course_title']} - Section {$section_info['section_name']}";
                
                $stmt = $pdo->prepare("INSERT INTO group_chats (chat_name, course_section_id, description, created_by) VALUES (?, ?, ?, ?)");
                $stmt->execute([$chat_name, $section_id, $description, $created_by]);
                $chat_id = $pdo->lastInsertId();
                
                // Add creator as admin participant
                $pdo->prepare("INSERT INTO group_chat_participants (group_chat_id, user_id, is_admin) VALUES (?, ?, 1)")->execute([$chat_id, $created_by]);
                
                $created_chats[] = $chat_id;
            }
            
            $pdo->commit();
            j(['ok' => true, 'created_group_chats' => $created_chats]);
        } catch (Exception $e) {
            $pdo->rollBack();
            j(['ok' => false, 'error' => 'failed_to_create_group_chats', 'detail' => $e->getMessage()]);
        }
    }

    /* ---------- Import Sections from PDF/Image ---------- */
    case 'import_sections_from_file': {
        // Expect multipart/form-data: file, term_id, instructor_name?, max_students?
        if (!isset($_FILES['file']) || !is_uploaded_file($_FILES['file']['tmp_name'])) {
            j(['ok' => false, 'error' => 'missing_file']);
        }

        $term_id = (int) ($_POST['term_id'] ?? 0);
        $instructor_name = trim($_POST['instructor_name'] ?? '');
        $max_students = (int) ($_POST['max_students'] ?? 50);
        if ($term_id <= 0) {
            j(['ok' => false, 'error' => 'missing_term_id']);
        }

        // Save upload
        $uploadsDir = __DIR__ . '/uploads';
        if (!is_dir($uploadsDir)) @mkdir($uploadsDir, 0777, true);
        $origName = $_FILES['file']['name'];
        $ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION));
        $safeBase = preg_replace('/[^a-zA-Z0-9._-]/', '_', pathinfo($origName, PATHINFO_FILENAME));
        if ($safeBase === '') $safeBase = 'file';
        $fname = sprintf('%s_%s.%s', $safeBase, bin2hex(random_bytes(5)), $ext);
        $target = $uploadsDir . '/' . $fname;
        if (!move_uploaded_file($_FILES['file']['tmp_name'], $target)) {
            j(['ok' => false, 'error' => 'upload_save_failed']);
        }

        // Call Python parser
        $python = 'python'; // assumes python in PATH
        $script = realpath(__DIR__ . '/../Python/parse_sections.py');
        $cmd = escapeshellcmd($python) . ' ' . escapeshellarg($script) . ' ' . escapeshellarg($target);
        $output = @shell_exec($cmd . ' 2>&1');
        if ($output === null) {
            j(['ok' => false, 'error' => 'parser_exec_failed']);
        }
        $parsed = json_decode($output, true);
        if (!is_array($parsed)) {
            j(['ok' => false, 'error' => 'parser_return_invalid', 'raw' => $output]);
        }

        $created = ['courses' => 0, 'sections' => 0];
        $courseIdCache = [];

        $pdo->beginTransaction();
        try {
            foreach ($parsed as $row) {
                $course_code = trim($row['course_code'] ?? '');
                $course_title = trim($row['course_title'] ?? '');
                $sections = $row['sections'] ?? [];
                if ($course_code === '' && $course_title === '') continue;

                // Find or create course
                $key = $course_code !== '' ? 'code:' . $course_code : 'title:' . $course_title;
                $course_id = $courseIdCache[$key] ?? 0;
                if (!$course_id) {
                    if ($course_code !== '') {
                        $st = $pdo->prepare("SELECT id FROM courses WHERE course_code = ? LIMIT 1");
                        $st->execute([$course_code]);
                        $course_id = (int) ($st->fetchColumn() ?: 0);
                    }
                    if (!$course_id && $course_title !== '') {
                        $st = $pdo->prepare("SELECT id FROM courses WHERE course_title = ? LIMIT 1");
                        $st->execute([$course_title]);
                        $course_id = (int) ($st->fetchColumn() ?: 0);
                    }
                    if (!$course_id) {
                        // Create minimal course row; department/program unknown
                        $ins = $pdo->prepare("INSERT INTO courses (course_code, course_title, department, program, course_thumbnail, created_at, updated_at) VALUES (?,?,?,?,NULL,NOW(),NOW())");
                        $ins->execute([$course_code ?: strtoupper(substr(md5($course_title),0,6)), $course_title ?: $course_code, 'Unknown', 'Unknown']);
                        $course_id = (int) $pdo->lastInsertId();
                        $created['courses']++;
                    }
                    $courseIdCache[$key] = $course_id;
                }

                // Create sections
                foreach ($sections as $sec) {
                    $section_name = trim($sec);
                    if ($section_name === '') continue;
                    try {
                        $stmt = $pdo->prepare("INSERT INTO course_sections (course_id, section_name, term_id, instructor_name, max_students) VALUES (?,?,?,?,?)");
                        $stmt->execute([$course_id, $section_name, $term_id, $instructor_name, $max_students]);
                        $created['sections']++;
                    } catch (PDOException $e) {
                        // likely duplicate due to UNIQUE constraint; ignore
                    }
                }
            }

            $pdo->commit();
        } catch (Throwable $e) {
            $pdo->rollBack();
            j(['ok' => false, 'error' => 'import_failed', 'detail' => $e->getMessage(), 'parser_raw' => $output]);
        }

        j(['ok' => true, 'created' => $created]);
    }

    default:
        j(['ok' => false, 'error' => 'unknown_action']);
}
