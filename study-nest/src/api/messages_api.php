<?php
// File: messages_api.php
// One-file backend for Messages.jsx (users_search, conversations_ensure, conversations_list,
// messages_fetch, messages_send, messages_mark_read). Requires db.php to expose $pdo and sessions.
// No changes to db/php elsewhere. Creates missing tables if needed.

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

require_once __DIR__ . '/db.php'; // must set $pdo and session_start() or similar
if (session_status() !== PHP_SESSION_ACTIVE) {
    @session_start();
}

// ---------- Helpers ----------
function json_ok($data = [])
{
    echo json_encode(['ok' => true] + $data, JSON_UNESCAPED_SLASHES);
    exit;
}
function json_err($msg, $code = 400, $extra = [])
{
    http_response_code($code);
    echo json_encode(['ok' => false, 'error' => $msg] + $extra, JSON_UNESCAPED_SLASHES);
    exit;
}
function me_or_401(PDO $pdo)
{
    $uid = $_SESSION['user_id'] ?? null;  // Assumes you set this at login
    if (!$uid)
        json_err("unauthorized", 401);
    // Optionally verify user exists
    $st = $pdo->prepare("SELECT id, username, email, student_id FROM users WHERE id=?");
    $st->execute([$uid]);
    $me = $st->fetch(PDO::FETCH_ASSOC);
    if (!$me)
        json_err("unauthorized", 401);
    return $me;
}
function ensure_schema(PDO $pdo)
{
    // conversations: single row per pair (a_user_id < b_user_id)
    $pdo->exec("
    CREATE TABLE IF NOT EXISTS conversations (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      a_user_id INT UNSIGNED NOT NULL,
      b_user_id INT UNSIGNED NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_pair (a_user_id, b_user_id),
      KEY idx_a (a_user_id),
      KEY idx_b (b_user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  ");

    // messages
    $pdo->exec("
    CREATE TABLE IF NOT EXISTS messages (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      conversation_id INT UNSIGNED NOT NULL,
      sender_id INT UNSIGNED NOT NULL,
      body TEXT NULL,
      attachment_url VARCHAR(1024) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_conv (conversation_id, id),
      KEY idx_sender (sender_id),
      CONSTRAINT fk_msg_conv FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  ");

    // per-user read position
    $pdo->exec("
    CREATE TABLE IF NOT EXISTS message_reads (
      conversation_id INT UNSIGNED NOT NULL,
      user_id INT UNSIGNED NOT NULL,
      last_read_message_id BIGINT UNSIGNED NOT NULL DEFAULT 0,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (conversation_id, user_id),
      KEY idx_user (user_id),
      CONSTRAINT fk_read_conv FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  ");
}

// Normalize pair so (a<b) to keep only one conversation row per pair.
function norm_pair($u1, $u2)
{
    $a = min($u1, $u2);
    $b = max($u1, $u2);
    return [$a, $b];
}

// ---------- Router ----------
$action = $_GET['action'] ?? null;
if (!$action) {
    // When included directly by short proxy files, they can set $action manually.
    $action = '__direct__'; // will show usage
}

try {
    ensure_schema($pdo);
    $me = me_or_401($pdo);

    switch ($action) {
        // -----------------------------------------------------------------------
        // users_search.php?q=
        // -----------------------------------------------------------------------

        case 'users_search':
            $q = trim($_GET['q'] ?? '');
            if ($q === '') {
                json_ok(['users' => []]);
            }

            // Prioritize exact username/email matches in ORDER BY, then fall back
            $like = '%' . $q . '%';

            $sql = "
    SELECT id, username, student_id, email
    FROM users
    WHERE id <> ?
      AND (
        username   LIKE ?
        OR email   LIKE ?
        OR student_id LIKE ?
      )
    ORDER BY
      (username LIKE ?) DESC,  -- exact match boost (no %)
      (email    LIKE ?) DESC,  -- exact match boost (no %)
      id ASC
    LIMIT 20
  ";

            $st = $pdo->prepare($sql);
            // placeholders order: me, like, like, like, exact, exact
            $st->execute([
                (int) $me['id'],
                $like,
                $like,
                $like,
                $q,
                $q
            ]);

            $users = $st->fetchAll(PDO::FETCH_ASSOC);
            json_ok(['users' => $users]);


        // -----------------------------------------------------------------------
        // conversations_ensure.php  (POST {recipient_id})
        // -----------------------------------------------------------------------
        case 'conversations_ensure':
            $in = json_decode(file_get_contents('php://input'), true) ?? [];
            $rid = (int) ($in['recipient_id'] ?? 0);
            if ($rid <= 0 || $rid === (int) $me['id'])
                json_err("invalid recipient_id");

            [$a, $b] = norm_pair((int) $me['id'], $rid);

            // ensure user exists
            $chk = $pdo->prepare("SELECT id FROM users WHERE id=?");
            $chk->execute([$rid]);
            if (!$chk->fetchColumn())
                json_err("recipient not found", 404);

            // try find existing
            $find = $pdo->prepare("SELECT id FROM conversations WHERE a_user_id=? AND b_user_id=? LIMIT 1");
            $find->execute([$a, $b]);
            $cid = (int) ($find->fetchColumn() ?: 0);

            if (!$cid) {
                $ins = $pdo->prepare("INSERT INTO conversations (a_user_id, b_user_id) VALUES (?,?)");
                try {
                    $ins->execute([$a, $b]);
                    $cid = (int) $pdo->lastInsertId();
                } catch (PDOException $e) {
                    // race: someone else inserted concurrently -> refetch
                    $find->execute([$a, $b]);
                    $cid = (int) ($find->fetchColumn() ?: 0);
                    if (!$cid)
                        throw $e;
                }
            }

            json_ok(['conversation_id' => $cid]);

        // -----------------------------------------------------------------------
        // conversations_list.php  (GET)
        // Returns: [{conversation_id, other_user_id, last_message, unread}]
        // -----------------------------------------------------------------------
        case 'conversations_list':
            $uid = (int) $me['id'];

            // Use positional placeholders (no repeated named params)
            $sql = "
  SELECT
    c.id AS conversation_id,
    CASE WHEN c.a_user_id = ? THEN c.b_user_id ELSE c.a_user_id END AS other_user_id,
    u.username AS other_username,
    u.email    AS other_email,
    (
      SELECT SUBSTRING(m.body,1,160)
      FROM messages m
      WHERE m.conversation_id = c.id
      ORDER BY m.id DESC
      LIMIT 1
    ) AS last_message,
    (
      SELECT COUNT(*)
      FROM messages m2
      LEFT JOIN message_reads r
        ON r.conversation_id = m2.conversation_id AND r.user_id = ?
      WHERE m2.conversation_id = c.id
        AND m2.id > COALESCE(r.last_read_message_id, 0)
        AND m2.sender_id <> ?
    ) AS unread
  FROM conversations c
  JOIN users u
    ON u.id = CASE WHEN c.a_user_id = ? THEN c.b_user_id ELSE c.a_user_id END
  WHERE c.a_user_id = ? OR c.b_user_id = ?
  ORDER BY
    COALESCE((SELECT MAX(m3.id) FROM messages m3 WHERE m3.conversation_id = c.id), 0) DESC,
    c.id DESC
  LIMIT 100
";
            $st = $pdo->prepare($sql);
            $st->execute([$uid, $uid, $uid, $uid, $uid, $uid]); // 6 placeholders

            $rows = $st->fetchAll(PDO::FETCH_ASSOC);
            json_ok(['conversations' => $rows]);


        // -----------------------------------------------------------------------
        // messages_fetch.php?conversation_id=&since_id=
        // If since_id=0 -> return last 50 messages DESC (frontend reverses)
        // If since_id>0 -> return new messages after since_id ASC
        // -----------------------------------------------------------------------
        case 'messages_fetch':
            $cid = (int) ($_GET['conversation_id'] ?? 0);
            if ($cid <= 0)
                json_err("conversation_id required");

            // membership check
            $st = $pdo->prepare("
        SELECT 1 FROM conversations
        WHERE id=? AND (a_user_id=? OR b_user_id=?)
        LIMIT 1
      ");
            $st->execute([$cid, $me['id'], $me['id']]);
            if (!$st->fetchColumn())
                json_err("forbidden", 403);

            $since = (int) ($_GET['since_id'] ?? 0);
            if ($since > 0) {
                $q = $pdo->prepare("
          SELECT id, conversation_id, sender_id, body, attachment_url, created_at
          FROM messages
          WHERE conversation_id=? AND id > ?
          ORDER BY id ASC
          LIMIT 200
        ");
                $q->execute([$cid, $since]);
                $msgs = $q->fetchAll(PDO::FETCH_ASSOC);
            } else {
                $q = $pdo->prepare("
          SELECT id, conversation_id, sender_id, body, attachment_url, created_at
          FROM messages
          WHERE conversation_id=?
          ORDER BY id DESC
          LIMIT 50
        ");
                $q->execute([$cid]);
                $msgs = $q->fetchAll(PDO::FETCH_ASSOC);
            }
            json_ok(['messages' => $msgs]);

        // -----------------------------------------------------------------------
        // messages_send.php  (POST {conversation_id, body, [attachment_url]})
        // -----------------------------------------------------------------------
        case 'messages_send': {
            // 0) who am I + basic vars
            $uid = (int) $me['id'];

            // 1) Parse input (supports JSON or multipart)
            $ctype = $_SERVER['CONTENT_TYPE'] ?? '';
            $isMultipart = stripos($ctype, 'multipart/form-data') !== false;

            if ($isMultipart) {
                $cid = (int) ($_POST['conversation_id'] ?? 0);
                $body = trim((string) ($_POST['body'] ?? ''));
            } else {
                $in = json_decode(file_get_contents('php://input'), true) ?? [];
                $cid = (int) ($in['conversation_id'] ?? 0);
                $body = trim((string) ($in['body'] ?? ''));
            }

            if ($cid <= 0)
                json_err("conversation_id required");

            // 2) Membership check
            $st = $pdo->prepare("
    SELECT 1 FROM conversations
    WHERE id=? AND (a_user_id=? OR b_user_id=?)
    LIMIT 1
  ");
            $st->execute([$cid, $uid, $uid]);
            if (!$st->fetchColumn())
                json_err("forbidden", 403);

            // 3) Handle optional file
            $attachmentUrl = null;

            if ($isMultipart && !empty($_FILES['attachment']) && is_uploaded_file($_FILES['attachment']['tmp_name'])) {
                // Basic limits (adjust if you want)
                $MAX_BYTES = 25 * 1024 * 1024; // 25 MB
                if ($_FILES['attachment']['size'] > $MAX_BYTES) {
                    json_err("file too large (max 25MB)", 400);
                }

                // Very permissive types, but block php-like extensions for safety
                $origName = $_FILES['attachment']['name'];
                $ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION));
                $blocked = ['php', 'phtml', 'phar', 'phps', 'cgi', 'pl', 'exe', 'js'];
                if (in_array($ext, $blocked, true)) {
                    json_err("blocked file type", 400);
                }

                // Ensure uploads dir exists
                $dir = __DIR__ . '/uploads';
                if (!is_dir($dir)) {
                    @mkdir($dir, 0777, true);
                }

                // Generate safe unique filename
                $safeBase = preg_replace('/[^a-zA-Z0-9._-]/', '_', pathinfo($origName, PATHINFO_FILENAME));
                if ($safeBase === '')
                    $safeBase = 'file';
                $fname = sprintf('%s_%s.%s', $safeBase, bin2hex(random_bytes(6)), $ext);
                $target = $dir . '/' . $fname;

                if (!move_uploaded_file($_FILES['attachment']['tmp_name'], $target)) {
                    json_err("failed to save upload", 500);
                }
                // public/relative path (adjust if you serve from different root)
                $attachmentUrl = 'uploads/' . $fname;
            }

            // 4) Validate non-empty message (body or attachment)
            if ($attachmentUrl === null && $body === '') {
                json_err("empty message");
            }

            // 5) Insert message
            $ins = $pdo->prepare("
    INSERT INTO messages (conversation_id, sender_id, body, attachment_url)
    VALUES (?, ?, NULLIF(?, ''), ?)
  ");
            $ins->execute([$cid, $uid, $body, $attachmentUrl]);
            $id = (int) $pdo->lastInsertId();

            // 6) Read it back for client
            $sel = $pdo->prepare("
    SELECT id, conversation_id, sender_id, body, attachment_url, created_at
    FROM messages
    WHERE id=?
  ");
            $sel->execute([$id]);
            $msg = $sel->fetch(PDO::FETCH_ASSOC);

            // 7) Mark my read pointer
            $up = $pdo->prepare("
    INSERT INTO message_reads (conversation_id, user_id, last_read_message_id)
    VALUES (?,?,?)
    ON DUPLICATE KEY UPDATE last_read_message_id = GREATEST(last_read_message_id, VALUES(last_read_message_id))
  ");
            $up->execute([$cid, $uid, $id]);

            json_ok(['message' => $msg]);
        }

        // -----------------------------------------------------------------------
        // messages_mark_read.php  (POST {conversation_id, last_read_message_id})
        // -----------------------------------------------------------------------
        case 'messages_mark_read':
            $in = json_decode(file_get_contents('php://input'), true) ?? [];
            $cid = (int) ($in['conversation_id'] ?? 0);
            $last = (int) ($in['last_read_message_id'] ?? 0);
            if ($cid <= 0 || $last < 0)
                json_err("invalid params");

            // membership check
            $st = $pdo->prepare("
        SELECT 1 FROM conversations
        WHERE id=? AND (a_user_id=? OR b_user_id=?)
        LIMIT 1
      ");
            $st->execute([$cid, $me['id'], $me['id']]);
            if (!$st->fetchColumn())
                json_err("forbidden", 403);

            $up = $pdo->prepare("
        INSERT INTO message_reads (conversation_id, user_id, last_read_message_id)
        VALUES (?,?,?)
        ON DUPLICATE KEY UPDATE last_read_message_id=GREATEST(last_read_message_id, VALUES(last_read_message_id))
      ");
            $up->execute([$cid, $me['id'], $last]);
            json_ok();

        // -----------------------------------------------------------------------
        default:
            // Simple usage info
            json_ok([
                'endpoints' => [
                    'GET  messages_api.php?action=users_search&q=term',
                    'POST messages_api.php?action=conversations_ensure {recipient_id}',
                    'GET  messages_api.php?action=conversations_list',
                    'GET  messages_api.php?action=messages_fetch&conversation_id=123&since_id=0',
                    'POST messages_api.php?action=messages_send {conversation_id, body, [attachment_url]}',
                    'POST messages_api.php?action=messages_mark_read {conversation_id, last_read_message_id}'
                ]
            ]);
    }

} catch (PDOException $e) {
    json_err("Server error", 500, ['detail' => $e->getMessage()]);
} catch (Throwable $t) {
    json_err("Server error", 500, ['detail' => $t->getMessage()]);
}

/*
---------------------------------------------------------------------------
If you want to KEEP your existing URLs without changing Messages.jsx,
create tiny proxy files that just set $action and include this one:

// users_search.php
<?php $_GET['action']='users_search'; require __DIR__.'/messages_api.php';

# conversations_ensure.php
<?php $_GET['action']='conversations_ensure'; require __DIR__.'/messages_api.php';

# conversations_list.php
<?php $_GET['action']='conversations_list'; require __DIR__.'/messages_api.php';

# messages_fetch.php
<?php $_GET['action']='messages_fetch'; require __DIR__.'/messages_api.php';

# messages_send.php
<?php $_GET['action']='messages_send'; require __DIR__.'/messages_api.php';

# messages_mark_read.php
<?php $_GET['action']='messages_mark_read'; require __DIR__.'/messages_api.php';

---------------------------------------------------------------------------
SQL it will create automatically (for reference / manual run if you prefer):

CREATE TABLE IF NOT EXISTS conversations (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  a_user_id INT UNSIGNED NOT NULL,
  b_user_id INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_pair (a_user_id, b_user_id),
  KEY idx_a (a_user_id),
  KEY idx_b (b_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS messages (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  conversation_id INT UNSIGNED NOT NULL,
  sender_id INT UNSIGNED NOT NULL,
  body TEXT NULL,
  attachment_url VARCHAR(1024) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_conv (conversation_id, id),
  KEY idx_sender (sender_id),
  CONSTRAINT fk_msg_conv FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS message_reads (
  conversation_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  last_read_message_id BIGINT UNSIGNED NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (conversation_id, user_id),
  KEY idx_user (user_id),
  CONSTRAINT fk_read_conv FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
*/
