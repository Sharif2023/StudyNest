<?php
// === External tool paths ===
const PDFTOTEXT_EXE = 'C:\\poppler\\bin\\pdftotext.exe'; // Poppler
const ANTIWORD_EXE  = 'C:\\antiword\\antiword.exe';      // Antiword (for .doc)


// File: AIFileCheck.php
// Location: same folder as db.php (e.g., study-nest/src/api/AIFileCheck.php)

// ---------- Headers (CORS + JSON) ----------
header('Content-Type: application/json; charset=UTF-8');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

// ---------- Helpers ----------
function json_fail($code, $msg, $extra = []) {
  http_response_code($code);
  echo json_encode(['ok' => false, 'error' => $msg, 'extra' => $extra], JSON_UNESCAPED_UNICODE);
  exit;
}
function sentences($text) {
  // Split into sentences (very rough).
  $text = preg_replace("/\s+/", " ", trim($text));
  if ($text === "") return [];
  $parts = preg_split('/(?<=[\.!\?])\s+/u', $text);
  // Filter weirdly short/long fragments
  return array_values(array_filter($parts, function($s){
    $w = str_word_count($s);
    return $w >= 3;
  }));
}
function word_count_fast($text) {
  $w = preg_split('/\s+/u', trim($text));
  return $w[0] === "" ? 0 : count($w);
}
function est_tokens($text) {
  // very rough: ~4 chars per token
  return (int)ceil(strlen($text) / 4);
}

// ---------- Text Extraction ----------
function extract_txt_md($path) { return @file_get_contents($path) ?: ""; }

function extract_docx($path) {
  // DOCX is a zip; read word/document.xml
  $zip = new ZipArchive();
  $out = "";
  if ($zip->open($path) === TRUE) {
    $xml = $zip->getFromName("word/document.xml");
    $zip->close();
    if ($xml) {
      // Strip tags, decode entities, normalize spaces
      $xml = preg_replace('/<w:p[^>]*>/', "\n", $xml);
      $xml = strip_tags($xml);
      $xml = html_entity_decode($xml, ENT_QUOTES | ENT_XML1, 'UTF-8');
      $out = preg_replace("/[ \t]+/", " ", $xml);
    }
  }
  return trim($out);
}

function extract_pdf($path, &$warnings) {
  $exe = PDFTOTEXT_EXE;
  $tmp = $path . '.txt';
  if ($exe && file_exists($exe)) {
    $cmd = "\"$exe\" -layout " . escapeshellarg($path) . " " . escapeshellarg($tmp) . " 2>&1";
    exec($cmd, $out, $st);
    if ($st === 0 && file_exists($tmp)) {
      $txt = file_get_contents($tmp); @unlink($tmp);
      return trim(preg_replace(["/\r\n?/", "/[ \t]+/"], ["\n", " "], $txt));
    }
  }
  $warnings[] = "pdftotext not available or failed.";
  return "";
}

function extract_doc($path, &$warnings) {
  $exe = ANTIWORD_EXE;
  if ($exe && file_exists($exe)) {
    $cmd = "\"$exe\" -w 0 " . escapeshellarg($path) . " 2>&1";
    exec($cmd, $out, $st);
    if ($st === 0 && !empty($out)) {
      $txt = implode("\n", $out);
      return trim(preg_replace(["/\r\n?/", "/[ \t]+/"], ["\n", " "], $txt));
    }
  }
  $warnings[] = "antiword not available or failed (convert .doc to .docx or install antiword).";
  return "";
}

function extract_text_from_upload($tmpPath, $origName, $mime, &$warnings) {
  $nameLower = strtolower($origName);
  if (preg_match('/\.(txt|md)$/', $nameLower)) return extract_txt_md($tmpPath);
  if (preg_match('/\.docx$/', $nameLower)) return extract_docx($tmpPath);
  if (preg_match('/\.pdf$/', $nameLower))  return extract_pdf($tmpPath, $warnings);

  // Fall back by MIME when extension is missing
  if (stripos($mime, 'text/') === 0) return extract_txt_md($tmpPath);

  $warnings[] = "Unsupported file type for server-side extraction. Provide plain text in the 'text' field or use .txt/.md/.docx.";
  return "";
}

// ---------- Tiny "AI" Heuristics (offline, no external deps) ----------
function make_summary($text, $maxSent = 4) {
  $S = sentences($text);
  if (empty($S)) return "";
  // Pick first sentence + 2–3 informative ones by length within bounds
  $picked = [];
  $picked[] = $S[0];
  // Score by length (prefer mid-length)
  $scores = [];
  foreach ($S as $i => $s) {
    $len = mb_strlen($s, 'UTF-8');
    $score = -abs($len - 160); // peak around ~160 chars
    $scores[$i] = $score;
  }
  arsort($scores);
  foreach ($scores as $i => $_) {
    if ($i === 0) continue;
    $picked[] = $S[$i];
    if (count($picked) >= $maxSent) break;
  }
  $extra = "\n\nFocus areas:\n• Define key terms clearly\n• Connect sections with transitions\n• Add 1–2 concrete examples";
  return implode(" ", $picked) . $extra;
}

function make_keypoints($text, $maxPts = 5) {
  $S = sentences($text);
  if (empty($S)) return [];
  // Simple "importance": sentences containing cue words
  $cues = ['important','key','major','main','therefore','thus','we propose','we present','in summary','conclusion','result','evidence','because'];
  $scores = [];
  foreach ($S as $i => $s) {
    $score = 0;
    $low = mb_strtolower($s,'UTF-8');
    foreach ($cues as $c) if (mb_strpos($low, $c) !== false) $score += 3;
    $len = max(1, str_word_count($s));
    $score += min(5, $len / 8); // prefer some substance
    $scores[$i] = $score;
  }
  arsort($scores);
  $out = [];
  foreach ($scores as $i => $_) {
    $pt = trim($S[$i]);
    if (mb_strlen($pt,'UTF-8') > 220) $pt = mb_substr($pt, 0, 200, 'UTF-8') . "…";
    $out[] = $pt;
    if (count($out) >= $maxPts) break;
  }
  // If text is short, provide generic points
  if (count($out) < 3) {
    $out = array_merge($out, [
      "Defines the main thesis early on.",
      "Lists supporting arguments with some evidence.",
      "Ends with a brief recap linking back to the thesis."
    ]);
    $out = array_slice($out, 0, $maxPts);
  }
  return $out;
}

function make_tips() {
  return [
    "Add headings (H2/H3) to break long sections",
    "Replace passive voice in a few sentences",
    "Include a short summary box per section",
    "Add 2 practice questions at the end",
  ];
}

function make_grammar_report($text) {
  // Very small set of checks: common typos + passive voice heuristic
  $typos = [
    'occured' => 'occurred',
    'teh' => 'the',
    'recieve' => 'receive',
    'seperate' => 'separate',
    'recommand' => 'recommend',
    'enviroment' => 'environment',
  ];
  $found = [];
  $low = mb_strtolower($text,'UTF-8');
  foreach ($typos as $bad => $good) {
    if (mb_strpos($low, $bad) !== false) $found[] = "'$bad' → '$good'";
  }
  // Passive voice (very rough): "was|were|is|are|be + VERB-ed"
  $passiveHits = preg_match_all('/\b(?:was|were|is|are|be|been|being)\s+\w+ed\b/i', $text, $m);

  $out = "Style notes:\n- Prefer active voice where possible\n- Standardize capitalization for headings\n- Watch for run-on sentences in long paragraphs";
  if ($passiveHits > 0) $out .= "\n\nPassive voice (heuristic): found ~{$passiveHits} occurrence(s)";
  if (!empty($found)) {
    $out .= "\n\nTypos (sample):\n- " . implode("\n- ", $found);
  }
  return $out;
}

function make_similarity_hint($text) {
  // Offline toy metric: Jaccard of top tokens vs a tiny built-in corpus
  $refs = [
    ["title" => "Intro to Topic (Lecture notes)", "text" => "introduction basics overview concepts examples summary"],
    ["title" => "Wikipedia overview", "text" => "overview definition history applications references external links"],
    ["title" => "Peer study guide", "text" => "guide checklist key points practice tips summary"],
  ];
  $tok = function($t){
    $t = mb_strtolower($t,'UTF-8');
    $t = preg_replace('/[^a-z0-9\s]+/i',' ', $t);
    $parts = preg_split('/\s+/', trim($t));
    $parts = array_filter($parts, fn($w) => mb_strlen($w,'UTF-8') >= 3);
    return array_values(array_unique($parts));
  };
  $A = $tok($text);
  if (empty($A)) return ['score'=>0.0, 'matches'=>[]];

  $matches = [];
  $best = 0.0;
  foreach ($refs as $r) {
    $B = $tok($r['text']);
    $inter = array_intersect($A, $B);
    $union = array_unique(array_merge($A, $B));
    $jac = count($union) ? (count($inter) / count($union)) : 0.0;
    $pct = round($jac * 100);
    $best = max($best, $jac);
    $matches[] = ['title'=>$r['title'], 'pct'=>$pct, 'link'=> ($r['title']==='Wikipedia overview' ? 'https://wikipedia.org' : null)];
  }
  return ['score'=>$best, 'matches'=>$matches];
}

// ---------- Handle Request ----------
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  json_fail(405, 'Use POST');
}

$warnings = [];

// Options
$optsRaw = isset($_POST['options']) ? $_POST['options'] : '{}';
$opts = json_decode($optsRaw, true);
if (!is_array($opts)) $opts = [];
$wantSummary   = !empty($opts['summarize']);
$wantKeypoints = !empty($opts['keypoints']);
$wantTips      = !empty($opts['tips']);
$wantGrammar   = !empty($opts['grammar']);
$wantSim       = !empty($opts['similarity']);

$anonymous = isset($_POST['anonymous']) ? filter_var($_POST['anonymous'], FILTER_VALIDATE_BOOLEAN) : false;

// Input text (optional override)
$inputText = isset($_POST['text']) ? trim($_POST['text']) : "";

// File
if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
  json_fail(400, 'No file uploaded or upload error.');
}

$f = $_FILES['file'];
$origName = $f['name'] ?? 'file';
$tmpPath  = $f['tmp_name'] ?? null;
$mime     = $f['type'] ?? 'application/octet-stream';
$size     = (int)($f['size'] ?? 0);

if (!$tmpPath || !file_exists($tmpPath)) {
  json_fail(400, 'Temporary upload not found.');
}

// Extract text
$text = $inputText !== "" ? $inputText : extract_text_from_upload($tmpPath, $origName, $mime, $warnings);

// Normalize and limit (avoid huge payloads)
$text = preg_replace("/[ \t]+/u", " ", str_replace("\r", "", (string)$text));
$text = trim($text);
$MAX_CHARS = 40000; // ~10k tokens rough
if (mb_strlen($text,'UTF-8') > $MAX_CHARS) {
  $text = mb_substr($text, 0, $MAX_CHARS, 'UTF-8');
  $warnings[] = "Input truncated to {$MAX_CHARS} characters for analysis speed.";
}

// If still empty and user didn't send 'text', bail softly
if ($text === "") {
  json_fail(422, 'Could not extract text from file. Send .txt/.md/.docx or install pdftotext for PDFs.', ['warnings'=>$warnings]);
}

// Compute meta
$words  = word_count_fast($text);
$chars  = mb_strlen($text, 'UTF-8');
$tokens = est_tokens($text);

// Build result
$result = [];
if ($wantSummary)   $result['summary']   = make_summary($text);
if ($wantKeypoints) $result['keypoints'] = make_keypoints($text);
if ($wantTips)      $result['tips']      = make_tips();
if ($wantGrammar)   $result['grammar']   = make_grammar_report($text);
if ($wantSim)       $result['similarity']= make_similarity_hint($text);

// ---------- Optional: Save minimal log if not anonymous ----------
$save_ok = false; $save_error = null;
if (!$anonymous) {
  // Try include db.php (must define $conn = new mysqli(...))
  $conn = null;
  $dbIncluded = @include_once __DIR__ . "/db.php";
  if (isset($conn) && $conn instanceof mysqli) {
    // Create table if missing
    $sqlCreate = "CREATE TABLE IF NOT EXISTS ai_file_checks (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      filename VARCHAR(255) NOT NULL,
      mime VARCHAR(120) NOT NULL,
      size_kb INT UNSIGNED NOT NULL,
      words INT UNSIGNED NOT NULL,
      chars INT UNSIGNED NOT NULL,
      tokens_est INT UNSIGNED NOT NULL,
      options_json JSON NULL,
      ip VARCHAR(64) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";
    if ($conn->query($sqlCreate) === TRUE) {
      $stmt = $conn->prepare("INSERT INTO ai_file_checks (filename, mime, size_kb, words, chars, tokens_est, options_json, ip) VALUES (?,?,?,?,?,?,?,?)");
      if ($stmt) {
        $sizeKB = (int)round($size/1024);
        $optsJson = json_encode($opts, JSON_UNESCAPED_UNICODE);
        $ip = $_SERVER['REMOTE_ADDR'] ?? null;
        $stmt->bind_param("ssiiisss", $origName, $mime, $sizeKB, $words, $chars, $tokens, $optsJson, $ip);
        $save_ok = $stmt->execute();
        if (!$save_ok) $save_error = $stmt->error;
        $stmt->close();
      } else {
        $save_error = $conn->error;
      }
    } else {
      $save_error = $conn->error;
    }
    // Do not die on logging errors
  }
}

// ---------- Respond ----------
echo json_encode([
  'ok' => true,
  'summary'   => $result['summary']   ?? null,
  'keypoints' => $result['keypoints'] ?? null,
  'tips'      => $result['tips']      ?? null,
  'grammar'   => $result['grammar']   ?? null,
  'similarity'=> $result['similarity']?? null,
  'meta' => [
    'filename' => $origName,
    'mime'     => $mime,
    'size_kb'  => (int)round($size/1024),
    'words'    => $words,
    'chars'    => $chars,
    'tokens'   => $tokens,
    'warnings' => $warnings,
    'saved'    => ['attempted' => !$anonymous, 'ok' => $save_ok, 'error' => $save_error],
  ]
], JSON_UNESCAPED_UNICODE);
