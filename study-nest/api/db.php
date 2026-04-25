<?php
// Centralized CORS, Session and DB configuration

// Load .env variables before any config reads.
if (file_exists(__DIR__ . '/.env')) {
    $lines = file(__DIR__ . '/.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        $parts = explode('=', $line, 2);
        if (count($parts) === 2) {
            $_ENV[trim($parts[0])] = trim($parts[1]);
        }
    }
}

// Security: allow credentials only for known origins. Add production domains with CORS_ALLOWED_ORIGINS.
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$configuredOrigins = getenv('CORS_ALLOWED_ORIGINS') ?: ($_ENV['CORS_ALLOWED_ORIGINS'] ?? '');
$allowed_origins = array_values(array_filter(array_map('trim', explode(',', $configuredOrigins))));
$allowed_origins = array_merge($allowed_origins, [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
]);
$allowOrigin = in_array($origin, $allowed_origins, true) ? $origin : ($origin === '' ? '*' : 'null');
header("Access-Control-Allow-Origin: $allowOrigin");
header("Vary: Origin");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, Origin");
header("Access-Control-Max-Age: 86400");

if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

header("Content-Type: application/json; charset=utf-8");

// DB-Backed Session Handler Class
class StudyNestSessionHandler implements SessionHandlerInterface {
    private $pdo;
    public function __construct($pdo) { $this->pdo = $pdo; }
    public function open($path, $name): bool { return true; }
    public function close(): bool { return true; }
    public function read($id): string {
        $stmt = $this->pdo->prepare("SELECT data FROM sessions WHERE id = ? AND expiry > ?");
        $stmt->execute([$id, time()]);
        return $stmt->fetchColumn() ?: '';
    }
    public function write($id, $data): bool {
        $expiry = time() + (int)ini_get('session.gc_maxlifetime');
        $stmt = $this->pdo->prepare("INSERT INTO sessions (id, data, expiry) VALUES (?, ?, ?) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, expiry = EXCLUDED.expiry");
        return $stmt->execute([$id, $data, $expiry]);
    }
    public function destroy($id): bool {
        return $this->pdo->prepare("DELETE FROM sessions WHERE id = ?")->execute([$id]);
    }
    public function gc($max_lifetime): int|false {
        $stmt = $this->pdo->prepare("DELETE FROM sessions WHERE expiry < ?");
        return $stmt->execute([time()]) ? 1 : false;
    }
}

// DB config
$host = getenv('DB_HOST') ?: ($_ENV['DB_HOST'] ?? '127.0.0.1');
$dbname = getenv('DB_NAME') ?: ($_ENV['DB_NAME'] ?? 'studynest');
$user = getenv('DB_USER') ?: ($_ENV['DB_USER'] ?? 'postgres');
$pass = getenv('DB_PASS') ?: ($_ENV['DB_PASS'] ?? '');
$port = getenv('DB_PORT') ?: ($_ENV['DB_PORT'] ?? '5432');

try {
    $dsn = "pgsql:host=$host;port=$port;dbname=$dbname";
    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
        PDO::ATTR_PERSISTENT => true,
        PDO::ATTR_TIMEOUT => 5,
    ]);

    // Ensure sessions table exists
    $pdo->exec("CREATE TABLE IF NOT EXISTS sessions (id VARCHAR(128) PRIMARY KEY, data TEXT, expiry INTEGER)");

    // Register DB Session Handler
    if (PHP_SAPI !== 'cli') {
        session_set_save_handler(new StudyNestSessionHandler($pdo), true);
        
        // Configure session with robust settings
        if (session_status() === PHP_SESSION_NONE) {
            // Force secure in production (Vercel)
            $is_secure = (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https')
                       || (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
                       || ($_SERVER['SERVER_NAME'] !== 'localhost' && $_SERVER['SERVER_NAME'] !== '127.0.0.1');

            session_set_cookie_params([
                'lifetime' => 86400,
                'path' => '/',
                'secure' => $is_secure,
                'httponly' => true,
                'samesite' => 'Lax',
            ]);
            session_start();
        }
    }

    // --- Database Schema Bootstrap (PostgreSQL) ---
    // We split these into an array to be more resilient (one failing table doesn't block others)
    $tables = [
        "users" => "CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(100) UNIQUE NOT NULL,
            student_id VARCHAR(50) UNIQUE NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            bio TEXT,
            profile_picture_url TEXT,
            points INTEGER DEFAULT 0,
            role VARCHAR(20) DEFAULT 'User',
            status VARCHAR(20) DEFAULT 'Active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        "resources" => "CREATE TABLE IF NOT EXISTS resources (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            author VARCHAR(100) NOT NULL,
            course VARCHAR(100) NOT NULL,
            semester VARCHAR(50),
            kind VARCHAR(20) DEFAULT 'note',
            visibility VARCHAR(20) DEFAULT 'public',
            src_type VARCHAR(20),
            url TEXT NOT NULL,
            tags TEXT,
            votes INTEGER DEFAULT 0,
            bookmarks INTEGER DEFAULT 0,
            flagged BOOLEAN DEFAULT FALSE,
            shared_from_recording_id INTEGER,
            shared_at TIMESTAMP,
            cloudinary_public_id VARCHAR(255),
            cloudinary_resource_type VARCHAR(20),
            cloudinary_version BIGINT,
            cloudinary_bytes BIGINT,
            original_filename VARCHAR(255),
            mime_type VARCHAR(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        "recordings" => "CREATE TABLE IF NOT EXISTS recordings (
            id SERIAL PRIMARY KEY,
            room_id VARCHAR(64) NOT NULL,
            video_url TEXT NOT NULL,
            user_name VARCHAR(100),
            user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            duration INTEGER DEFAULT 0,
            recorded_at TIMESTAMP,
            title VARCHAR(255),
            description TEXT,
            course VARCHAR(100),
            semester VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        "notes" => "CREATE TABLE IF NOT EXISTS notes (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            course VARCHAR(100) NOT NULL,
            semester VARCHAR(50),
            tags TEXT,
            description TEXT,
            file_url TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        "questions" => "CREATE TABLE IF NOT EXISTS questions (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            body TEXT NOT NULL,
            tags TEXT,
            anonymous BOOLEAN DEFAULT FALSE,
            author VARCHAR(100),
            votes INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        "answers" => "CREATE TABLE IF NOT EXISTS answers (
            id SERIAL PRIMARY KEY,
            question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            body TEXT NOT NULL,
            author VARCHAR(100),
            votes INTEGER DEFAULT 0,
            helpful INTEGER DEFAULT 0,
            is_accepted BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        "notifications" => "CREATE TABLE IF NOT EXISTS notifications (
            id SERIAL PRIMARY KEY,
            student_id VARCHAR(50) REFERENCES users(student_id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            message TEXT,
            link TEXT,
            type VARCHAR(50) DEFAULT 'general',
            reference_id VARCHAR(255),
            scheduled_at TIMESTAMP,
            sent_at TIMESTAMP,
            read_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        "points_history" => "CREATE TABLE IF NOT EXISTS points_history (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            points INTEGER NOT NULL,
            action_type VARCHAR(50),
            description TEXT,
            reference_id VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        "chat_history" => "CREATE TABLE IF NOT EXISTS chat_history (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            user_message TEXT,
            bot_response TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        "meetings" => "CREATE TABLE IF NOT EXISTS meetings (
            id VARCHAR(16) PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            course VARCHAR(255),
            course_title VARCHAR(255),
            course_thumbnail TEXT,
            created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            status VARCHAR(20) DEFAULT 'live',
            starts_at TIMESTAMP,
            ends_at TIMESTAMP,
            participants INTEGER DEFAULT 1,
            creator_session_id VARCHAR(255)
        )",
        "courses" => "CREATE TABLE IF NOT EXISTS courses (
            id SERIAL PRIMARY KEY,
            course_code VARCHAR(50) NOT NULL,
            course_title VARCHAR(255) NOT NULL,
            department VARCHAR(100),
            program VARCHAR(100),
            course_thumbnail TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        "tmp_courses" => "CREATE TABLE IF NOT EXISTS tmp_courses (
            course_code VARCHAR(50),
            course_title VARCHAR(255),
            department VARCHAR(100),
            program VARCHAR(100),
            course_thumbnail TEXT
        )",
        "meeting_participants" => "CREATE TABLE IF NOT EXISTS meeting_participants (
            id SERIAL PRIMARY KEY,
            meeting_id VARCHAR(16) REFERENCES meetings(id) ON DELETE CASCADE,
            user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            session_id VARCHAR(255),
            display_name VARCHAR(100),
            joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            left_at TIMESTAMP
        )",
        "todos" => "CREATE TABLE IF NOT EXISTS todos (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            type VARCHAR(50) DEFAULT 'default',
            status VARCHAR(20) DEFAULT 'pending',
            due_date DATE,
            due_time TIME,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        "platform_settings" => "CREATE TABLE IF NOT EXISTS platform_settings (
            key VARCHAR(100) PRIMARY KEY,
            value TEXT,
            type VARCHAR(20) DEFAULT 'string',
            description TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        "audit_logs" => "CREATE TABLE IF NOT EXISTS audit_logs (
            id SERIAL PRIMARY KEY,
            admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            action VARCHAR(100) NOT NULL,
            target_type VARCHAR(100),
            target_id VARCHAR(100),
            details TEXT,
            ip_address VARCHAR(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        "question_votes" => "CREATE TABLE IF NOT EXISTS question_votes (
            id SERIAL PRIMARY KEY,
            question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            vote_type INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(question_id, user_id)
        )",
        "answer_votes" => "CREATE TABLE IF NOT EXISTS answer_votes (
            id SERIAL PRIMARY KEY,
            answer_id INTEGER REFERENCES answers(id) ON DELETE CASCADE,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            vote_type INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(answer_id, user_id)
        )",
        "conversations" => "CREATE TABLE IF NOT EXISTS conversations (
            id SERIAL PRIMARY KEY,
            a_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            b_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(a_user_id, b_user_id)
        )",
        "messages" => "CREATE TABLE IF NOT EXISTS messages (
            id BIGSERIAL PRIMARY KEY,
            conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
            sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            body TEXT,
            attachment_url TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        "message_reads" => "CREATE TABLE IF NOT EXISTS message_reads (
            conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            last_read_message_id BIGINT DEFAULT 0,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (conversation_id, user_id)
        )",
        "groups" => "CREATE TABLE IF NOT EXISTS groups( id SERIAL PRIMARY KEY, section_name VARCHAR(255) UNIQUE NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP )",
        "group_members" => "CREATE TABLE IF NOT EXISTS group_members (
            id SERIAL PRIMARY KEY,
            group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            status VARCHAR(20) DEFAULT 'pending',
            proof_url TEXT,
            joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        "group_messages" => "CREATE TABLE IF NOT EXISTS group_messages (
            id SERIAL PRIMARY KEY,
            group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            message TEXT,
            attachment_url TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        "ai_file_checks" => "CREATE TABLE IF NOT EXISTS ai_file_checks (
            id SERIAL PRIMARY KEY,
            filename VARCHAR(255),
            mime VARCHAR(120),
            size_kb INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        "bookmarks" => "CREATE TABLE IF NOT EXISTS bookmarks (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            resource_id INTEGER REFERENCES resources(id) ON DELETE CASCADE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, resource_id)
        )"
    ];

    foreach ($tables as $name => $sql) {
        try {
            $pdo->exec($sql);
        } catch (Throwable $e) {
            error_log("Failed to initialize table $name: " . $e->getMessage());
        }
    }

    // Initialize default platform settings
    $settings = [
        ['maintenance_mode', 'false', 'boolean', 'Disable platform access for regular users'],
        ['allow_signups', 'true', 'boolean', 'Enable or disable new user registrations'],
        ['max_upload_size_mb', '50', 'number', 'Maximum file upload size in MB']
    ];
    $stmt = $pdo->prepare("INSERT INTO platform_settings (key, value, type, description) VALUES (?, ?, ?, ?) ON CONFLICT (key) DO NOTHING");
    foreach ($settings as $s) { $stmt->execute($s); }

    // Column updates (Alters) - Idempotent
    $alters = [
        "ALTER TABLE meetings ADD COLUMN IF NOT EXISTS creator_session_id VARCHAR(255)",
        "ALTER TABLE meeting_participants ALTER COLUMN session_id TYPE VARCHAR(255)",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0",
        "ALTER TABLE meetings ALTER COLUMN course TYPE VARCHAR(255)",
        "ALTER TABLE points_history ALTER COLUMN reference_id TYPE VARCHAR(255)",
        "ALTER TABLE resources ADD COLUMN IF NOT EXISTS src_type VARCHAR(20)",
        "ALTER TABLE resources ADD COLUMN IF NOT EXISTS shared_from_recording_id INTEGER",
        "ALTER TABLE resources ADD COLUMN IF NOT EXISTS shared_at TIMESTAMP",
        "ALTER TABLE resources ADD COLUMN IF NOT EXISTS cloudinary_public_id VARCHAR(255)",
        "ALTER TABLE resources ADD COLUMN IF NOT EXISTS cloudinary_resource_type VARCHAR(20)",
        "ALTER TABLE resources ADD COLUMN IF NOT EXISTS cloudinary_version BIGINT",
        "ALTER TABLE resources ADD COLUMN IF NOT EXISTS cloudinary_bytes BIGINT",
        "ALTER TABLE resources ADD COLUMN IF NOT EXISTS original_filename VARCHAR(255)",
        "ALTER TABLE resources ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100)",
        "ALTER TABLE group_members ADD COLUMN IF NOT EXISTS proof_url TEXT",
        "ALTER TABLE group_messages ADD COLUMN IF NOT EXISTS attachment_url TEXT",
        "ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_url TEXT",
        "ALTER TABLE recordings ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
    ];
    foreach ($alters as $sql) {
        try { $pdo->exec($sql); } catch (Throwable $e) { /* Ignore known possible failures */ }
    }
    try {
        $pdo->exec("ALTER TABLE resources ALTER COLUMN flagged DROP DEFAULT");
        $pdo->exec("ALTER TABLE resources ALTER COLUMN flagged TYPE BOOLEAN USING CASE WHEN flagged::text IN ('1','t','true','yes') THEN TRUE ELSE FALSE END");
        $pdo->exec("ALTER TABLE resources ALTER COLUMN flagged SET DEFAULT FALSE");
    } catch (Throwable $e) { /* Already boolean or unavailable. */ }
    try {
        $pdo->exec("CREATE UNIQUE INDEX IF NOT EXISTS uniq_group_members_group_user ON group_members(group_id, user_id)");
        $pdo->exec("CREATE INDEX IF NOT EXISTS idx_group_messages_group_created ON group_messages(group_id, created_at)");
        $pdo->exec("CREATE INDEX IF NOT EXISTS idx_resources_user_kind_created ON resources(user_id, kind, created_at)");
        $pdo->exec("CREATE INDEX IF NOT EXISTS idx_recordings_user_id ON recordings(user_id)");
    } catch (Throwable $e) { /* Index creation should not block startup. */ }

} catch (Throwable $e) {
    if (!headers_sent()) {
        global $allowOrigin;
        header("Access-Control-Allow-Origin: " . ($allowOrigin ?? '*'));
        header("Vary: Origin");
        header("Access-Control-Allow-Credentials: true");
        header("Content-Type: application/json; charset=utf-8");
        http_response_code(500);
    }
    echo json_encode(['ok' => false, 'error' => 'DB bootstrap failed', 'detail' => $e->getMessage()]);
    exit;
}

/* ==========================================================
   Centralized Reward & Notification System
   ========================================================== */
/**
 * Award points to a user, record history, and check for milestones/rank shifts.
 * Returns the new total points on success, false on failure.
 */
function awardPoints(PDO $pdo, $user_id, $points, $action_type, $reference_id = null, $description = null) {
    if (!$user_id) return false;

    try {
        // Get current points before update
        $st = $pdo->prepare("SELECT points, student_id, username FROM users WHERE id = ?");
        $st->execute([$user_id]);
        $user = $st->fetch(PDO::FETCH_ASSOC);
        if (!$user) return false;

        $oldPoints = (int)($user['points'] ?? 0);
        $newPoints = $oldPoints + $points;
        $sid = $user['student_id'];

        // Update total
        $pdo->prepare("UPDATE users SET points = ? WHERE id = ?")->execute([$newPoints, $user_id]);

        // History
        $pdo->prepare("INSERT INTO points_history (user_id, points, action_type, reference_id, description) VALUES (?, ?, ?, ?, ?)")
            ->execute([$user_id, $points, $action_type, (string)$reference_id, $description]);

        // 1. Milestone Notifications
        $milestones = [100, 500, 1000, 2500, 5000];
        foreach ($milestones as $m) {
            if ($oldPoints < $m && $newPoints >= $m) {
                $nstmt = $pdo->prepare("INSERT INTO notifications (student_id, title, message, type, link) VALUES (?, ?, ?, ?, '/profile')");
                $nstmt->execute([$sid, "🏆 Milestone Achieved!", "Congratulations! You've reached {$m} Study Points. Keep it up!", "milestone_reached"]);
            }
        }

        // 2. Simple Rank Shift Check (Notify if entering Top 3)
        $rankStmt = $pdo->prepare("SELECT COUNT(*) + 1 as rank FROM users WHERE points > ?");
        $rankStmt->execute([$newPoints]);
        $newRank = (int)$rankStmt->fetchColumn();

        $oldRankStmt = $pdo->prepare("SELECT COUNT(*) + 1 as rank FROM users WHERE points > ?");
        $oldRankStmt->execute([$oldPoints]);
        $oldRank = (int)$oldRankStmt->fetchColumn();

        if ($newRank <= 3 && $newRank < $oldRank) {
            $nstmt = $pdo->prepare("INSERT INTO notifications (student_id, title, message, type, link) VALUES (?, ?, ?, ?, '/points-leaderboard')");
            $nstmt->execute([$sid, "⚡ Rank Climbed!", "You are now Rank #{$newRank} on the Global Leaderboard! Amazing work.", "rank_shift"]);
        }

        return $newPoints;
    } catch (Throwable $e) {
        error_log("awardPoints error: " . $e->getMessage());
        return false;
    }
}
