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

// SQL to create the table if it doesn't exist
$sql = "CREATE TABLE IF NOT EXISTS resources (
    id INT(6) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    kind VARCHAR(50) NOT NULL,
    course VARCHAR(50) NOT NULL,
    semester VARCHAR(50) NOT NULL,
    tags TEXT,
    description TEXT,
    author VARCHAR(100) NOT NULL,
    votes INT(11) DEFAULT 0,
    bookmarks INT(11) DEFAULT 0,
    flagged TINYINT(1) DEFAULT 0,
    src_type VARCHAR(20) NOT NULL,
    url VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)";

if (!$conn->query($sql)) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Error creating table: " . $conn->error]);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        $result = $conn->query("SELECT * FROM resources");
        $resources = [];
        while ($row = $result->fetch_assoc()) {
            $resources[] = $row;
        }
        echo json_encode(["status" => "success", "resources" => $resources]);
        break;

    case 'POST':
        $data = json_decode(file_get_contents("php://input"));

        // Using prepared statements to prevent SQL injection
        $stmt = $conn->prepare("INSERT INTO resources (title, kind, course, semester, tags, description, author, src_type, url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("sssssssss", $data->title, $data->kind, $data->course, $data->semester, $data->tags, $data->description, $data->author, $data->src_type, $data->url);

        if ($stmt->execute()) {
            echo json_encode(["status" => "success", "message" => "New resource added."]);
        } else {
            http_response_code(500);
            echo json_encode(["status" => "error", "message" => "Error: " . $stmt->error]);
        }
        $stmt->close();
        break;

    case 'PUT':
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

        $sql = "UPDATE resources SET " . implode(", ", $updates) . " WHERE id = ?";
        $params[] = $id;
        $types .= 'i';

        $stmt = $conn->prepare($sql);
        $stmt->bind_param($types, ...$params);

        if ($stmt->execute()) {
            echo json_encode(["status" => "success", "message" => "Resource updated."]);
        } else {
            http_response_code(500);
            echo json_encode(["status" => "error", "message" => "Error: " . $stmt->error]);
        }
        $stmt->close();
        break;
}

$conn->close();
?>
