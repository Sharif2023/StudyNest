<?php
/** 
 * check_ai.php
 * Minimal backend for "AI Usage Checker"
 * - Accepts file upload: TXT, DOCX, (PDF with pdftotext)
 * - Extracts text, scores "AI-likelihood" with simple heuristics
 * - Returns JSON: { score: 0.32, feedback: "..." }
 */
// --- Debug temporarily (remove in prod) ---
ini_set('display_errors', 0);         // don't send PHP notices to client
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/error.log');

// --- Start fresh output buffer to prevent stray output ---
if (ob_get_level() === 0) {
    ob_start();
}
// -------------------- CORS (adjust origin as needed) --------------------
header('Access-Control-Allow-Origin: *'); // replace * with your frontend origin in production
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    if (ob_get_level())
        ob_end_clean();
    exit;
}

// -------------------- Helpers --------------------
// --- JSON helpers ---
function json_response($data, $status = 200)
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    if (ob_get_length()) {
        ob_clean();
    }   // clear any prior output
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    if (ob_get_level())
        ob_end_flush();
    exit;
}
function fail($msg, $status = 400)
{
    json_response(['error' => $msg], $status);
}

function server_has_pdftotext()
{
    $which = strtoupper(substr(PHP_OS, 0, 3)) === 'WIN' ? 'where' : 'which';
    @exec("$which pdftotext", $out, $code);
    return $code === 0;
}

function mb_trim($s)
{
    return preg_replace('/^\s+|\s+$/u', '', $s);
}

// -------------------- File handling --------------------
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    fail('Use POST with multipart/form-data and a "file" field.', 405);
}

if (!isset($_FILES['file']) || !is_uploaded_file($_FILES['file']['tmp_name'])) {
    fail('No file uploaded.');
}

$err = $_FILES['file']['error'];
if ($err !== UPLOAD_ERR_OK) {
    fail('Upload error code: ' . $err);
}

$maxBytes = 8 * 1024 * 1024; // 8 MB limit
if ($_FILES['file']['size'] > $maxBytes) {
    fail('File too large (max 8MB).');
}

$originalName = $_FILES['file']['name'];
$tmpPath = $_FILES['file']['tmp_name'];
$ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));

// Normalize to a temporary working copy
$workDir = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'aiusage_' . bin2hex(random_bytes(6));
if (!mkdir($workDir, 0700, true))
    fail('Server cannot create temp directory.', 500);
$workFile = $workDir . DIRECTORY_SEPARATOR . $originalName;
if (!move_uploaded_file($tmpPath, $workFile)) {
    // If move_uploaded_file fails due to open_basedir, try copy
    if (!copy($_FILES['file']['tmp_name'], $workFile)) {
        fail('Server cannot move uploaded file.', 500);
    }
}

// -------------------- Text extraction --------------------
function extract_text_from_txt($path)
{
    $text = @file_get_contents($path);
    if ($text === false)
        return '';
    // Try to detect encoding; convert to UTF-8
    $enc = mb_detect_encoding($text, ['UTF-8', 'UTF-16', 'UTF-32', 'ISO-8859-1', 'Windows-1252'], true);
    if ($enc && $enc !== 'UTF-8')
        $text = mb_convert_encoding($text, 'UTF-8', $enc);
    return $text;
}

function extract_text_from_docx($path)
{
    if (!class_exists('ZipArchive'))
        return '';
    $zip = new ZipArchive();
    if ($zip->open($path) !== true)
        return '';
    $xml = $zip->getFromName("word/document.xml");
    $zip->close();
    if ($xml === false)
        return '';
    // Remove XML tags, preserve basic paragraph breaks
    $xml = preg_replace('/<\/w:p>/', "\n\n", $xml);
    $text = strip_tags($xml);
    return html_entity_decode($text, ENT_QUOTES | ENT_XML1, 'UTF-8');
}

function extract_text_from_pdf($path)
{
    if (!server_has_pdftotext())
        return [null, "PDFs require 'pdftotext' on the server."];
    $out = $path . '.txt';
    $cmd = 'pdftotext ' . escapeshellarg($path) . ' ' . escapeshellarg($out) . ' 2>&1';
    exec($cmd, $lines, $code);
    if ($code !== 0 || !file_exists($out)) {
        return [null, "Failed to convert PDF to text."];
    }
    $text = file_get_contents($out);
    @unlink($out);
    return [$text, null];
}

$text = '';
$pdfWarning = null;

switch ($ext) {
    case 'txt':
        $text = extract_text_from_txt($workFile);
        break;
    case 'docx':
        $text = extract_text_from_docx($workFile);
        break;
    case 'pdf':
        list($text, $pdfWarning) = extract_text_from_pdf($workFile);
        if ($text === null)
            $text = ''; // will produce an error later
        break;
    default:
        // Try MIME as a fallback for some edge cases
        $mime = mime_content_type($workFile);
        if ($mime === 'text/plain') {
            $text = extract_text_from_txt($workFile);
        } else {
            // Not supported
            @unlink($workFile);
            @rmdir($workDir);
            fail('Unsupported file type. Please upload TXT, DOCX, or PDF.');
        }
}

if (!is_string($text) || mb_trim($text) === '') {
    @unlink($workFile);
    @rmdir($workDir);
    if ($ext === 'pdf' && $pdfWarning) {
        fail($pdfWarning);
    }
    fail('Could not extract text from file. Make sure the document has selectable text (not just images).');
}

// Clean up work files
@unlink($workFile);
@rmdir($workDir);

// -------------------- Heuristic AI-likelihood scoring --------------------
/**
 * This is a lightweight, transparent heuristic intended to give a rough %
 * without any external AI service. It looks at:
 * - Average sentence length & variance (AI often steady, human more bursty)
 * - Type-Token Ratio (lexical diversity)
 * - Repetition of n-grams (over-smoothing can produce repeated patterns)
 * - Punctuation diversity
 * The combined score is normalized into [0..1] as "AI-likelihood".
 */
 function ai_likelihood_score($text) {
    $text = preg_replace('/\s+/u', ' ', trim($text));

    // Sentences
    $sentences = preg_split('/(?<=[\.\!\?])\s+/u', $text, -1, PREG_SPLIT_NO_EMPTY);
    if (!$sentences) $sentences = [$text];

    $wordCounts = [];
    $allWords = [];
    foreach ($sentences as $s) {
        $words = preg_split('/[^\p{L}\p{N}\']+/u', mb_strtolower($s), -1, PREG_SPLIT_NO_EMPTY);
        $allWords = array_merge($allWords, $words);
        $wordCounts[] = max(1, count($words));
    }

    $totalWords = max(1, count($allWords));
    $uniqueWords = count(array_unique($allWords));
    $ttr = $uniqueWords / $totalWords; // lexical diversity (higher -> more human)

    // Sentence length mean & std dev
    $mean = array_sum($wordCounts) / max(1, count($wordCounts));
    $var = 0.0;
    foreach ($wordCounts as $wc) { $var += ($wc - $mean) * ($wc - $mean); }
    $var = $var / max(1, count($wordCounts));
    $std = sqrt($var); // burstiness proxy (higher -> more human)

    // 3-gram repetition
    $trigrams = [];
    for ($i = 0; $i < $totalWords - 2; $i++) {
        $tri = $allWords[$i].' '.$allWords[$i+1].' '.$allWords[$i+2];
        $trigrams[$tri] = ($trigrams[$tri] ?? 0) + 1;
    }
    $maxTri = 0;
    foreach ($trigrams as $count) { if ($count > $maxTri) $maxTri = $count; }
    // Normalize repetition (0: none, 1: heavy repetition)
    $rep = 0.0;
    if ($totalWords > 50) {
        $rep = min(1.0, $maxTri / 5.0);
    }

    // Punctuation diversity
    preg_match_all('/[,:;\"\'\-\(\)\[\]]/u', $text, $puncMatches);
    $puncCount = count($puncMatches[0]);
    $puncDiversity = 0;
    if ($puncCount > 0) {
        $puncTypes = count(array_unique($puncMatches[0]));
        $puncDiversity = min(1.0, $puncTypes / 6.0); // scale ~6 types to 1.0
    }

    // Heuristic: AI texts tend to have
    // - lower std (steadier sentence length)
    // - lower TTR (safe vocab)
    // - higher repetition (templates)
    // - lower punctuation diversity
    // Map features to "human-ness" signals:
    $human_std   = min(1.0, $std / 10.0);         // 0..~1 for std up to ~10
    $human_ttr   = min(1.0, $ttr / 0.6);          // TTR ~0.6+ is very diverse
    $human_rep   = 1.0 - $rep;                    // less repetition is more human
    $human_punc  = $puncDiversity;                // more varied punctuation is more human

    // Weighted blend for human-ness
    $human_score = (0.35*$human_std) + (0.35*$human_ttr) + (0.20*$human_rep) + (0.10*$human_punc);
    $human_score = max(0.0, min(1.0, $human_score));

    // AI-likelihood is the inverse
    $ai_likelihood = 1.0 - $human_score;

    return [
        'ai_likelihood' => $ai_likelihood, // 0..1
        'features' => [
            'avg_sentence_len' => $mean,
            'sentence_std'     => $std,
            'ttr'              => $ttr,
            'tri_repetition'   => $rep,
            'punc_diversity'   => $puncDiversity,
            'total_words'      => $totalWords,
            'sentence_count'   => count($sentences),
        ]
    ];
}

$scored = ai_likelihood_score($text);
$score  = round($scored['ai_likelihood'], 4); 


// ... keep your file handling and text extraction code ...

/* // --- OpenAI analysis (JSON mode) ---
function get_openai_analysis($text_to_analyze)
{
    // Lightweight .env loader (dev convenience)
    if (!getenv('OPENAI_API_KEY')) {
        $ini = @parse_ini_file(__DIR__ . '/.env', false, INI_SCANNER_RAW);
        if ($ini && isset($ini['OPENAI_API_KEY'])) {
            putenv('OPENAI_API_KEY=' . $ini['OPENAI_API_KEY']);
        }
    }
    // (Also block public access to .env if you’re on Apache:)
# In .htaccess:
# <Files ".env">
#   Require all denied
# </Files>

    // 1) Get API key (ENV is safest). For a quick test, you may assign directly.
    $apiKey = getenv('OPENAI_API_KEY');  // e.g. set via: $env:OPENAI_API_KEY="sk-..."
    // $apiKey = 'sk-...'; // <-- TEMP for local testing ONLY, then delete

    if (!$apiKey) {
        return ['error' => 'Server missing OPENAI_API_KEY environment variable.'];
    }

    $apiUrl = 'https://api.openai.com/v1/chat/completions';

    // 2) Prompt (asks for strict JSON with {score, feedback})
    $prompt = <<<PROMPT
You are an expert AI text analyst. Evaluate the following text and return ONLY a JSON object:
- "score": float 0.0 (very likely human) to 1.0 (very likely AI)
- "feedback": one concise sentence explaining the score
Text:
---
{$text_to_analyze}
---
PROMPT;

    $payload = [
        'model' => 'gpt-4o-mini',     // cost-effective & supports JSON mode
        'messages' => [
            ['role' => 'system', 'content' => 'You output only valid JSON.'],
            ['role' => 'user', 'content' => $prompt],
        ],
        // JSON mode so the model is constrained to valid JSON
        'response_format' => ['type' => 'json_object'],
        'temperature' => 0.2,
    ];

    $ch = curl_init($apiUrl);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $apiKey,
        ],
        CURLOPT_TIMEOUT => 30,
    ]);

    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curl_err = curl_error($ch);
    curl_close($ch);

    if ($response === false) {
        return ['error' => 'cURL error: ' . $curl_err];
    }
    if ($http_code !== 200) {
        return ['error' => "OpenAI HTTP $http_code: $response"];
    }

    $decoded = json_decode($response, true);
    $content = $decoded['choices'][0]['message']['content'] ?? '{}';

    // content itself should be JSON due to JSON mode
    $json = json_decode($content, true);
    if (!is_array($json) || !isset($json['score'], $json['feedback'])) {
        return ['error' => 'Model did not return expected JSON payload.'];
    }
    return $json;
}

// ---- Use it: (replace your old analysis block with this) ----
$analysis = get_openai_analysis($text);

// If the API failed, return an error (don’t pretend score=0)
if (isset($analysis['error'])) {
    fail($analysis['error'], 502);
}

$score = max(0.0, min(1.0, (float) $analysis['score']));
$feedback = (string) $analysis['feedback'];

// Add a short excerpt so /humanize can use it
$excerpt = mb_substr($text, 0, 3000);

// --- Single final response ---
json_response([
    'score' => round($score, 4),
    'feedback' => $feedback,
    'excerpt' => $excerpt,
], 200); */


// -------------------- Feedback message --------------------
function feedback_message($score, $features)
{
    $pct = round($score * 100);
    $tips = [];

    if ($features['sentence_std'] < 4) {
        $tips[] = "Vary sentence lengths (mix short punchy lines with longer reflective ones).";
    }
    if ($features['ttr'] < 0.35) {
        $tips[] = "Broaden vocabulary and add concrete, personal details.";
    }
    if ($features['tri_repetition'] > 0.4) {
        $tips[] = "Reduce repeated phrases—rewrite recurring transitions or templates.";
    }
    if ($features['punc_diversity'] < 0.2) {
        $tips[] = "Use a wider range of punctuation where natural (colons, dashes, parentheses).";
    }
    if ($features['total_words'] < 150) {
        $tips[] = "Provide more context; very short samples are harder to assess reliably.";
    }

    $bucket = "Mostly human-written with some AI-like sections.";
    if ($score < 0.25)
        $bucket = "Likely human-written.";
    else if ($score < 0.55)
        $bucket = "Mostly human-written with some AI-like sections.";
    else if ($score < 0.75)
        $bucket = "Mixed signals; may contain notable AI-like passages.";
    else
        $bucket = "Likely AI-written or heavily AI-edited.";

    if (!$tips)
        $tips[] = "Looks fairly natural. Consider adding personal anecdotes or context where helpful.";

    return "$bucket Improvement tips: " . implode(' ', $tips);
}

$feedback = feedback_message($score, $scored['features']);

// -------------------- Response --------------------
$out = [
    'score' => $score,               // 0..1
    'feedback' => $feedback,
    // Optional: expose features to your UI if you want to visualize
    'debug' => $scored['features'],
];

json_response($out, 200);
