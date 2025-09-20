<?php
// CORS for local dev (adjust origin if needed)
function allow_cors()
{
    $origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '*';
    header("Access-Control-Allow-Origin: $origin");
    header("Access-Control-Allow-Credentials: true");
    header("Access-Control-Allow-Headers: Content-Type, Authorization");
    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
    header("Content-Type: application/json; charset=utf-8");
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}
allow_cors();

// DB config (XAMPP defaults: user=root, password=empty)
$host = 'localhost';
$db_name = 'studynest';
$user = 'root';
$pass = '';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
];

try {
    // Connect without specifying a database to create the database if it doesn't exist
    $pdo = new PDO($dsn, $user, $pass, $options);

    // Create database if it does not exist
    $pdo->exec("CREATE DATABASE IF NOT EXISTS `$db_name` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;");

    // Re-connect with the database selected
    $dsn = "mysql:host=$host;dbname=$db_name;charset=$charset";
    $pdo = new PDO($dsn, $user, $pass, $options);

    // Create users table if it does not exist
    $pdo->exec("
CREATE TABLE IF NOT EXISTS users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(191) NOT NULL UNIQUE,
    student_id VARCHAR(32) NOT NULL UNIQUE,
    email VARCHAR(191) NOT NULL UNIQUE,
    bio TEXT NULL,
    profile_picture_url VARCHAR(255) NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
");
    // Ensure new columns exist if table already created
    $pdo->exec("ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT NULL AFTER email;");
    $pdo->exec("ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture_url VARCHAR(255) NULL AFTER bio;");

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'DB connection or setup failed: ' . $e->getMessage()]);
    exit;
}