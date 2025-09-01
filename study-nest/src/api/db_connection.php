<?php
// --- db_connection.php ---

// Set headers to allow Cross-Origin Resource Sharing (CORS)
// Replace '*' with your frontend's domain in a production environment for security.
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

// The OPTIONS method is used for preflight requests by browsers to check CORS permissions.
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

// --- Database Configuration ---
// Replace these with your actual database credentials.
$DB_HOST = 'localhost';
$DB_USER = 'root';      // Your database username
$DB_PASSWORD = '';  // Your database password
$DB_NAME = 'studynest'; // Your database name

// --- Establish Database Connection ---
try {
    $conn = new mysqli($DB_HOST, $DB_USER, $DB_PASSWORD, $DB_NAME);
} catch (mysqli_sql_exception $e) {
    // If connection fails, send a server error response and stop execution.
    http_response_code(500); // Internal Server Error
    echo json_encode([
        'status' => 'error',
        'message' => 'Database connection failed. Please check your connection settings.'
    ]);
    exit(); // Stop the script
}

// The $conn variable can now be used by any script that includes this file.
