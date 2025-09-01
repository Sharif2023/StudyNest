<?php
// --- login.php ---

// Include the database connection file.
require 'db_connection.php';

// Get the raw POST data from the request.
$request_body = file_get_contents('php://input');
$data = json_decode($request_body);

// --- Input Validation ---
// Check if email and password are provided.
if (!isset($data->email) || !isset($data->password) || empty(trim($data->email)) || empty(trim($data->password))) {
    http_response_code(400); // Bad Request
    echo json_encode(['status' => 'error', 'message' => 'Please enter your email and password.']);
    exit();
}

// Sanitize and assign variables.
$email = mysqli_real_escape_string($conn, trim($data->email));
$password = trim($data->password);

// --- Fetch User and Verify Password ---
// Prepare a statement to prevent SQL injection.
$sql = "SELECT * FROM users WHERE email = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("s", $email);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 1) {
    $user = $result->fetch_assoc();

    // Verify the submitted password against the hashed password from the database.
    if (password_verify($password, $user['password'])) {
        // Password is correct.
        http_response_code(200); // OK
        echo json_encode([
            'status' => 'success',
            'message' => 'Login successful.',
            // In a real application, you would generate a session token or JWT here.
            'user' => [
                'id' => $user['id'],
                'student_id' => $user['student_id'],
                'email' => $user['email']
            ]
        ]);
    } else {
        // Incorrect password.
        http_response_code(401); // Unauthorized
        echo json_encode(['status' => 'error', 'message' => 'Invalid email or password.']);
    }
} else {
    // User not found.
    http_response_code(401); // Unauthorized
    echo json_encode(['status' => 'error', 'message' => 'Invalid email or password.']);
}

// Close the statement and the connection.
$stmt->close();
$conn->close();
