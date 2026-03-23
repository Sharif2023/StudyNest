<?php
// session_debug.php
require_once __DIR__ . '/db.php';

echo json_encode([
    "ok" => true,
    "session" => $_SESSION,
    "cookie" => $_COOKIE,
    "headers" => getallheaders()
], JSON_PRETTY_PRINT);
