<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

require_once "db.php"; // ✅ correct file name

$q = isset($_GET['q']) ? trim($_GET['q']) : "";
$tag = isset($_GET['tag']) ? trim($_GET['tag']) : "";
$type = isset($_GET['type']) ? trim($_GET['type']) : "all";

function searchQuery($pdo, $table, $columns, $q, $tag, $orderColumn = "created_at") {
    $where = [];
    $params = [];

    // Text search
    if ($q) {
        $parts = [];
        foreach ($columns as $col) {
            $parts[] = "$col LIKE ?";
            $params[] = "%$q%";
        }
        $where[] = "(" . implode(" OR ", $parts) . ")";
    }

    // Tag filter
    if ($tag) {
        $where[] = "tags LIKE ?";
        $params[] = "%$tag%";
    }

    $sql = "SELECT * FROM $table";
    if (!empty($where)) $sql .= " WHERE " . implode(" AND ", $where);
    $sql .= " ORDER BY $orderColumn DESC LIMIT 50";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

$result = [
    "notes" => [],
    "resources" => [],
    "forum" => [],
    "rooms" => []
];

try {
    if ($type === "all" || $type === "notes")
        $result["notes"] = searchQuery($pdo, "notes", ["title", "description", "course", "semester"], $q, $tag, "updated_at");

    if ($type === "all" || $type === "resources")
        $result["resources"] = searchQuery($pdo, "resources", ["title", "description", "course", "semester"], $q, $tag, "created_at");

    if ($type === "all" || $type === "forum")
        $result["forum"] = searchQuery($pdo, "questions", ["title", "body", "author"], $q, $tag, "created_at");

    if ($type === "all" || $type === "rooms")
        $result["rooms"] = searchQuery($pdo, "meetings", ["title", "course_title", "course"], $q, $tag, "created_at");

    echo json_encode($result, JSON_PRETTY_PRINT);
} catch (Exception $e) {
    echo json_encode(["error" => $e->getMessage()]);
}
?>
