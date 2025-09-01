<?php
// --- signup.php ---

// Include the database connection file.
// The `require` statement will cause a fatal error if the file is not found, which is good practice here.
require 'db_connection.php';

// Get the raw POST data from the request body.
$request_body = file_get_contents('php://input');
$data = json_decode($request_body);

// --- Input Validation ---
// Check if the required fields are present and not empty.
if (!isset($data->studentId) || !isset($data->email) || !isset($data->password) || empty(trim($data->studentId)) || empty(trim($data->email)) || empty(trim($data->password))) {
    http_response_code(400); // Bad Request
    echo json_encode(['status' => 'error', 'message' => 'Please fill in all required fields.']);
    exit();
}

// Sanitize and assign variables.
$studentId = mysqli_real_escape_string($conn, trim($data->studentId));
$email = mysqli_real_escape_string($conn, trim($data->email));
$password = trim($data->password);

// Validate email format.
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Invalid email address format.']);
    exit();
}

// Check if email or student ID already exists.
$check_sql = "SELECT * FROM users WHERE email = ? OR student_id = ?";
$check_stmt = $conn->prepare($check_sql);
$check_stmt->bind_param("ss", $email, $studentId);
$check_stmt->execute();
$result = $check_stmt->get_result();

if ($result->num_rows > 0) {
    http_response_code(409); // Conflict
    echo json_encode(['status' => 'error', 'message' => 'An account with this email or student ID already exists.']);
    $check_stmt->close();
    $conn->close();
    exit();
}
$check_stmt->close();

// --- Password Hashing ---
// It's crucial to hash passwords for security, never store them in plaintext.
$hashed_password = password_hash($password, PASSWORD_DEFAULT);

// --- Insert New User ---
$insert_sql = "INSERT INTO users (student_id, email, password) VALUES (?, ?, ?)";
$insert_stmt = $conn->prepare($insert_sql);
$insert_stmt->bind_param("sss", $studentId, $email, $hashed_password);

if ($insert_stmt->execute()) {
    http_response_code(201); // Created
    echo json_encode(['status' => 'success', 'message' => 'Account created successfully. You can now log in.']);
} else {
    http_response_code(500); // Internal Server Error
    echo json_encode(['status' => 'error', 'message' => 'An error occurred while creating your account. Please try again.']);
}

// Close the statement and the connection.
$insert_stmt->close();
$conn->close();
