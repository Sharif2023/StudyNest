<?php
require_once __DIR__ . '/db.php'; // Provides $pdo, CORS headers, and session_start()

$type = $_GET['type'] ?? null;

try {
  if ($type === 'programs') {
    try {
      $st = $pdo->query("SELECT DISTINCT program FROM courses WHERE program IS NOT NULL AND TRIM(program) <> '' ORDER BY program");
      $cols = $st ? $st->fetchAll(PDO::FETCH_COLUMN) : [];
      echo json_encode(['ok' => true, 'programs' => array_values(array_filter($cols))]);
    } catch (Throwable $e) {
      echo json_encode(['ok' => true, 'programs' => [], 'warning' => 'courses_unavailable']);
    }
    exit;
  }
  if ($type === 'departments') {
    try {
      $program = $_GET['program'] ?? '';
      $st = $pdo->prepare("SELECT DISTINCT department FROM courses WHERE program=? AND department IS NOT NULL AND TRIM(department) <> '' ORDER BY department");
      $st->execute([$program]);
      echo json_encode(['ok' => true, 'departments' => $st->fetchAll(PDO::FETCH_COLUMN)]);
    } catch (Throwable $e) {
      echo json_encode(['ok' => true, 'departments' => []]);
    }
    exit;
  }
  if ($type === 'courses') {
    try {
      $dept = $_GET['department'] ?? '';
      $q = "%" . ($_GET['q'] ?? '') . "%";
      $st = $pdo->prepare("SELECT id,course_code,course_title,department,program,course_thumbnail 
                           FROM courses 
                           WHERE department=? 
                             AND (course_code LIKE ? OR course_title LIKE ?)
                           ORDER BY course_code LIMIT 50");
      $st->execute([$dept, $q, $q]);
      echo json_encode(['ok' => true, 'courses' => $st->fetchAll(PDO::FETCH_ASSOC)]);
    } catch (Throwable $e) {
      echo json_encode(['ok' => true, 'courses' => []]);
    }
    exit;
  }
  echo json_encode(['ok'=>false,'error'=>'invalid_type']);
} catch(Throwable $e){
  http_response_code(500);
  echo json_encode(['ok'=>false,'error'=>$e->getMessage()]);
}
