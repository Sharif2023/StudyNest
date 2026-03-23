<?php
require_once __DIR__ . '/db.php';

try {
    $pdo->beginTransaction();

    // Fix notes table
    // Remove 'http://localhost:8000/StudyNest/study-nest/' prefix
    // Or just strip everything before '/public/uploads/'
    $stmt = $pdo->prepare("UPDATE notes SET file_url = REGEXP_REPLACE(file_url, '^https?://[^/]+(/[^/]+)*/public/uploads/', '/public/uploads/') WHERE file_url LIKE '%/public/uploads/%'");
    $stmt->execute();
    $notesCount = $stmt->rowCount();

    // Fix resources table (if any have local paths)
    $stmt = $pdo->prepare("UPDATE resources SET url = REGEXP_REPLACE(url, '^https?://[^/]+(/[^/]+)*/public/uploads/', '/public/uploads/') WHERE url LIKE '%/public/uploads/%'");
    $stmt->execute();
    $resCount = $stmt->rowCount();

    $pdo->commit();
    echo "URL Cleanup Successful.\n";
    echo "Notes updated: $notesCount\n";
    echo "Resources updated: $resCount\n";

} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    echo "Error: " . $e->getMessage() . "\n";
}
