<?php
// Set headers for CORS to allow cross-origin requests
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Your database credentials
$servername = "localhost";
$username = "root";
$password = ""; // Change this to your database password
$dbname = "studynest";

// Establish database connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Connection failed: " . $conn->connect_error]);
    exit();
}

// SQL to create the table if it doesn't exist (UPDATED with user_id)
$sql = "CREATE TABLE IF NOT EXISTS notes (
    id INT(11) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    course VARCHAR(255) NOT NULL,
    semester VARCHAR(255) NOT NULL,
    tags TEXT NOT NULL,
    description TEXT,
    file_url VARCHAR(255) NOT NULL,
    user_id INT(10) UNSIGNED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE RESTRICT
)";

if (!$conn->query($sql)) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Error creating table: " . $conn->error]);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        // Fetch all notes with user information
        $result = $conn->query("
            SELECT n.*, u.username, u.student_id, u.profile_picture_url 
            FROM notes n 
            LEFT JOIN users u ON n.user_id = u.id 
            ORDER BY n.created_at DESC
        ");
        if ($result) {
            if ($result->num_rows > 0) {
                $notes = [];
                while ($row = $result->fetch_assoc()) {
                    $notes[] = $row;
                }
                echo json_encode(["status" => "success", "notes" => $notes]);
            } else {
                echo json_encode(["status" => "error", "message" => "No notes found"]);
            }
        } else {
            echo json_encode(["status" => "error", "message" => "Query failed: " . $conn->error]);
        }
        break;

    case 'POST':
        // Check if the required POST fields are set
        if (!isset($_POST['title'], $_POST['course'], $_POST['semester'], $_POST['tags'], $_FILES['file'])) {
            http_response_code(400); // Bad Request
            echo json_encode(["status" => "error", "message" => "Missing required fields or file."]);
            exit();
        }

        // Handle file upload
        $file_url = null;
        if (isset($_FILES['file'])) {
            $file = $_FILES['file'];

            // Check for upload errors
            if ($file['error'] !== UPLOAD_ERR_OK) {
                http_response_code(500);
                echo json_encode(["status" => "error", "message" => "File upload error code: " . $file['error']]);
                exit();
            }

            // Define a safe upload directory inside your public web root
            $uploadDir = __DIR__ . '/../../../public/uploads/';
            $fileName = uniqid() . '-' . basename($file['name']);
            $uploadFile = $uploadDir . $fileName;

            // Ensure the uploads directory exists and is writable
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0775, true);
            }

            // Attempt to move the uploaded file
            if (move_uploaded_file($file['tmp_name'], $uploadFile)) {
                // Construct the publicly accessible URL
                $file_url = 'http://' . $_SERVER['HTTP_HOST'] . '/studynest/public/uploads/' . $fileName;
            } else {
                http_response_code(500);
                echo json_encode(["status" => "error", "message" => "Failed to move uploaded file."]);
                exit();
            }
        }

        // Assign variables from the $_POST array
        $title = $_POST['title'];
        $course = $_POST['course'];
        $semester = $_POST['semester'];
        $tags = $_POST['tags'];
        $description = isset($_POST['description']) ? $_POST['description'] : '';

        // Get user_id from request
        $user_id = isset($_POST['user_id']) ? intval($_POST['user_id']) : null;

        // Prepare SQL query to insert the note into the database (UPDATED with user_id)
        $stmt = $conn->prepare("INSERT INTO notes (title, course, semester, tags, description, file_url, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("ssssssi", $title, $course, $semester, $tags, $description, $file_url, $user_id);

        if ($stmt->execute()) {
            $note_id = $stmt->insert_id;

            // Award 20 points to the user if user_id is provided
            if ($user_id) {
                $points_awarded = 20;

                // Update user's points in the users table
                $update_points_sql = "UPDATE users SET points = COALESCE(points, 0) + ? WHERE id = ?";
                $update_stmt = $conn->prepare($update_points_sql);
                $update_stmt->bind_param("ii", $points_awarded, $user_id);

                if ($update_stmt->execute()) {
                    // Points updated successfully
                    $update_stmt->close();

                    echo json_encode([
                        "status" => "success",
                        "message" => "New note added successfully. +20 points awarded!",
                        "file_url" => $file_url,
                        "points_awarded" => $points_awarded
                    ]);
                } else {
                    // Note was saved but points update failed
                    $update_stmt->close();
                    echo json_encode([
                        "status" => "success",
                        "message" => "New note added successfully, but points could not be awarded.",
                        "file_url" => $file_url
                    ]);
                }
            } else {
                // No user_id provided, just save the note
                echo json_encode([
                    "status" => "success",
                    "message" => "New note added successfully.",
                    "file_url" => $file_url
                ]);
            }
        } else {
            http_response_code(500);
            echo json_encode(["status" => "error", "message" => "Database insertion failed: " . $stmt->error]);
        }
        $stmt->close();
        break;

    case 'PUT':
        // Update existing note
        $data = json_decode(file_get_contents("php://input"));
        $id = $data->id;
        unset($data->id);

        $updates = [];
        $params = [];
        $types = '';

        foreach ($data as $key => $value) {
            $updates[] = "$key = ?";
            $params[] = $value;
            $types .= is_int($value) ? 'i' : (is_string($value) ? 's' : 'd');
        }

        if (empty($updates)) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "No fields to update."]);
            exit();
        }

        $sql = "UPDATE notes SET " . implode(", ", $updates) . " WHERE id = ?";
        $params[] = $id;
        $types .= 'i';

        $stmt = $conn->prepare($sql);
        $stmt->bind_param($types, ...$params);

        if ($stmt->execute()) {
            echo json_encode(["status" => "success", "message" => "Note updated."]);
        } else {
            http_response_code(500);
            echo json_encode(["status" => "error", "message" => "Error: " . $stmt->error]);
        }
        $stmt->close();
        break;

    default:
        http_response_code(405);
        echo json_encode(["status" => "error", "message" => "Method not allowed"]);
        break;
}

$conn->close();
?>