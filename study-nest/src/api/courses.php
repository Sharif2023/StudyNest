<?php
require_once __DIR__ . '/db.php'; // sets $pdo
header("Content-Type: application/json; charset=utf-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: GET, OPTIONS");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

$type = $_GET['type'] ?? null;

try {
  if ($type === 'programs') {
    $st = $pdo->query("SELECT DISTINCT program FROM courses ORDER BY program");
    echo json_encode(['ok'=>true,'programs'=>$st->fetchAll(PDO::FETCH_COLUMN)]);
    exit;
  }
  if ($type === 'departments') {
    $program = $_GET['program'] ?? '';
    $st = $pdo->prepare("SELECT DISTINCT department FROM courses WHERE program=? ORDER BY department");
    $st->execute([$program]);
    echo json_encode(['ok'=>true,'departments'=>$st->fetchAll(PDO::FETCH_COLUMN)]);
    exit;
  }
  if ($type === 'courses') {
    $dept = $_GET['department'] ?? '';
    $q    = "%".($_GET['q'] ?? '')."%";
    $st = $pdo->prepare("SELECT id,course_code,course_title,department,program,course_thumbnail 
                         FROM courses 
                         WHERE department=? 
                           AND (course_code LIKE ? OR course_title LIKE ?)
                         ORDER BY course_code LIMIT 50");
    $st->execute([$dept,$q,$q]);
    echo json_encode(['ok'=>true,'courses'=>$st->fetchAll(PDO::FETCH_ASSOC)]);
    exit;
  }
  echo json_encode(['ok'=>false,'error'=>'invalid_type']);
} catch(Throwable $e){
  http_response_code(500);
  echo json_encode(['ok'=>false,'error'=>$e->getMessage()]);
}
