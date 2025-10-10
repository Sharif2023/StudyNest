<?php
session_start();

header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

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

function send_response($status, $message, $data = [])
{
  http_response_code($status === 'success' ? 200 : 500);
  $response = ["status" => $status, "message" => $message];
  if (!empty($data)) $response = array_merge($response, $data);
  echo json_encode($response);
  exit;
}

function bearerIsValid(): bool
{
  if (empty($_SERVER['HTTP_AUTHORIZATION'])) return false;
  if (stripos($_SERVER['HTTP_AUTHORIZATION'], 'Bearer ') !== 0) return false;
  $token = substr($_SERVER['HTTP_AUTHORIZATION'], 7);
  return !empty($token);
}

/* ==========================================================
   🧱 AUTO-CREATE TABLES
   ========================================================== */
$create_users_table = "
CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(191) NOT NULL UNIQUE,
  student_id VARCHAR(32) NOT NULL UNIQUE,
  email VARCHAR(191) NOT NULL UNIQUE,
  bio TEXT NULL,
  profile_picture_url VARCHAR(255) NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
";
$conn->query($create_users_table);

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
$conn->query($create_questions_table);

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
$conn->query($create_answers_table);

/* 🆕 Notifications table (updated schema to match todo + reminders) */
$create_notifications_table = "
CREATE TABLE IF NOT EXISTS notifications (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  student_id VARCHAR(32) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  link VARCHAR(255) NULL,
  type VARCHAR(64) DEFAULT 'general',
  reference_id INT NULL,
  scheduled_at DATETIME NULL,
  sent_at DATETIME NULL,
  read_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_student (student_id),
  FOREIGN KEY (student_id) REFERENCES users(student_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
";
$conn->query($create_notifications_table);

/* ==========================================================
   MAIN LOGIC
   ========================================================== */
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
  $questions = [];
  $result_q = $conn->query("
    SELECT q.*, u.username AS author_username,
           (SELECT COUNT(*) FROM answers a WHERE a.question_id = q.id) as answer_count
    FROM questions q
    LEFT JOIN users u ON q.user_id = u.id
    ORDER BY q.created_at DESC
    LIMIT 10
  ");
  if ($result_q === false) send_response("error", "Failed to query questions: " . $conn->error);

  while ($row = $result_q->fetch_assoc()) {
    $row['tags'] = $row['tags'] ? explode(',', $row['tags']) : [];
    $row['anonymous'] = (bool)$row['anonymous'];
    $row['answers'] = [];
    $row['createdAt'] = $row['created_at'];
    unset($row['created_at']);
    if ($row['author_username'] && !$row['anonymous']) $row['author'] = $row['author_username'];
    unset($row['author_username']);
    $questions[$row['id']] = $row;
  }

  $result_a = $conn->query("
    SELECT a.*, u.username AS author_username
    FROM answers a
    LEFT JOIN users u ON a.user_id = u.id
    ORDER BY a.created_at ASC
  ");
  if ($result_a === false) send_response("error", "Failed to query answers: " . $conn->error);

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

    case 'add_question': {
        $title = trim($data['title'] ?? '');
        $body = trim($data['body'] ?? '');
        $tags = $data['tags'] ?? '';
        if (is_array($tags)) $tags = implode(',', $tags);
        $anonymous = isset($data['anonymous']) ? (int)$data['anonymous'] : 0;
        $author = $anonymous ? 'Anonymous' : ($data['author'] ?? 'Anonymous');
        $stmt = $conn->prepare("INSERT INTO questions (title, body, tags, user_id, anonymous, author)
                              VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("sssiss", $title, $body, $tags, $logged_in_user_id, $anonymous, $author);
        $stmt->execute() ? send_response('success', 'Question added.', ['id' => $conn->insert_id])
          : send_response('error', 'Failed to add question: ' . $stmt->error);
        break;
      }

      /* ==========================================================
       🆕 ADD ANSWER + CREATE NOTIFICATION
       ========================================================== */
    case 'add_answer': {
        $author = $data['author'] ?? 'Anonymous';
        $qid = (int)($data['question_id'] ?? 0);
        $body = trim($data['body'] ?? '');

        $stmt = $conn->prepare("INSERT INTO answers (question_id, body, user_id, author)
                          VALUES (?, ?, ?, ?)");
        $stmt->bind_param("isis", $qid, $body, $logged_in_user_id, $author);

        if ($stmt->execute()) {
          /* 🆕 Create notification for question owner */
          $qres = $conn->prepare("
      SELECT q.title AS q_title, u.student_id AS target_sid, u.username AS q_author
      FROM questions q
      LEFT JOIN users u ON q.user_id = u.id
      WHERE q.id=?
    ");
          $qres->bind_param("i", $qid);
          $qres->execute();
          $meta = $qres->get_result()->fetch_assoc();
          if (!empty($meta['target_sid'])) {
            $n_title = "💬 New answer to your question";
            $n_message = "{$author} replied to: \"{$meta['q_title']}\"";
            $n_link = "/forum"; // Fixed link path
            $nstmt = $conn->prepare("INSERT INTO notifications (student_id, title, message, link, type, reference_id)
                               VALUES (?, ?, ?, ?, 'forum_answer', ?)");
            $nstmt->bind_param("ssssi", $meta['target_sid'], $n_title, $n_message, $n_link, $qid);
            $nstmt->execute();
          }

          send_response('success', 'Answer added.');
        } else {
          send_response('error', 'Failed to add answer: ' . $stmt->error);
        }
        break;
      }

    case 'vote_question': {
        $stmt = $conn->prepare("UPDATE questions SET votes = votes + ? WHERE id = ?");
        $stmt->bind_param("ii", $data['delta'], $data['id']);
        $stmt->execute() ? send_response('success', 'Vote updated.')
          : send_response('error', 'Vote failed: ' . $stmt->error);
        break;
      }

    case 'vote_answer': {
        $stmt = $conn->prepare("UPDATE answers SET votes = votes + ? WHERE id = ?");
        $stmt->bind_param("ii", $data['delta'], $data['id']);
        $stmt->execute() ? send_response('success', 'Vote updated.')
          : send_response('error', 'Vote failed: ' . $stmt->error);
        break;
      }

    case 'peer_review': {
        $stmt = $conn->prepare("UPDATE answers SET helpful = helpful + 1 WHERE id = ?");
        $stmt->bind_param("i", $data['id']);
        $stmt->execute() ? send_response('success', 'Marked as helpful.')
          : send_response('error', 'Failed to mark helpful: ' . $stmt->error);
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
