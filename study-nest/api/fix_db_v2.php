<?php
// fix_db_v2.php
require_once __DIR__ . '/db.php';

try {
    // 1. Fix ai_file_checks
    $pdo->exec("ALTER TABLE ai_file_checks ADD COLUMN IF NOT EXISTS words INTEGER DEFAULT 0");
    $pdo->exec("ALTER TABLE ai_file_checks ADD COLUMN IF NOT EXISTS chars INTEGER DEFAULT 0");
    $pdo->exec("ALTER TABLE ai_file_checks ADD COLUMN IF NOT EXISTS tokens_est INTEGER DEFAULT 0");
    $pdo->exec("ALTER TABLE ai_file_checks ADD COLUMN IF NOT EXISTS options_json JSONB DEFAULT '{}'");
    $pdo->exec("ALTER TABLE ai_file_checks ADD COLUMN IF NOT EXISTS ip VARCHAR(64)");
    
    // 2. Ensure academic_terms has modern columns if missing in db.php but needed
    // (They were 'extra' in the audit because I added them to my 'ideal' in db_check_v2.php)
    // Wait, the audit showed them as 'extra' compared to my ideal, which was based on db.php.
    // If they are extra, it's fine.
    
    // 3. Robust defaults for some other tables
    $pdo->exec("ALTER TABLE resources ALTER COLUMN votes SET DEFAULT 0");
    $pdo->exec("ALTER TABLE resources ALTER COLUMN bookmarks SET DEFAULT 0");
    
    // 4. Cleanup old diagnostic scripts if possible (from within PHP)
    @unlink(__DIR__ . '/api_audit.php');
    @unlink(__DIR__ . '/db_check_v2.php');
    @unlink(__DIR__ . '/fix_db.php');

    echo json_encode(["ok" => true, "message" => "Database schema (v2) updated successfully."]);
} catch (Throwable $e) {
    echo json_encode(["ok" => false, "error" => $e->getMessage()]);
}
