<?php
// Centralized CORS, Session and DB configuration

// Security: In production, you SHOULD restrict $origin to your specific domain.
// e.g. $allowed_origins = ["http://localhost:5173", "https://your-production-domain.com"];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '*'; 
header("Access-Control-Allow-Origin: $origin");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, Origin");
header("Access-Control-Max-Age: 86400");

if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Configure session with robust settings
if (session_status() === PHP_SESSION_NONE) {
    // Determine if we are on HTTPS
    $is_secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || ($_SERVER['SERVER_PORT'] == 443);
    
    session_set_cookie_params([
        'lifetime' => 86400,
        'path' => '/',
        'secure' => $is_secure, // Automatically true if on HTTPS
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

header("Content-Type: application/json; charset=utf-8");

// Load .env variables (simplified manual loader)
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

// DB config
$host = getenv('DB_HOST') ?: ($_ENV['DB_HOST'] ?? '127.0.0.1');
$dbname = getenv('DB_NAME') ?: ($_ENV['DB_NAME'] ?? 'studynest');
$user = getenv('DB_USER') ?: ($_ENV['DB_USER'] ?? 'postgres');
$pass = getenv('DB_PASS') ?: ($_ENV['DB_PASS'] ?? '');
$port = getenv('DB_PORT') ?: ($_ENV['DB_PORT'] ?? '5432');

// Database Credentials - Using variables from .env above

try {
$dsn = "pgsql:host=$host;port=$port;dbname=$dbname";
    // Connection pooling + production settings
    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
        PDO::ATTR_PERSISTENT => true,  // Connection pooling
        PDO::ATTR_TIMEOUT => 5,        // 5s timeout
        PDO::PGSQL_ATTR_DISABLE_PREPARES => false,
    ]);
    
    // Production: Enable query logging
    if (isset($_ENV['APP_ENV']) && $_ENV['APP_ENV'] === 'production') {
        $pdo->setAttribute(PDO::ATTR_STATEMENT_CLASS, ['StudyNest\\PDOStatement', []]);
    }


    // Bootstrap Schema (PostgreSQL Syntax)
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS users (
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
        );

        CREATE TABLE IF NOT EXISTS todos (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            type VARCHAR(50) DEFAULT 'default',
            status VARCHAR(50) DEFAULT 'pending',
            due_date DATE,
            due_time TIME,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS academic_terms (
            id SERIAL PRIMARY KEY,
            term_name VARCHAR(100) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS courses (
            id SERIAL PRIMARY KEY,
            course_code VARCHAR(32) UNIQUE NOT NULL,
            course_title VARCHAR(255) NOT NULL,
            department VARCHAR(120),
            program VARCHAR(120),
            course_thumbnail TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS course_sections (
            id SERIAL PRIMARY KEY,
            course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
            term_id INTEGER REFERENCES academic_terms(id) ON DELETE CASCADE,
            section_name VARCHAR(100) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS group_chats (
            id SERIAL PRIMARY KEY,
            chat_name VARCHAR(255) NOT NULL,
            course_section_id INTEGER REFERENCES course_sections(id) ON DELETE CASCADE,
            description TEXT,
            is_active BOOLEAN DEFAULT TRUE,
            created_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS group_chat_participants (
            id SERIAL PRIMARY KEY,
            group_chat_id INTEGER REFERENCES group_chats(id) ON DELETE CASCADE,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_admin BOOLEAN DEFAULT FALSE,
            UNIQUE(group_chat_id, user_id)
        );

        CREATE TABLE IF NOT EXISTS group_chat_messages (
            id BIGSERIAL PRIMARY KEY,
            group_chat_id INTEGER REFERENCES group_chats(id) ON DELETE CASCADE,
            sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            message_type VARCHAR(20) DEFAULT 'text',
            body TEXT,
            attachment_url TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS group_chat_message_reads (
            group_chat_id INTEGER REFERENCES group_chats(id) ON DELETE CASCADE,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            last_read_message_id BIGINT DEFAULT 0,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (group_chat_id, user_id)
        );

        CREATE TABLE IF NOT EXISTS resources (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            title VARCHAR(255) NOT NULL,
            kind VARCHAR(50),
            course VARCHAR(100),
            semester VARCHAR(50),
            tags TEXT,
            description TEXT,
            author VARCHAR(255),
            src_type VARCHAR(50),
            url TEXT,
            votes INTEGER DEFAULT 0,
            bookmarks INTEGER DEFAULT 0,
            flagged BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS recordings (
            id SERIAL PRIMARY KEY,
            room_id VARCHAR(64) NOT NULL,
            video_url TEXT NOT NULL,
            user_name VARCHAR(255),
            user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            duration INTEGER DEFAULT 0,
            recorded_at TIMESTAMP,
            title VARCHAR(500),
            description TEXT,
            course VARCHAR(100),
            semester VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS notes (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            course VARCHAR(255),
            semester VARCHAR(255),
            tags TEXT,
            description TEXT,
            file_url TEXT,
            user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS bookmarks (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            resource_id INTEGER REFERENCES resources(id) ON DELETE CASCADE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS questions (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            body TEXT NOT NULL,
            tags TEXT,
            author VARCHAR(100),
            user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            anonymous BOOLEAN DEFAULT FALSE,
            votes INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS answers (
            id SERIAL PRIMARY KEY,
            question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
            body TEXT NOT NULL,
            author VARCHAR(100),
            user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            votes INTEGER DEFAULT 0,
            helpful INTEGER DEFAULT 0,
            is_accepted BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS notifications (
            id SERIAL PRIMARY KEY,
            student_id VARCHAR(50) REFERENCES users(student_id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            message TEXT,
            link TEXT,
            type VARCHAR(50) DEFAULT 'general',
            reference_id INTEGER,
            scheduled_at TIMESTAMP,
            sent_at TIMESTAMP,
            read_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS points_history (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            points INTEGER NOT NULL,
            action_type VARCHAR(50),
            description TEXT,
            reference_id VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS conversations (
            id SERIAL PRIMARY KEY,
            a_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            b_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(a_user_id, b_user_id)
        );

        CREATE TABLE IF NOT EXISTS messages (
            id BIGSERIAL PRIMARY KEY,
            conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
            sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            body TEXT,
            attachment_url TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS message_reads (
            conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            last_read_message_id BIGINT DEFAULT 0,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (conversation_id, user_id)
        );

        CREATE TABLE IF NOT EXISTS meetings (
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
            participants INTEGER DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS meeting_participants (
            id SERIAL PRIMARY KEY,
            meeting_id VARCHAR(16) REFERENCES meetings(id) ON DELETE CASCADE,
            user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            session_id VARCHAR(255),
            display_name VARCHAR(100),
            joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            left_at TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS groups(
            id SERIAL PRIMARY KEY,
            section_name VARCHAR(255) UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS group_members (
            id SERIAL PRIMARY KEY,
            group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            status VARCHAR(20) DEFAULT 'pending',
            proof_url TEXT,
            joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS group_messages (
            id SERIAL PRIMARY KEY,
            group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            message TEXT,
            attachment_url TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS chat_history (
            id SERIAL PRIMARY KEY,
            user_message TEXT,
            bot_response TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS ai_file_checks (
            id SERIAL PRIMARY KEY,
            filename VARCHAR(255),
            mime VARCHAR(120),
            size_kb INTEGER,
            words INTEGER,
            chars INTEGER,
            tokens_est INTEGER,
            options_json JSONB,
            ip VARCHAR(64),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS tmp_courses (
            course_code VARCHAR(32) NOT NULL,
            course_title VARCHAR(255) NOT NULL,
            department VARCHAR(120) NOT NULL,
            program VARCHAR(120) NOT NULL,
            course_thumbnail TEXT
        );

        CREATE TABLE IF NOT EXISTS audit_logs (
            id SERIAL PRIMARY KEY,
            admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            action VARCHAR(255) NOT NULL,
            target_type VARCHAR(50),
            target_id VARCHAR(255),
            details TEXT,
            ip_address VARCHAR(64),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS platform_settings (
            key VARCHAR(100) PRIMARY KEY,
            value TEXT,
            type VARCHAR(20) DEFAULT 'string',
            description TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS question_votes (
            id SERIAL PRIMARY KEY,
            question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            vote_type INTEGER NOT NULL, -- 1 or -1
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(question_id, user_id)
        );

        CREATE TABLE IF NOT EXISTS answer_votes (
            id SERIAL PRIMARY KEY,
            answer_id INTEGER REFERENCES answers(id) ON DELETE CASCADE,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            vote_type INTEGER NOT NULL, -- 1 or -1
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(answer_id, user_id)
        );

        CREATE TABLE IF NOT EXISTS answer_helpful_votes (
            id SERIAL PRIMARY KEY,
            answer_id INTEGER REFERENCES answers(id) ON DELETE CASCADE,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(answer_id, user_id)
        );

        -- Initialize default settings if not exists
        INSERT INTO platform_settings (key, value, type, description) 
        VALUES ('maintenance_mode', 'false', 'boolean', 'Disable platform access for regular users')
        ON CONFLICT (key) DO NOTHING;

        INSERT INTO platform_settings (key, value, type, description) 
        VALUES ('allow_signups', 'true', 'boolean', 'Enable or disable new user registrations')
        ON CONFLICT (key) DO NOTHING;

        INSERT INTO platform_settings (key, value, type, description) 
        VALUES ('max_upload_size_mb', '50', 'number', 'Maximum file upload size in MB')
        ON CONFLICT (key) DO NOTHING;
    ");

    try {
        $pdo->exec('ALTER TABLE meetings ADD COLUMN IF NOT EXISTS creator_session_id VARCHAR(255)');
    } catch (Throwable $e) { }
    try {
        $pdo->exec('ALTER TABLE meeting_participants ALTER COLUMN session_id TYPE VARCHAR(255)');
    } catch (Throwable $e) { }
    try {
        $pdo->exec('ALTER TABLE users ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0');
    } catch (Throwable $e) { }
    try {
        $pdo->exec('ALTER TABLE meetings ALTER COLUMN course TYPE VARCHAR(255)');
    } catch (Throwable $e) { }
    try {
        $pdo->exec('ALTER TABLE points_history ALTER COLUMN reference_id TYPE VARCHAR(255)');
    } catch (Throwable $e) { }

} catch (Throwable $e) {
    if (!headers_sent()) {
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
        header("Access-Control-Allow-Origin: $origin");
        header("Access-Control-Allow-Credentials: true");
        header("Content-Type: application/json; charset=utf-8");
        http_response_code(500);
    }
    echo json_encode(['ok' => false, 'error' => 'DB connection or setup failed', 'detail' => $e->getMessage()]);
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
