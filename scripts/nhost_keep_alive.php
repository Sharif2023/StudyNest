<?php
/**
 * Nhost PostgreSQL Keep-Alive Script
 * 
 * This script connects to the PostgreSQL database, creates a temporary keep-alive
 * table if it doesn't exist, and performs an atomic insert-verify-delete-verify
 * transaction. This ensures the database registers activity without accumulating
 * permanent records or risking application data.
 */

function log_message($level, $message, $context = []) {
    $timestamp = date('c');
    $contextStr = empty($context) ? '' : ' ' . json_encode($context);
    echo "[$timestamp] [$level] $message$contextStr\n";
}

$host = getenv('DB_HOST');
$port = getenv('DB_PORT') ?: '5432';
$dbname = getenv('DB_NAME');
$user = getenv('DB_USER');
$pass = getenv('DB_PASS');

if (!$host || !$dbname || !$user || !$pass) {
    log_message('ERROR', 'Missing required database environment variables (DB_HOST, DB_NAME, DB_USER, DB_PASS).');
    exit(1);
}

try {
    $dsn = "pgsql:host=$host;port=$port;dbname=$dbname";
    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_TIMEOUT => 15,
    ]);
    log_message('INFO', 'Successfully connected to PostgreSQL.');
} catch (PDOException $e) {
    log_message('ERROR', 'Database connection failed', ['error' => $e->getMessage()]);
    exit(1);
}

try {
    // 1. Ensure the dedicated keep-alive table exists.
    // This table is completely isolated from StudyNest application data.
    $pdo->exec("CREATE TABLE IF NOT EXISTS system_keep_alive (
        execution_id UUID PRIMARY KEY,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");
    log_message('INFO', 'Keep-alive table verified.');

    // 2. Generate a unique execution identifier (UUID v4 approximation)
    $execution_id = sprintf(
        '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
    
    // We use a transaction so the insert and delete are executed on the same connection
    // safely, preventing any orphaned records if the script terminates unexpectedly mid-execution.
    $pdo->beginTransaction();
    log_message('INFO', 'Transaction started.');

    // 3. Insert temporary record
    $stmt = $pdo->prepare("INSERT INTO system_keep_alive (execution_id) VALUES (?)");
    $stmt->execute([$execution_id]);
    
    // 4. Verify insertion succeeded
    $verifyStmt = $pdo->prepare("SELECT COUNT(*) FROM system_keep_alive WHERE execution_id = ?");
    $verifyStmt->execute([$execution_id]);
    $count = $verifyStmt->fetchColumn();
    
    if ($count != 1) {
        $pdo->rollBack();
        throw new Exception("Verification failed: Record with execution_id $execution_id was not found after insertion.");
    }
    log_message('INFO', 'Record inserted and verified successfully.', ['execution_id' => $execution_id]);

    // 5. Delete only the temporary record associated with this execution
    $delStmt = $pdo->prepare("DELETE FROM system_keep_alive WHERE execution_id = ?");
    $delStmt->execute([$execution_id]);
    
    // 6. Verify removal succeeded
    $verifyStmt->execute([$execution_id]);
    $countAfter = $verifyStmt->fetchColumn();
    
    if ($countAfter != 0) {
        $pdo->rollBack();
        throw new Exception("Verification failed: Record with execution_id $execution_id still exists after deletion.");
    }
    
    $pdo->commit();
    log_message('INFO', 'Record deleted and verified successfully.', ['execution_id' => $execution_id]);
    
    // Optional: Clean up any old orphaned records just in case a previous non-transactional run failed.
    // This prevents accumulating unnecessary records over time.
    $cleanupStmt = $pdo->prepare("DELETE FROM system_keep_alive WHERE created_at < NOW() - INTERVAL '1 hour'");
    $cleanupStmt->execute();
    $cleanupCount = $cleanupStmt->rowCount();
    if ($cleanupCount > 0) {
        log_message('INFO', "Cleaned up $cleanupCount orphaned keep-alive records.");
    }

    log_message('SUCCESS', 'Keep-alive workflow completed successfully.');
    exit(0);

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    log_message('ERROR', 'Keep-alive workflow failed', ['error' => $e->getMessage()]);
    exit(1);
}
