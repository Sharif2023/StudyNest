<?php
// QnAForum.php

require_once __DIR__ . '/db.php'; // Provides $pdo, CORS headers, and session_start()

function send_response($status, $message, $data = [])
{
    http_response_code(200); 
    $response = ["status" => $status, "message" => $message, "ok" => ($status === 'success')];
    if (!empty($data))
        $response = array_merge($response, $data);
    echo json_encode($response);
    exit;
}

function send_sql_error($pdo, $message) {
    $err = $pdo->errorInfo();
    send_response('error', $message . " (SQL: " . ($err[2] ?? 'unknown') . ")");
}

// Centralized awardPoints is provided by db.php

function getUserPoints($pdo, $user_id)
{
    $stmt = $pdo->prepare("SELECT points FROM users WHERE id = ?");
    $stmt->execute([$user_id]);
    return $stmt->fetchColumn() ?: 0;
}

/* ==========================================================
   MAIN LOGIC
   ========================================================== */
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
  require_once __DIR__ . '/auth.php';
  // Allow unauthenticated access, but get ID if logged in for vote/helpful tracking
  $logged_in_user_id = StudyNestAuth::validate(['user'], false);

  // 1. Fetch Questions
  $stmt_q = $pdo->prepare("
    SELECT q.*, u.username AS author_username,
           (SELECT COUNT(*) FROM answers WHERE question_id = q.id) as answer_count,
           (SELECT vote_type FROM question_votes WHERE question_id = q.id AND user_id = ?) as user_vote
    FROM questions q
    LEFT JOIN users u ON q.user_id = u.id
    ORDER BY q.created_at DESC
    LIMIT 50
  ");
  $stmt_q->execute([$logged_in_user_id]);
  
  $questions = [];
  while ($row = $stmt_q->fetch(PDO::FETCH_ASSOC)) {
    // Formatting
    $row['tags'] = $row['tags'] ? explode(',', $row['tags']) : [];
    $row['anonymous'] = (bool)$row['anonymous'];
    $row['user_vote'] = (int)($row['user_vote'] ?? 0);
    $row['answer_count'] = (int)($row['answer_count'] ?? 0);
    
    // UI compatibility fields
    if ($row['author_username'] && !$row['anonymous']) {
      $row['author'] = $row['author_username'];
    }
    unset($row['author_username']);
    
    $row['id'] = (int)$row['id'];
    $row['user_id'] = (int)$row['user_id'];
    
    $questions[$row['id']] = $row;
    $questions[$row['id']]['answers'] = [];
  }

  // 2. Fetch Answers for these questions
  if (!empty($questions)) {
    $qids = array_keys($questions);
    $placeholders = implode(',', array_fill(0, count($qids), '?'));
    
    $stmt_a = $pdo->prepare("
      SELECT a.*, u.username AS author_username,
             (SELECT vote_type FROM answer_votes WHERE answer_id = a.id AND user_id = ?) as user_vote,
             (SELECT 1 FROM answer_helpful_votes WHERE answer_id = a.id AND user_id = ?) as user_helpful
      FROM answers a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.question_id IN ($placeholders)
      ORDER BY a.created_at ASC
    ");
    
    $args = array_merge([$logged_in_user_id, $logged_in_user_id], $qids);
    $stmt_a->execute($args);
    
    while ($row = $stmt_a->fetch(PDO::FETCH_ASSOC)) {
      $qid = (int)$row['question_id'];
      if (isset($questions[$qid])) {
        $row['id'] = (int)$row['id'];
        $row['user_id'] = (int)$row['user_id'];
        $row['is_accepted'] = (bool)$row['is_accepted'];
        $row['user_vote'] = (int)($row['user_vote'] ?? 0);
        $row['user_helpful'] = (bool)($row['user_helpful'] ?? false);
        
        if ($row['author_username']) {
          $row['author'] = $row['author_username'];
        }
        unset($row['author_username']);
        
        $questions[$qid]['answers'][] = $row;
      }
    }
  }

  echo json_encode(array_values($questions));
  exit;
}

if ($method === 'POST') {
  require_once __DIR__ . '/auth.php';
  $logged_in_user_id = StudyNestAuth::validate(['user']); // Correctly authenticate or exit with 401/403

  try {
    $data = json_decode(file_get_contents('php://input'), true) ?? [];
    $action = $data['action'] ?? '';

  switch ($action) {

    case 'add_question': {
      $title = $data['title'] ?? '';
      $body = $data['body'] ?? '';
      $tags = is_array($data['tags'] ?? null) ? implode(',', $data['tags']) : ($data['tags'] ?? '');
      $anonymous = !empty($data['anonymous']) ? true : false;
      $author = $data['author'] ?? 'Anonymous';

      if (!$title || !$body) {
          send_response('error', 'Title and body are required.');
      }

      $stmt = $pdo->prepare("INSERT INTO questions (title, body, tags, user_id, anonymous, author) VALUES (?, ?, ?, ?, ?, ?)");

      if ($stmt->execute([$title, $body, $tags, $logged_in_user_id, $anonymous, $author])) {
        // Award 15 points for asking a question
        $newId = $pdo->lastInsertId();
        awardPoints($pdo, $logged_in_user_id, 15, 'ask_question', (string)$newId, 'Asked a question');
        send_response('success', 'Question added.', ['id' => $newId]);
      } else {
        send_sql_error($pdo, 'Failed to add question.');
      }
      break;
    }

    case 'add_answer': {
      $qid = $data['question_id'] ?? 0;
      $body = $data['body'] ?? '';
      $author = $data['author'] ?? 'Anonymous';

      if (!$qid || !$body) {
          send_response('error', 'Question ID and body are required.');
      }

      $stmt = $pdo->prepare("INSERT INTO answers (question_id, body, user_id, author) VALUES (?, ?, ?, ?)");

      if ($stmt->execute([$qid, $body, $logged_in_user_id, $author])) {
        // Award 2 points for answering
        $newId = $pdo->lastInsertId();
        awardPoints($pdo, $logged_in_user_id, 2, 'answer_question', (string)$newId, 'Answered a question');

        /* 🆕 Create notification for question owner */
        $qres = $pdo->prepare("SELECT q.title AS q_title, u.student_id AS target_sid, u.username AS q_author FROM questions q LEFT JOIN users u ON q.user_id = u.id WHERE q.id=?");
        $qres->execute([$qid]);
        $meta = $qres->fetch(PDO::FETCH_ASSOC);

        if ($meta && !empty($meta['target_sid'])) {
          $n_title = "💬 New answer to your question";
          $n_message = "{$author} replied to: \"{$meta['q_title']}\"";
          $n_link = "/forum";
          $nstmt = $pdo->prepare("INSERT INTO notifications (student_id, title, message, link, type, reference_id) VALUES (?, ?, ?, ?, 'forum_answer', ?)");
          $nstmt->execute([$meta['target_sid'], $n_title, $n_message, $n_link, $qid]);
        }

        send_response('success', 'Answer added.', ['id' => $newId]);
      } else {
        send_sql_error($pdo, 'Failed to add answer.');
      }
      break;
    }

    case 'vote_question': {
      $qid = (int)($data['id'] ?? 0);
      $delta = (int)($data['delta'] ?? 0); // 1 or -1
      if (!$qid || abs($delta) !== 1) send_response('error', 'Invalid parameters.');

      $pdo->beginTransaction();
      try {
        $check = $pdo->prepare("SELECT vote_type FROM question_votes WHERE question_id=? AND user_id=?");
        $check->execute([$qid, $logged_in_user_id]);
        $existing = $check->fetch(PDO::FETCH_ASSOC);

        $final_delta = 0;
        if ($existing) {
          if ($existing['vote_type'] == $delta) {
            // Toggle off
            $pdo->prepare("DELETE FROM question_votes WHERE question_id=? AND user_id=?")->execute([$qid, $logged_in_user_id]);
            $final_delta = -$delta;
          } else {
            // Change vote
            $pdo->prepare("UPDATE question_votes SET vote_type=? WHERE question_id=? AND user_id=?")->execute([$delta, $qid, $logged_in_user_id]);
            $final_delta = 2 * $delta;
          }
        } else {
          // New vote
          $pdo->prepare("INSERT INTO question_votes (question_id, user_id, vote_type) VALUES (?, ?, ?)")->execute([$qid, $logged_in_user_id, $delta]);
          $final_delta = $delta;
        }

        $pdo->prepare("UPDATE questions SET votes = votes + ? WHERE id = ?")->execute([$final_delta, $qid]);
        $pdo->commit();
        send_response('success', 'Vote updated.', ['new_votes' => $final_delta]);
      } catch (Throwable $e) {
        $pdo->rollBack();
        send_response('error', 'Vote failed: ' . $e->getMessage());
      }
      break;
    }

    case 'vote_answer': {
      $aid = (int)($data['id'] ?? 0);
      $delta = (int)($data['delta'] ?? 0);
      if (!$aid || abs($delta) !== 1) send_response('error', 'Invalid parameters.');

      $pdo->beginTransaction();
      try {
        $check = $pdo->prepare("SELECT vote_type FROM answer_votes WHERE answer_id=? AND user_id=?");
        $check->execute([$aid, $logged_in_user_id]);
        $existing = $check->fetch(PDO::FETCH_ASSOC);

        $final_delta = 0;
        if ($existing) {
          if ($existing['vote_type'] == $delta) {
            $pdo->prepare("DELETE FROM answer_votes WHERE answer_id=? AND user_id=?")->execute([$aid, $logged_in_user_id]);
            $final_delta = -$delta;
          } else {
            $pdo->prepare("UPDATE answer_votes SET vote_type=? WHERE answer_id=? AND user_id=?")->execute([$delta, $aid, $logged_in_user_id]);
            $final_delta = 2 * $delta;
          }
        } else {
          $pdo->prepare("INSERT INTO answer_votes (answer_id, user_id, vote_type) VALUES (?, ?, ?)")->execute([$aid, $logged_in_user_id, $delta]);
          $final_delta = $delta;
        }

        $pdo->prepare("UPDATE answers SET votes = votes + ? WHERE id = ?")->execute([$final_delta, $aid]);
        $pdo->commit();
        send_response('success', 'Vote updated.', ['new_votes' => $final_delta]);
      } catch (Throwable $e) {
        $pdo->rollBack();
        send_response('error', 'Vote failed: ' . $e->getMessage());
      }
      break;
    }

    case 'peer_review': {
      $aid = (int)($data['id'] ?? 0);
      if (!$aid) send_response('error', 'Invalid parameters.');

      $pdo->beginTransaction();
      try {
        $check = $pdo->prepare("SELECT 1 FROM answer_helpful_votes WHERE answer_id=? AND user_id=?");
        $check->execute([$aid, $logged_in_user_id]);
        
        if ($check->fetch()) {
          // Toggle off
          $pdo->prepare("DELETE FROM answer_helpful_votes WHERE answer_id=? AND user_id=?")->execute([$aid, $logged_in_user_id]);
          $pdo->prepare("UPDATE answers SET helpful = GREATEST(0, helpful - 1) WHERE id = ?")->execute([$aid]);
          $pdo->commit();
          send_response('success', 'Helpful mark removed.');
        } else {
          // Mark helpful
          $pdo->prepare("INSERT INTO answer_helpful_votes (answer_id, user_id) VALUES (?, ?)")->execute([$aid, $logged_in_user_id]);
          $pdo->prepare("UPDATE answers SET helpful = helpful + 1 WHERE id = ?")->execute([$aid]);
          $pdo->commit();
          send_response('success', 'Marked as helpful.');
        }
      } catch (Throwable $e) {
        $pdo->rollBack();
        send_response('error', 'Update failed: ' . $e->getMessage());
      }
      break;
    }

    case 'accept_answer': {
      try {
        $pdo->beginTransaction();
        // First, verify that the current user owns the question
        $verifyStmt = $pdo->prepare("SELECT user_id FROM questions WHERE id = ?");
        $verifyStmt->execute([$data['question_id']]);
        $questionOwner = $verifyStmt->fetch(PDO::FETCH_ASSOC);

        // Check if current user is the question owner
        if (!$questionOwner || $questionOwner['user_id'] != $logged_in_user_id) {
          send_response('error', 'Only the question owner can accept answers.');
          exit;
        }

        $stmt1 = $pdo->prepare("UPDATE answers SET is_accepted = FALSE WHERE question_id = ?");
        $stmt1->execute([($data['question_id'] ?? 0)]);

        $stmt2 = $pdo->prepare("UPDATE answers SET is_accepted = TRUE WHERE id = ?");
        $stmt2->execute([($data['answer_id'] ?? 0)]);

        // Get answer author's user_id to award points
        $stmt3 = $pdo->prepare("SELECT user_id FROM answers WHERE id = ?");
        $stmt3->execute([$data['answer_id']]);
        $row = $stmt3->fetch(PDO::FETCH_ASSOC);

        if ($row && !empty($row['user_id'])) {
          // Award 5 points for accepted answer
          awardPoints($pdo, $row['user_id'], 5, 'answer_accepted', (string)$data['answer_id'], 'Answer was accepted');
        }

        $pdo->commit();
        send_response('success', 'Answer accepted.');
      } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollback();
        send_response('error', 'Failed to accept answer: ' . $e->getMessage());
      }
      break;
    }

    // Point system endpoints
    case 'get_user_points': {
      if (!$logged_in_user_id) {
        send_response('error', 'User not authenticated.');
      }

      $points = getUserPoints($pdo, $logged_in_user_id);
      send_response('success', 'Points retrieved.', ['points' => $points]);
      break;
    }

    default:
      send_response('error', 'Invalid action specified: ' . ($action ?: 'empty'));
      break;
    }
  } catch (Throwable $e) {
    send_response('error', 'Server error: ' . $e->getMessage());
  }
}
