<?php
// Set headers for CORS and JSON content type
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// --- Database Configuration ---
$servername = "localhost";
$username = "root";
$password = ""; // Your database password
$dbname = "studynest"; // Your database name

// Establish database connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Connection failed: " . $conn->connect_error]);
    exit();
}

// --- Helper function to send JSON responses ---
function send_response($status, $message, $data = []) {
    http_response_code($status === 'success' ? 200 : 500);
    $response = ["status" => $status, "message" => $message];
    if (!empty($data)) {
        $response = array_merge($response, $data);
    }
    echo json_encode($response);
    exit();
}

// --- Auto-create tables if they don't exist ---
$create_questions_table = "CREATE TABLE IF NOT EXISTS questions (
    id INT(11) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    tags VARCHAR(255),
    author VARCHAR(100) NOT NULL,
    anonymous TINYINT(1) NOT NULL DEFAULT 0,
    votes INT(11) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)";

$create_answers_table = "CREATE TABLE IF NOT EXISTS answers (
    id INT(11) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    question_id INT(11) UNSIGNED NOT NULL,
    body TEXT NOT NULL,
    author VARCHAR(100) NOT NULL,
    votes INT(11) NOT NULL DEFAULT 0,
    helpful INT(11) NOT NULL DEFAULT 0,
    is_accepted TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
)";

if (!$conn->query($create_questions_table) || !$conn->query($create_answers_table)) {
    send_response("error", "Error creating tables: " . $conn->error);
}

// --- Main API Logic ---
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $questions = [];
    
    // 1. Fetch questions, newest first
    $result_q = $conn->query("SELECT * FROM questions ORDER BY created_at DESC");
    if ($result_q === false) {
        send_response("error", "Failed to query questions table: " . $conn->error);
    }

    while ($row = $result_q->fetch_assoc()) {
        $row['tags'] = $row['tags'] ? explode(',', $row['tags']) : [];
        $row['anonymous'] = (bool)$row['anonymous'];
        $row['answers'] = [];
        $row['createdAt'] = $row['created_at']; // Map to camelCase
        unset($row['created_at']);
        $questions[$row['id']] = $row;
    }

    // 2. Fetch all answers
    $result_a = $conn->query("SELECT * FROM answers ORDER BY created_at ASC");
    if ($result_a === false) {
        send_response("error", "Failed to query answers table: " . $conn->error);
    }
    
    while ($row = $result_a->fetch_assoc()) {
        if (isset($questions[$row['question_id']])) {
            $row['isAccepted'] = (bool)$row['is_accepted']; // Map to camelCase
            $row['createdAt'] = $row['created_at'];     // Map to camelCase
            unset($row['is_accepted']);
            unset($row['created_at']);
            $questions[$row['question_id']]['answers'][] = $row;
        }
    }

    echo json_encode(array_values($questions));

} elseif ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $action = $data['action'] ?? '';

    switch ($action) {
        case 'add_question':
            $stmt = $conn->prepare("INSERT INTO questions (title, body, tags, author, anonymous) VALUES (?, ?, ?, ?, ?)");
            $stmt->bind_param("ssssi", $data['title'], $data['body'], $data['tags'], $data['author'], $data['anonymous']);
            if ($stmt->execute()) {
                send_response("success", "Question added.", ["id" => $conn->insert_id]);
            } else {
                send_response("error", "Failed to add question: " . $stmt->error);
            }
            break;

        case 'vote_question':
            $stmt = $conn->prepare("UPDATE questions SET votes = votes + ? WHERE id = ?");
            $stmt->bind_param("ii", $data['delta'], $data['id']);
            $stmt->execute() ? send_response("success", "Vote updated.") : send_response("error", "Vote failed: " . $stmt->error);
            break;

        case 'add_answer':
            $stmt = $conn->prepare("INSERT INTO answers (question_id, body, author) VALUES (?, ?, ?)");
            $stmt->bind_param("iss", $data['question_id'], $data['body'], $data['author']);
            $stmt->execute() ? send_response("success", "Answer added.") : send_response("error", "Failed to add answer: " . $stmt->error);
            break;

        case 'vote_answer':
            $stmt = $conn->prepare("UPDATE answers SET votes = votes + ? WHERE id = ?");
            $stmt->bind_param("ii", $data['delta'], $data['id']);
            $stmt->execute() ? send_response("success", "Vote updated.") : send_response("error", "Vote failed: " . $stmt->error);
            break;

        case 'peer_review':
            $stmt = $conn->prepare("UPDATE answers SET helpful = helpful + 1 WHERE id = ?");
            $stmt->bind_param("i", $data['id']);
            $stmt->execute() ? send_response("success", "Marked as helpful.") : send_response("error", "Failed to mark as helpful: " . $stmt->error);
            break;

        case 'accept_answer':
            $conn->begin_transaction();
            try {
                $stmt1 = $conn->prepare("UPDATE answers SET is_accepted = 0 WHERE question_id = ?");
                $stmt1->bind_param("i", $data['question_id']);
                $stmt1->execute();

                $stmt2 = $conn->prepare("UPDATE answers SET is_accepted = 1 WHERE id = ?");
                $stmt2->bind_param("i", $data['answer_id']);
                $stmt2->execute();

                $conn->commit();
                send_response("success", "Answer accepted.");
            } catch (mysqli_sql_exception $exception) {
                $conn->rollback();
                send_response("error", "Failed to accept answer: " . $exception->getMessage());
            }
            break;

        default:
            send_response("error", "Invalid action specified.");
            break;
    }
}

$conn->close();
?>