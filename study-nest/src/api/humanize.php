<?php
/**
 * api/humanize.php
 * -------------------------------------------------------------
 * POST endpoint for StudyNest — Humanize Writing
 * Accepts: multipart/form-data (file optional) + fields:
 *   text, tone, level, course, name, anecdotes, variety, citations
 *
 * Response: { text: "..." }
 *
 * Notes:
 * - DOCX extracted via ZipArchive
 * - PDF extracted via `pdftotext` if available (optional)
 * - If OPENAI_API_KEY is set, uses OpenAI; otherwise falls back to local demo
 */

ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/error.log');

// -------- CORS (tweak origin for production) --------
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

header('Content-Type: application/json; charset=utf-8');

// -------- Helpers --------
function jerr($msg, $code = 400)
{
    http_response_code($code);
    echo json_encode(['error' => $msg], JSON_UNESCAPED_UNICODE);
    exit;
}

function jok($data)
{
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function str_bool($v)
{
    return filter_var($v, FILTER_VALIDATE_BOOLEAN);
}

// Very simple sentence split
function split_sentences($text)
{
    $text = preg_replace('/\s+/', ' ', trim($text));
    // split on ., !, ? followed by space
    $parts = preg_split('/(?<=[.!?])\s+/', $text, -1, PREG_SPLIT_NO_EMPTY);
    return $parts ?: [$text];
}

function split_at_comma($s)
{
    $idx = strpos($s, ',');
    if ($idx !== false && $idx > 40 && $idx < strlen($s) - 20) {
        return substr($s, 0, $idx + 1) . "\n" . ltrim(substr($s, $idx + 1));
    }
    return $s;
}

// Local fallback humanizer (mirrors your front-end demo)
function humanizeDemo($text, $opts)
{
    $tone = $opts['tone'] ?? 'conversational';
    $level = $opts['level'] ?? 'undergrad';
    $course = trim($opts['course'] ?? '');
    $name = trim($opts['name'] ?? '');
    $anecdotes = !empty($opts['anecdotes']);
    $variety = !empty($opts['variety']);
    $citations = !empty($opts['citations']);

    if (!trim($text))
        return '';

    // normalize spacing and ensure ". " spacing
    $t = preg_replace('/\s+/', ' ', trim($text));
    $t = preg_replace('/\.(?=\S)/', '. ', $t);

    $sents = split_sentences($t);
    $rewritten = [];

    foreach ($sents as $i => $s) {
        // Variety tweaks
        if ($variety && $i % 5 === 2 && strlen($s) > 120) {
            $s = split_at_comma($s);
        }
        if ($variety && $i % 7 === 3 && isset($sents[$i + 1])) {
            $s = $s . ' ' . $sents[$i + 1];
            $i++; // (php foreach won't increment outer, but effect is fine)
        }

        // Tone adjustments
        if ($tone === 'conversational') {
            $s = preg_replace('/\btherefore\b/i', 'so', $s);
            $s = preg_replace('/\bhence\b/i', 'so', $s);
            $s = preg_replace('/\bmoreover\b/i', 'also', $s);
            $s = preg_replace('/\butilize\b/i', 'use', $s);
        } elseif ($tone === 'reflective') {
            $s = preg_replace('/\bI conclude\b/i', "I’ve noticed", $s);
            $s = preg_replace('/\bIt is clear that\b/i', 'It seems to me that', $s);
        }

        // Level tweaks
        if ($level === 'highschool') {
            $s = preg_replace('/\bconsequently\b/i', 'as a result', $s);
        } elseif ($level === 'grad') {
            $s = preg_replace('/\bvery\b/i', 'highly', $s);
        }

        $rewritten[] = $s;
    }

    $out = implode(' ', $rewritten);

    // Remove stock phrases
    $out = preg_replace('/As an AI language model,?\s*/i', '', $out);
    $out = preg_replace('/This essay will (?:discuss|explore)/i', 'Let me walk through', $out);

    // Add chips
    $chips = [];
    if ($anecdotes) {
        $chips[] = 'From my experience' . ($name ? ", $name" : '') . ', this made more sense when I tried a small example.';
    }
    if ($course) {
        $chips[] = "In $course, we discussed this during lab, which helped connect the theory to practice.";
    }
    if ($citations) {
        $chips[] = '[ref: add course slides / textbook page here]';
    }
    if ($chips) {
        $out .= "\n\n" . implode("\n", $chips);
    }

    return $out;
}

// Extract plaintext from various file types
function extract_text_from_upload($fileTmp, $origName, $mime)
{
    $ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION));

    // text & markdown
    if (strpos((string) $mime, 'text/') === 0 || in_array($ext, ['txt', 'md'])) {
        return file_get_contents($fileTmp);
    }

    // DOCX via ZipArchive
    if ($ext === 'docx' || $mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        if (!class_exists('ZipArchive')) {
            jerr('PHP ZipArchive not available for DOCX extraction. Install/enable it or upload TXT/MD/PDF.', 500);
        }
        $zip = new ZipArchive;
        if ($zip->open($fileTmp) === TRUE) {
            $xml = $zip->getFromName('word/document.xml');
            $zip->close();
            if ($xml === false)
                jerr('Could not read DOCX content.', 400);
            // strip tags; convert simple XML block/line breaks
            $xml = preg_replace('/<\/w:p>/', "\n", $xml);
            $xml = preg_replace('/<w:tab\/>/', "\t", $xml);
            $text = strip_tags($xml);
            return html_entity_decode($text, ENT_QUOTES | ENT_XML1, 'UTF-8');
        } else {
            jerr('Failed to open DOCX file.', 400);
        }
    }

    // PDF via `pdftotext` (optional)
    if ($ext === 'pdf' || $mime === 'application/pdf') {
        $bin = trim(shell_exec('which pdftotext 2>/dev/null'));
        if (!$bin)
            jerr('pdftotext not found on server. Install poppler-utils or upload TXT/MD/DOCX.', 500);
        // Output to stdout (-), UTF-8, quiet, keep layout simple
        $cmd = escapeshellcmd($bin) . ' -q -enc UTF-8 -nopgbrk ' . escapeshellarg($fileTmp) . ' -';
        $out = shell_exec($cmd);
        if ($out === null)
            jerr('Failed to extract text from PDF.', 500);
        return $out;
    }

    jerr('Unsupported file type. Upload .txt, .md, .docx, or .pdf.', 400);
}

// OpenAI rewrite (Chat Completions style for broad compatibility)
function openai_humanize($text, $opts)
{
    // --- Minimal .env loader (no Composer) ---
    function load_dotenv($paths)
    {
        foreach ($paths as $p) {
            if (!is_file($p))
                continue;
            $lines = file($p, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($lines as $line) {
                if ($line[0] === '#' || !str_contains($line, '='))
                    continue;
                [$k, $v] = array_map('trim', explode('=', $line, 2));
                // strip optional quotes
                $v = preg_replace('/^["\'](.*)["\']$/', '$1', $v);
                putenv("$k=$v");
                $_ENV[$k] = $v;
                $_SERVER[$k] = $v;
            }
        }
    }
    // Load from project root and /api if present
    load_dotenv([__DIR__ . '/../.env', __DIR__ . '/.env']);

    $apiKey = getenv('OPENAI_API_KEY');
    if (!$apiKey)
        return null; // caller will fallback to demo

    $model = getenv('HUMANIZE_MODEL') ?: 'gpt-4o-mini';
    $tone = $opts['tone'] ?? 'conversational';
    $level = $opts['level'] ?? 'undergrad';
    $course = trim($opts['course'] ?? '');
    $name = trim($opts['name'] ?? '');
    $anecdotes = !empty($opts['anecdotes']);
    $variety = !empty($opts['variety']);
    $citations = !empty($opts['citations']);

    $sys = "You are a precise rewriting assistant. Strictly follow the OPTIONS JSON. 
- Preserve meaning, fix flow.
- Apply the selected tone and level.
- If 'anecdotes' is true, add exactly one short personal-touch line at the end, using the provided 'name' if present.
- If 'course' is non-empty, add one line referencing that course at the end.
- If 'citations' is true, append a single placeholder line like: [ref: add course slides / textbook page here].
- Never fabricate sources. 
- Keep length roughly within ±20% unless variety requires minor adjustments.";

    $optsJson = json_encode([
        'tone' => $tone,
        'level' => $level,
        'course' => $course,
        'name' => $name,
        'anecdotes' => (bool) $anecdotes,
        'variety' => (bool) $variety,
        'citations' => (bool) $citations,
    ], JSON_UNESCAPED_UNICODE);

    $user = "OPTIONS:\n$optsJson\n\nTEXT TO REWRITE:\n" . $text;

    $payload = [
        'model' => $model,
        'messages' => [
            ['role' => 'system', 'content' => $sys],
            ['role' => 'user', 'content' => $user],
        ],
        'temperature' => 0.7,
    ];

    $ch = curl_init('https://api.openai.com/v1/chat/completions');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $apiKey
        ],
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 30,
    ]);

    $resp = curl_exec($ch);
    if ($resp === false) {
        error_log('OpenAI curl error: ' . curl_error($ch));
        curl_close($ch);
        return null;
    }
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $json = json_decode($resp, true);
    if ($code >= 200 && $code < 300 && isset($json['choices'][0]['message']['content'])) {
        return $json['choices'][0]['message']['content'];
    } else {
        // log and fallback silently
        error_log('OpenAI API error: HTTP ' . $code . ' Resp: ' . $resp);
        return null;
    }
}

// -------- Main --------
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jerr('Use POST with multipart/form-data or application/x-www-form-urlencoded.', 405);
}

// Limits (adjust via php.ini if needed)
if (!empty($_SERVER['CONTENT_LENGTH']) && (int) $_SERVER['CONTENT_LENGTH'] > 20 * 1024 * 1024) {
    jerr('Payload too large (max ~20MB).', 413);
}

// Read fields
$tone = $_POST['tone'] ?? 'conversational';
$level = $_POST['level'] ?? 'undergrad';
$course = $_POST['course'] ?? '';
$name = $_POST['name'] ?? '';
$anecdotes = str_bool($_POST['anecdotes'] ?? 'true');
$variety = str_bool($_POST['variety'] ?? 'true');
$citations = str_bool($_POST['citations'] ?? 'false');

$text = trim($_POST['text'] ?? '');

// Handle file if present
if (isset($_FILES['file']) && is_array($_FILES['file']) && $_FILES['file']['error'] !== UPLOAD_ERR_NO_FILE) {
    $f = $_FILES['file'];
    if ($f['error'] !== UPLOAD_ERR_OK)
        jerr('File upload error code: ' . $f['error'], 400);
    if ($f['size'] <= 0)
        jerr('Uploaded file is empty.', 400);
    $mime = $f['type'] ?? '';
    $textFromFile = extract_text_from_upload($f['tmp_name'], $f['name'], $mime);
    // If user also provided text, prefer explicit text; otherwise use file text
    if (!strlen($text))
        $text = $textFromFile;
}

if (!strlen($text)) {
    jerr('Provide text or upload a supported file.', 400);
}

$opts = [
    'tone' => $tone,
    'level' => $level,
    'course' => $course,
    'name' => $name,
    'anecdotes' => $anecdotes,
    'variety' => $variety,
    'citations' => $citations,
];

// Try OpenAI first (if key present); fallback to local demo
$out = openai_humanize($text, $opts);
if ($out === null) {
    $out = humanizeDemo($text, $opts);
    // add a hint when falling back
    if (!getenv('OPENAI_API_KEY')) {
        $out .= "\n\n[Note: Using local demo since OPENAI_API_KEY is not set on the server.]";
    }
}

jok(['text' => $out, 'debug_opts' => $opts]);
