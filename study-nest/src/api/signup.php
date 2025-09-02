<?php
require __DIR__ . '/db.php';

try {
    $data = json_decode(file_get_contents('php://input'), true);

    $studentId = trim($data['studentId'] ?? '');
    $email     = strtolower(trim($data['email'] ?? ''));
    $password  = $data['password'] ?? '';

    if ($studentId === '' || $email === '' || $password === '') {
        http_response_code(422);
        echo json_encode(['ok' => false, 'error' => 'Missing required fields.']);
        exit;
    }

    if (!preg_match('/@([a-z]+)\.uiu\.ac\.bd$/i', $email) && !preg_match('/@uiu\.ac\.bd$/i', $email)) {
        http_response_code(422);
        echo json_encode(['ok' => false, 'error' => 'Use your UIU email (…@dept.uiu.ac.bd).']);
        exit;
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(422);
        echo json_encode(['ok' => false, 'error' => 'Invalid email address.']);
        exit;
    }

    if (strlen($password) < 6) {
        http_response_code(422);
        echo json_encode(['ok' => false, 'error' => 'Password must be at least 6 characters.']);
        exit;
    }

    // Check uniqueness
    $check = $pdo->prepare("SELECT id FROM users WHERE email = ? OR student_id = ? LIMIT 1");
    $check->execute([$email, $studentId]);
    if ($check->fetch()) {
        http_response_code(409);
        echo json_encode(['ok' => false, 'error' => 'Email or Student ID already exists.']);
        exit;
    }

    $hash = password_hash($password, PASSWORD_BCRYPT);

    $ins = $pdo->prepare("INSERT INTO users (student_id, email, password_hash) VALUES (?, ?, ?)");
    $ins->execute([$studentId, $email, $hash]);

    echo json_encode(['ok' => true, 'message' => 'Account created successfully.']);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Server error.']);
}
