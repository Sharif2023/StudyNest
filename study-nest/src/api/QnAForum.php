<?php
// Set headers for CORS and JSON content type
session_start();

// CORS for your dev origin (must NOT be "*")
$origin = 'http://localhost:5173';
header("Access-Control-Allow-Origin: $origin");
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}

// Example auth gate: allow either a valid session or a Bearer token
function bearerIsValid(): bool {
  if (empty($_SERVER['HTTP_AUTHORIZATION'])) return false;
  if (stripos($_SERVER['HTTP_AUTHORIZATION'], 'Bearer ') !== 0) return false;
  $token = substr($_SERVER['HTTP_AUTHORIZATION'], 7);
  // TODO: verify token
  return !empty($token);
}

// --- Database Configuration ---
$servername = "localhost";
$username = "root";
$password = "";        // Your database password
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
function send_response($status, $message, $data = [])
{
  http_response_code($status === 'success' ? 200 : 500);
  $response = ["status" => $status, "message" => $message];
  if (!empty($data)) $response = array_merge($response, $data);
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
  user_id INT UNSIGNED,
  anonymous TINYINT(1) NOT NULL DEFAULT 0,
  votes INT(11) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
)";

$create_answers_table = "CREATE TABLE IF NOT EXISTS answers (
  id INT(11) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  question_id INT(11) UNSIGNED NOT NULL,
  body TEXT NOT NULL,
  author VARCHAR(100) NOT NULL,
  user_id INT UNSIGNED,
  votes INT(11) NOT NULL DEFAULT 0,
  helpful INT(11) NOT NULL DEFAULT 0,
  is_accepted TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
)";

if (!$conn->query($create_questions_table) || !$conn->query($create_answers_table)) {
  send_response("error", "Error creating tables: " . $conn->error);
}

// --- Main API Logic ---
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
  $questions = [];

  // 1) Questions (join username)
  $result_q = $conn->query("
    SELECT q.*, u.username as author_username 
    FROM questions q
    LEFT JOIN users u ON q.user_id = u.id
    ORDER BY q.created_at DESC
  ");
  if ($result_q === false) {
    send_response("error", "Failed to query questions table: " . $conn->error);
  }

  while ($row = $result_q->fetch_assoc()) {
    $row['tags'] = $row['tags'] ? explode(',', $row['tags']) : [];
    $row['anonymous'] = (bool)$row['anonymous'];
    $row['answers'] = [];
    $row['createdAt'] = $row['created_at'];
    unset($row['created_at']);

    // prefer username if available and not anonymous
    if ($row['author_username'] !== null && !$row['anonymous']) {
      $row['author'] = $row['author_username'];
    }
    unset($row['author_username']);

    $questions[$row['id']] = $row;
  }

  // 2) Answers (join username)
  $result_a = $conn->query("
    SELECT a.*, u.username as author_username
    FROM answers a
    LEFT JOIN users u ON a.user_id = u.id
    ORDER BY a.created_at ASC
  ");
  if ($result_a === false) {
    send_response("error", "Failed to query answers table: " . $conn->error);
  }

  while ($row = $result_a->fetch_assoc()) {
    if (isset($questions[$row['question_id']])) {
      $row['isAccepted'] = (bool)$row['is_accepted'];
      $row['createdAt'] = $row['created_at'];
      unset($row['is_accepted'], $row['created_at']);

      if ($row['author_username'] !== null) {
        $row['author'] = $row['author_username'];
      }
      unset($row['author_username']);

      $questions[$row['question_id']]['answers'][] = $row;
    }
  }

  echo json_encode(array_values($questions));
  exit;
}

if ($method === 'POST') {
  // Global auth gate for mutating actions (POST)
  if (!isset($_SESSION['user_id']) && !bearerIsValid()) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'User not authenticated.']);
    exit;
  }

  $data = json_decode(file_get_contents('php://input'), true) ?? [];
  $action = $data['action'] ?? '';
  $logged_in_user_id = $_SESSION['user_id'] ?? null;

  switch ($action) {
    case 'add_question': {
      // Ensure we supply the NOT NULL author column
      $author = !empty($data['anonymous']) ? 'Anonymous' : ($data['author'] ?? 'Anonymous');
      $stmt = $conn->prepare("INSERT INTO questions (title, body, tags, user_id, anonymous, author) VALUES (?, ?, ?, ?, ?, ?)");
      $stmt->bind_param("sssiss", $data['title'], $data['body'], $data['tags'], $logged_in_user_id, $data['anonymous'], $author);
      if ($stmt->execute()) {
        send_response("success", "Question added.", ["id" => $conn->insert_id]);
      } else {
        send_response("error", "Failed to add question: " . $stmt->error);
      }
      break;
    }

    case 'vote_question': {
      $stmt = $conn->prepare("UPDATE questions SET votes = votes + ? WHERE id = ?");
      $stmt->bind_param("ii", $data['delta'], $data['id']);
      $ok = $stmt->execute();
      $ok ? send_response("success", "Vote updated.") : send_response("error", "Vote failed: " . $stmt->error);
      break;
    }

    case 'add_answer': {
      // Ensure we supply the NOT NULL author column
      $author = $data['author'] ?? 'Anonymous';
      $stmt = $conn->prepare("INSERT INTO answers (question_id, body, user_id, author) VALUES (?, ?, ?, ?)");
      $stmt->bind_param("isis", $data['question_id'], $data['body'], $logged_in_user_id, $author);
      $ok = $stmt->execute();
      $ok ? send_response("success", "Answer added.") : send_response("error", "Failed to add answer: " . $stmt->error);
      break;
    }

    case 'vote_answer': {
      $stmt = $conn->prepare("UPDATE answers SET votes = votes + ? WHERE id = ?");
      $stmt->bind_param("ii", $data['delta'], $data['id']);
      $ok = $stmt->execute();
      $ok ? send_response("success", "Vote updated.") : send_response("error", "Vote failed: " . $stmt->error);
      break;
    }

    case 'peer_review': {
      $stmt = $conn->prepare("UPDATE answers SET helpful = helpful + 1 WHERE id = ?");
      $stmt->bind_param("i", $data['id']);
      $ok = $stmt->execute();
      $ok ? send_response("success", "Marked as helpful.") : send_response("error", "Failed to mark as helpful: " . $stmt->error);
      break;
    }

    case 'accept_answer': {
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
      } catch (mysqli_sql_exception $e) {
        $conn->rollback();
        send_response("error", "Failed to accept answer: " . $e->getMessage());
      }
      break;
    }

    default:
      send_response("error", "Invalid action specified.");
  }
}

$conn->close();
