<?php
// profile.php

include 'db.php';  // Include database connection

session_start();

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type");


// Check if user is logged in
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);  // Unauthorized request
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$user_id = $_SESSION['user_id']; // Get the logged-in user's ID

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Fetch user's profile data
    $stmt = $conn->prepare("SELECT id, name, email, bio, avatar FROM users WHERE id = ?");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $profile = $result->fetch_assoc();
    
    if ($profile) {
        echo json_encode($profile);  // Return profile as JSON
    } else {
        http_response_code(404);
        echo json_encode(['error' => 'Profile not found']);
    }

    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Update user's profile data
    $data = json_decode(file_get_contents("php://input"), true);

    // Check if the necessary fields are present
    $name = $data['name'] ?? '';
    $email = $data['email'] ?? '';
    $bio = $data['bio'] ?? '';
    $avatar = $data['avatar'] ?? '';  // Optional field: avatar (can be a URL or base64 encoded)

    if (empty($name) || empty($email)) {
        http_response_code(400);  // Bad request
        echo json_encode(['error' => 'Name and email are required']);
        exit;
    }

    // Update user information in the database
    $stmt = $conn->prepare("UPDATE users SET name=?, email=?, bio=?, avatar=? WHERE id=?");
    $stmt->bind_param("ssssi", $name, $email, $bio, $avatar, $user_id);
    
    if ($stmt->execute()) {
        echo json_encode(['success' => true]);
    } else {
        http_response_code(500);  // Internal server error
        echo json_encode(['error' => 'Failed to update profile']);
    }

    exit;
}
