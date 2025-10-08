<?php
session_start();

/**
 * StudyNest QnAForum API
 * -----------------------
 * - Auto-creates users, questions, and answers tables if missing
 * - Handles CORS (localhost:5173)
 * - Returns pure JSON responses
 * - Fixes array-to-string and null session issues
 */

// ---------------- CORS & HEADERS ----------------
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json; charset=UTF-8");

// Handle preflight (CORS pre-check)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}

// ---------------- DEBUG SETTINGS (enable during dev only) ----------------
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// ---------------- DATABASE CONFIG ----------------
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "studynest";

$conn = new mysqli($servername, $username, $password, $dbname);
if ($conn->connect_error) {
  http_response_code(500);
  echo json_encode(["status" => "error", "message" => "DB connection failed: " . $conn->connect_error]);
  exit;
}

// ---------------- HELPERS ----------------
function send_response($status, $message, $data = []) {
  http_response_code($status === 'success' ? 200 : 500);
  $response = ["status" => $status, "message" => $message];
  if (!empty($data)) $response = array_merge($response, $data);
  echo json_encode($response);
  exit;
}

function bearerIsValid(): bool {
  if (empty($_SERVER['HTTP_AUTHORIZATION'])) return false;
  if (stripos($_SERVER['HTTP_AUTHORIZATION'], 'Bearer ') !== 0) return false;
  $token = substr($_SERVER['HTTP_AUTHORIZATION'], 7);
  // TODO: verify token properly (JWT or DB lookup)
  return !empty($token);
}

// ---------------- AUTO-CREATE TABLES ----------------

// Users table (safe even if already exists)
$create_users_table = "
CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(191) NOT NULL UNIQUE,
  student_id VARCHAR(32) NULL,
  email VARCHAR(191) NULL,
  bio TEXT NULL,
  profile_picture_url VARCHAR(255) NULL,
  password_hash VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
";
if (!$conn->query($create_users_table)) {
  send_response("error", "Error creating users table: " . $conn->error);
}

// Questions
$create_questions_table = "
CREATE TABLE IF NOT EXISTS questions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  tags VARCHAR(255),
  author VARCHAR(100) NOT NULL,
  user_id INT UNSIGNED NULL,
  anonymous TINYINT(1) NOT NULL DEFAULT 0,
  votes INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
";
if (!$conn->query($create_questions_table)) {
  send_response("error", "Error creating questions table: " . $conn->error);
}

// Answers
$create_answers_table = "
CREATE TABLE IF NOT EXISTS answers (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  question_id INT UNSIGNED NOT NULL,
  body TEXT NOT NULL,
  author VARCHAR(100) NOT NULL,
  user_id INT UNSIGNED NULL,
  votes INT DEFAULT 0,
  helpful INT DEFAULT 0,
  is_accepted TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
";
if (!$conn->query($create_answers_table)) {
  send_response("error", "Error creating answers table: " . $conn->error);
}

// ---------------- MAIN API LOGIC ----------------
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
  $questions = [];

  // Fetch all questions
  $result_q = $conn->query("
    SELECT q.*, u.username AS author_username
    FROM questions q
    LEFT JOIN users u ON q.user_id = u.id
    ORDER BY q.created_at DESC
  ");
  if ($result_q === false) {
    send_response("error", "Failed to query questions: " . $conn->error);
  }

  while ($row = $result_q->fetch_assoc()) {
    $row['tags'] = $row['tags'] ? explode(',', $row['tags']) : [];
    $row['anonymous'] = (bool)$row['anonymous'];
    $row['answers'] = [];
    $row['createdAt'] = $row['created_at'];
    unset($row['created_at']);
    if ($row['author_username'] && !$row['anonymous']) {
      $row['author'] = $row['author_username'];
    }
    unset($row['author_username']);
    $questions[$row['id']] = $row;
  }

  // Fetch all answers
  $result_a = $conn->query("
    SELECT a.*, u.username AS author_username
    FROM answers a
    LEFT JOIN users u ON a.user_id = u.id
    ORDER BY a.created_at ASC
  ");
  if ($result_a === false) {
    send_response("error", "Failed to query answers: " . $conn->error);
  }

  while ($row = $result_a->fetch_assoc()) {
    if (isset($questions[$row['question_id']])) {
      $row['isAccepted'] = (bool)$row['is_accepted'];
      $row['createdAt'] = $row['created_at'];
      unset($row['is_accepted'], $row['created_at']);
      if ($row['author_username']) $row['author'] = $row['author_username'];
      unset($row['author_username']);
      $questions[$row['question_id']]['answers'][] = $row;
    }
  }

  echo json_encode(array_values($questions));
  exit;
}

if ($method === 'POST') {
  // For local dev — automatically set a dummy session user
  if (empty($_SESSION['user_id'])) $_SESSION['user_id'] = 1;

  if (!isset($_SESSION['user_id']) && !bearerIsValid()) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'User not authenticated.']);
    exit;
  }

  $data = json_decode(file_get_contents('php://input'), true) ?? [];
  $action = $data['action'] ?? '';
  $logged_in_user_id = $_SESSION['user_id'] ?? null;

  switch ($action) {

    // ---------------- ADD QUESTION ----------------
    case 'add_question': {
      $title = trim($data['title'] ?? '');
      $body = trim($data['body'] ?? '');
      $tags = $data['tags'] ?? '';
      $anonymous = isset($data['anonymous']) ? (int)$data['anonymous'] : 0;
      $author = $anonymous ? 'Anonymous' : ($data['author'] ?? 'Anonymous');

      // Convert tags array → CSV
      if (is_array($tags)) $tags = implode(',', $tags);

      $stmt = $conn->prepare("
        INSERT INTO questions (title, body, tags, user_id, anonymous, author)
        VALUES (?, ?, ?, ?, ?, ?)
      ");
      if (!$stmt) send_response('error', 'Prepare failed: ' . $conn->error);

      $stmt->bind_param("sssiss", $title, $body, $tags, $logged_in_user_id, $anonymous, $author);
      if ($stmt->execute()) {
        send_response('success', 'Question added.', ['id' => $conn->insert_id]);
      } else {
        send_response('error', 'Failed to add question: ' . $stmt->error);
      }
      break;
    }

    // ---------------- ADD ANSWER ----------------
    case 'add_answer': {
      $author = $data['author'] ?? 'Anonymous';
      $qid = (int)($data['question_id'] ?? 0);
      $body = trim($data['body'] ?? '');
      $stmt = $conn->prepare("INSERT INTO answers (question_id, body, user_id, author) VALUES (?, ?, ?, ?)");
      $stmt->bind_param("isis", $qid, $body, $logged_in_user_id, $author);
      if ($stmt->execute()) {
        send_response('success', 'Answer added.');
      } else {
        send_response('error', 'Failed to add answer: ' . $stmt->error);
      }
      break;
    }

    // ---------------- VOTE QUESTION ----------------
    case 'vote_question': {
      $stmt = $conn->prepare("UPDATE questions SET votes = votes + ? WHERE id = ?");
      $stmt->bind_param("ii", $data['delta'], $data['id']);
      $ok = $stmt->execute();
      $ok ? send_response('success', 'Vote updated.') : send_response('error', 'Vote failed: ' . $stmt->error);
      break;
    }

    // ---------------- VOTE ANSWER ----------------
    case 'vote_answer': {
      $stmt = $conn->prepare("UPDATE answers SET votes = votes + ? WHERE id = ?");
      $stmt->bind_param("ii", $data['delta'], $data['id']);
      $ok = $stmt->execute();
      $ok ? send_response('success', 'Vote updated.') : send_response('error', 'Vote failed: ' . $stmt->error);
      break;
    }

    // ---------------- PEER REVIEW ----------------
    case 'peer_review': {
      $stmt = $conn->prepare("UPDATE answers SET helpful = helpful + 1 WHERE id = ?");
      $stmt->bind_param("i", $data['id']);
      $ok = $stmt->execute();
      $ok ? send_response('success', 'Marked as helpful.') : send_response('error', 'Failed to mark as helpful: ' . $stmt->error);
      break;
    }

    // ---------------- ACCEPT ANSWER ----------------
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
        send_response('success', 'Answer accepted.');
      } catch (mysqli_sql_exception $e) {
        $conn->rollback();
        send_response('error', 'Failed to accept answer: ' . $e->getMessage());
      }
      break;
    }

    default:
      send_response('error', 'Invalid action specified.');
  }
}

$conn->close();
?>
