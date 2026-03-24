<?php
// ResourceLibrary.php

require_once __DIR__ . '/db.php'; // Provides $pdo, CORS headers, and session_start()

require_once __DIR__ . '/auth.php'; // Provides StudyNestAuth
require_once __DIR__ . '/cloudinary_helper.php';

//////////////////////
// Utility helpers  //
//////////////////////
// Logical moved to auth.php as a global helper.

// Centralized awardPoints is provided by db.php

// Logic moved to cloudinary_helper.php

/////////////////////////
// GET — public feed  //
/////////////////////////
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $uid = current_user_id();
        $showMine = isset($_GET['mine']) && $_GET['mine'] === '1' && $uid;
        $excludeRecordings = isset($_GET['exclude_recordings']) && $_GET['exclude_recordings'] === '1';

        if ($showMine) {
            $sql = "SELECT * FROM resources WHERE user_id = ? ";
        } else {
            $sql = "SELECT * FROM resources WHERE visibility='public' ";
        }

        if ($excludeRecordings) $sql .= "AND (kind IS NULL OR kind <> 'recording') ";
        $sql .= "ORDER BY COALESCE(shared_at, created_at) DESC";

        if ($showMine) {
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$uid]);
            $rows = $stmt->fetchAll();
        } else {
            $rows = $pdo->query($sql)->fetchAll();
        }

        $uid = current_user_id();
        if ($uid) {
            $b = $pdo->prepare("SELECT resource_id FROM bookmarks WHERE user_id=?");
            $b->execute([$uid]);
            $bookmarked = array_column($b->fetchAll(), 'resource_id');
            foreach ($rows as &$r) $r['bookmarked'] = in_array((int)$r['id'], $bookmarked, true);
        }
        echo json_encode(["status"=>"success","resources"=>$rows]);
    } catch (Throwable $e) {
        echo json_encode(["status"=>"error","message"=>$e->getMessage()]);
    }
    exit;
}

//////////////////////////
// POST — Mutations     //
//////////////////////////
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    // Toggle bookmark
    if ($action === 'toggle_bookmark') {
        if (!current_user_id()) { echo json_encode(["status"=>"error","message"=>"Not logged in"]); exit; }
        $uid = current_user_id();
        $rid = (int)($_POST['resource_id'] ?? 0);
        if (!$rid) { echo json_encode(["status"=>"error","message"=>"Missing resource ID"]); exit; }
        try {
            $q = $pdo->prepare("SELECT id FROM bookmarks WHERE user_id=? AND resource_id=?");
            $q->execute([$uid, $rid]);
            if ($q->fetch()) {
                $pdo->prepare("DELETE FROM bookmarks WHERE user_id=? AND resource_id=?")->execute([$uid, $rid]);
                echo json_encode(["status"=>"success","action"=>"removed"]); exit;
            } else {
                $pdo->prepare("INSERT INTO bookmarks (user_id, resource_id) VALUES (?,?)")->execute([$uid, $rid]);
                echo json_encode(["status"=>"success","action"=>"added"]); exit;
            }
        } catch (Throwable $e) {
            echo json_encode(["status"=>"error","message"=>$e->getMessage()]); exit;
        }
    }

    // Delete a personal resource (ownership required)
    if ($action === 'delete_resource') {
        if (!current_user_id()) { echo json_encode(["status"=>"error","message"=>"Not logged in"]); exit; }
        $uid = current_user_id();
        $rid = (int)($_POST['resource_id'] ?? 0);
        if (!$rid) { echo json_encode(["status"=>"error","message"=>"Missing resource ID"]); exit; }
        $is_note = ($_POST['is_note'] ?? '0') === '1';
        try {
            $res = null;
            if (!$is_note) {
                $q = $pdo->prepare("SELECT id,user_id FROM resources WHERE id=? LIMIT 1");
                $q->execute([$rid]);
                $res = $q->fetch();
            }
            if (!$res) {
                // Check if it's a note
                $qn = $pdo->prepare("SELECT id,user_id FROM notes WHERE id=? LIMIT 1");
                $qn->execute([$rid]);
                $note = $qn->fetch();
                if (!$note) { echo json_encode(["status"=>"error","message"=>"Item not found"]); exit; }
                if ((int)$note['user_id'] !== $uid) { echo json_encode(["status"=>"error","message"=>"You can only delete your own item"]); exit; }
            } else {
                if (!is_null($res['user_id']) && (int)$res['user_id'] !== $uid) {
                    echo json_encode(["status"=>"error","message"=>"You can only delete your own resource"]); exit;
                }
            }
            // Note: With unsigned uploads we cannot delete the actual Cloudinary asset server-side here.
            $pdo->prepare("DELETE FROM resources WHERE id=?")->execute([$rid]);
            $pdo->prepare("DELETE FROM bookmarks WHERE resource_id=?")->execute([$rid]); // clean up
            
            // Also check if it's a note (if MyResources calls this for notes)
            $pdo->prepare("DELETE FROM notes WHERE id=? AND user_id=?")->execute([$rid, $uid]);

            echo json_encode(["status"=>"success","message"=>"Resource deleted"]);
        } catch (Throwable $e) {
            echo json_encode(["status"=>"error","message"=>$e->getMessage()]);
        }
        exit;
    }

    // Share personal resource → public
    if ($action === 'share_resource') {
        if (!current_user_id()) { echo json_encode(["status"=>"error","message"=>"Not logged in"]); exit; }
        $uid = current_user_id();
        $rid = (int)($_POST['resource_id'] ?? 0);
        if (!$rid) { echo json_encode(["status"=>"error","message"=>"Missing resource ID"]); exit; }
        try {
            $q = $pdo->prepare("SELECT id,user_id,visibility FROM resources WHERE id=? LIMIT 1");
            $q->execute([$rid]);
            $res = $q->fetch();
            if (!$res) {
                echo json_encode(["status"=>"error","message"=>"Resource not found. If this is a personal note, please use the publish button."]); exit;
            }
            if (!is_null($res['user_id']) && (int)$res['user_id'] !== $uid) {
                echo json_encode(["status"=>"error","message"=>"You can only share your own resource"]); exit;
            }
            if ($res['visibility'] === 'public') {
                echo json_encode(["status"=>"success","message"=>"Already shared","points_awarded"=>0]); exit;
            }
            $pdo->prepare("UPDATE resources SET visibility='public', shared_at=NOW() WHERE id=?")->execute([$rid]);
            
            // Note: If this were a note, we'd need to copy it to resources table. 
            // MyResources currently only calls this on items from the resources table.
            $points = 15; 
            $newTotal = awardPoints($pdo, $uid, $points, 'resource_share', $rid, "Shared personal resource");

            // Proactive Notification for peers
            $resInfo = $pdo->prepare("SELECT title, course FROM resources WHERE id = ?");
            $resInfo->execute([$rid]);
            $rdata = $resInfo->fetch();
            if ($rdata && !empty($rdata['course'])) {
                $course = $rdata['course'];
                $notifStmt = $pdo->prepare("
                    SELECT DISTINCT u.student_id 
                    FROM users u
                    WHERE u.id <> ? 
                      AND (
                        u.id IN (SELECT user_id FROM resources WHERE course = ?)
                        OR u.id IN (SELECT user_id FROM meeting_participants WHERE meeting_id IN (SELECT id FROM meetings WHERE course = ?))
                      )
                    LIMIT 30
                ");
                $notifStmt->execute([$uid, $course, $course]);
                $targets = $notifStmt->fetchAll(PDO::FETCH_COLUMN);
                if ($targets) {
                    $n_title = "🆕 New Resource: {$course}";
                    $n_msg = "A new resource \"{$rdata['title']}\" was just shared in your course!";
                    $n_link = "/resources";
                    $n_ins = $pdo->prepare("INSERT INTO notifications (student_id, title, message, link, type, reference_id) VALUES (?, ?, ?, ?, 'resource_alert', ?)");
                    foreach ($targets as $target_sid) { $n_ins->execute([$target_sid, $n_title, $n_msg, $n_link, $rid]); }
                }
            }

            echo json_encode([
                "status"=>"success",
                "message"=>"Resource is now public. +{$points} points!",
                "points_awarded"=>$points,
                "resource_id"=>$rid,
                "new_points" => $newTotal
            ]);
        } catch (Throwable $e) {
            echo json_encode(["status"=>"error","message"=>$e->getMessage()]);
        }
        exit;
    }

    // Share a recording → copy into public resources (explicit only; never automatic)
    if ($action === 'share_recording') {
        if (!current_user_id()) { echo json_encode(["status"=>"error","message"=>"Not logged in"]); exit; }
        $uid = current_user_id();
        $rec_id = (int)($_POST['recording_id'] ?? 0);
        if (!$rec_id) { echo json_encode(["status"=>"error","message"=>"Missing recording ID"]); exit; }
        try {
            $r = $pdo->prepare("
              SELECT id,user_id,title,COALESCE(url,video_url) AS url,course,semester,
                     '' AS tags, description, COALESCE(author,user_name) AS author,
                     COALESCE(created_at, recorded_at) AS created_at
              FROM recordings WHERE id=? LIMIT 1
            ");
            $r->execute([$rec_id]);
            $rec = $r->fetch();
            if (!$rec) { echo json_encode(["status"=>"error","message"=>"Recording not found"]); exit; }
            if ((int)$rec['user_id'] !== $uid) { echo json_encode(["status"=>"error","message"=>"You can only share your own recording"]); exit; }

            $author = trim($rec['author'] ?? '');
            if ($author !== "Anonymous") {
                $u = $pdo->prepare("SELECT username FROM users WHERE id=?");
                $u->execute([$uid]);
                $rn = $u->fetchColumn();
                if ($rn) $author = $rn;
            }
            if ($author === "") $author = "Unknown";

            $ins = $pdo->prepare("
              INSERT INTO resources
                (user_id,title,kind,course,semester,tags,description,author,src_type,url,
                 cloudinary_public_id,cloudinary_resource_type,cloudinary_version,cloudinary_bytes,
                 votes,bookmarks,flagged,visibility,shared_from_recording_id,shared_at,created_at,updated_at)
              VALUES
                (:user_id,:title,'recording',:course,:semester,:tags,:description,:author,'file',:url,
                 NULL,NULL,NULL,NULL,
                  0,0,false,'public',:rec_id,NOW(),NOW(),NOW())
            ");
            $ins->execute([
                ":user_id"=>$uid, ":title"=>$rec['title'] ?: 'Recording',
                ":course"=>$rec['course'] ?: '', ":semester"=>$rec['semester'] ?: '',
                ":tags"=>$rec['tags'] ?: '', ":description"=>$rec['description'] ?: '',
                ":author"=>$author, ":url"=>$rec['url'] ?: '', ":rec_id"=>$rec['id'],
            ]);
            $rid = (int)$pdo->lastInsertId();
            $points = 25; 
            $newTotal = awardPoints($pdo, $uid, $points, 'recording_share', $rid, "Shared a recording");
            
            // Proactive Notification
            $course = $rec['course'] ?: '';
            if ($course) {
                $notifStmt = $pdo->prepare("
                    SELECT DISTINCT u.student_id FROM users u
                    WHERE u.id <> ? AND (
                        u.id IN (SELECT user_id FROM resources WHERE course = ?)
                        OR u.id IN (SELECT user_id FROM meeting_participants WHERE meeting_id IN (SELECT id FROM meetings WHERE course = ?))
                    ) LIMIT 30
                ");
                $notifStmt->execute([$uid, $course, $course]);
                $targets = $notifStmt->fetchAll(PDO::FETCH_COLUMN);
                if ($targets) {
                    $n_title = "🎬 New Recording for {$course}";
                    $n_msg = "A session recording \"{$rec['title']}\" is now available!";
                    $n_link = "/resources";
                    $n_ins = $pdo->prepare("INSERT INTO notifications (student_id, title, message, link, type, reference_id) VALUES (?, ?, ?, ?, 'resource_alert', ?)");
                    foreach ($targets as $target_sid) { $n_ins->execute([$target_sid, $n_title, $n_msg, $n_link, $rid]); }
                }
            }

            echo json_encode([
                "status"=>"success",
                "message"=>"Recording shared. +{$points} points!",
                "points_awarded"=>$points,
                "resource_id"=>$rid,
                "new_points" => $newTotal
            ]);
        } catch (Throwable $e) {
            echo json_encode(["status"=>"error","message"=>$e->getMessage()]);
        }
        exit;
    }

    // Share a note -> copy into public resources
    if ($action === 'share_note') {
        if (!current_user_id()) { echo json_encode(["status"=>"error","message"=>"Not logged in"]); exit; }
        $uid = current_user_id();
        $note_id = (int)($_POST['note_id'] ?? 0);
        if (!$note_id) { echo json_encode(["status"=>"error","message"=>"Missing note ID"]); exit; }
        try {
            $r = $pdo->prepare("SELECT * FROM notes WHERE id=? LIMIT 1");
            $r->execute([$note_id]);
            $note = $r->fetch();
            if (!$note) { echo json_encode(["status"=>"error","message"=>"Note not found"]); exit; }
            if ((int)$note['user_id'] !== $uid) { echo json_encode(["status"=>"error","message"=>"You can only share your own note"]); exit; }

            // Check if already shared
            $check = $pdo->prepare("SELECT id FROM resources WHERE user_id=? AND title=? AND course=? AND kind='note' LIMIT 1");
            $check->execute([$uid, $note['title'], $note['course']]);
            if ($check->fetch()) {
                echo json_encode(["status"=>"success","message"=>"Already shared","points_awarded"=>0]); exit;
            }

            $ins = $pdo->prepare("
              INSERT INTO resources
                (user_id,title,kind,course,semester,tags,description,author,src_type,url,
                 votes,bookmarks,flagged,visibility,shared_at,created_at,updated_at)
              VALUES
                (:user_id,:title,'note',:course,:semester,:tags,:description,:author,'file',:url,
                 0,0,false,'public',NOW(),NOW(),NOW())
            ");
            
            $author = "Unknown";
            $u = $pdo->prepare("SELECT username FROM users WHERE id=?");
            $u->execute([$uid]);
            $un = $u->fetchColumn();
            if ($un) $author = $un;

            $ins->execute([
                ":user_id"=>$uid, ":title"=>$note['title'] ?: 'Note',
                ":course"=>$note['course'] ?: '', ":semester"=>$note['semester'] ?: '',
                ":tags"=>$note['tags'] ?: '', ":description"=>$note['description'] ?: '',
                ":author"=>$author, ":url"=>$note['file_url'] ?: '',
            ]);
            $rid = (int)$pdo->lastInsertId();
            $points = 15; 
            $newTotal = awardPoints($pdo, $uid, $points, 'note_share', $rid, "Shared a note");

            echo json_encode([
                "status"=>"success",
                "message"=>"Note shared. +{$points} points!",
                "points_awarded"=>$points,
                "resource_id"=>$rid,
                "new_points" => $newTotal
            ]);
        } catch (Throwable $e) {
            echo json_encode(["status"=>"error","message"=>$e->getMessage()]);
        }
        exit;
    }

    // Create resource (file→Cloudinary or external link). Default visibility='private'.
    try {
        $data = $_POST ?: json_decode(file_get_contents("php://input"), true) ?: [];
        if (empty($data['title']) || empty($data['course']) || empty($data['semester'])) {
            echo json_encode(["status"=>"error","message"=>"Missing required fields"]); exit;
        }

        $uid = current_user_id();
        $author = trim($data['author'] ?? '');
        if ($author !== "Anonymous" && $uid) {
            $s = $pdo->prepare("SELECT username FROM users WHERE id=?");
            $s->execute([$uid]);
            $rn = $s->fetchColumn();
            if ($rn) $author = $rn;
        }
        if ($author === "") $author = "Unknown";

        $visibility = in_array(($data['visibility'] ?? 'private'), ['public','private'], true) ? $data['visibility'] : 'private';
        $kind     = $data['kind'] ?? 'other';
        $course   = $data['course'];
        $semester = $data['semester'];
        $tags     = $data['tags'] ?? '';
        $desc     = $data['description'] ?? '';

        $src_type = $data['src_type'] ?? (isset($_FILES['file']) ? 'file' : 'link');
        $url      = trim($data['url'] ?? '');

        $c_public_id = $c_type = $c_version = $c_bytes = null;

        if ($src_type === 'file') {
            if (!isset($_FILES['file']) || ($_FILES['file']['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
                echo json_encode(["status"=>"error","message"=>"File upload error"]); exit;
            }
            // Validate Cloudinary config
            $c_config = get_cloudinary_config();
            if (!$c_config['cloud_name'] || !$c_config['upload_preset']) {
                echo json_encode(["status"=>"error","message"=>"Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME and CLOUDINARY_UPLOAD_PRESET (unsigned)."]); exit;
            }
            // Upload
            $tmp  = $_FILES['file']['tmp_name'];
            $name = $_FILES['file']['name'];
            $uploaded    = cloudinary_upload_file($tmp, $name);
            $url         = $uploaded['secure_url'];
            $c_public_id = $uploaded['public_id'];
            $c_type      = $uploaded['resource_type'];
            $c_version   = $uploaded['version'];
            $c_bytes     = $uploaded['bytes'];
            $src_type    = 'file';
        } else {
            if ($url === '') { echo json_encode(["status"=>"error","message"=>"Missing link URL"]); exit; }
        }

        $stmt = $pdo->prepare("
          INSERT INTO resources
            (user_id,title,kind,course,semester,tags,description,author,
             src_type,url,
             cloudinary_public_id,cloudinary_resource_type,cloudinary_version,cloudinary_bytes,
             votes,bookmarks,flagged,visibility,created_at,updated_at)
          VALUES
            (:user_id,:title,:kind,:course,:semester,:tags,:description,:author,
             :src_type,:url,
             :c_pid,:c_type,:c_ver,:c_bytes,
             0,0,false,:visibility,NOW(),NOW())
        ");
        $stmt->execute([
            ":user_id"=>$uid, ":title"=>$data['title'], ":kind"=>$kind, ":course"=>$course, ":semester"=>$semester,
            ":tags"=>$tags, ":description"=>$desc, ":author"=>$author,
            ":src_type"=>$src_type, ":url"=>$url,
            ":c_pid"=>$c_public_id, ":c_type"=>$c_type, ":c_ver"=>$c_version, ":c_bytes"=>$c_bytes,
            ":visibility"=>$visibility,
        ]);
        $rid = (int)$pdo->lastInsertId();

        if ($uid) {
            $points = ($visibility === 'public') ? 25 : 10;
            $newTotal = awardPoints($pdo, $uid, $points, 'resource_upload', $rid, "Uploaded resource: ".$data['title']);

            // If public, notify peers
            if ($visibility === 'public' && !empty($course)) {
                $notifStmt = $pdo->prepare("
                    SELECT DISTINCT u.student_id FROM users u
                    WHERE u.id <> ? AND (
                        u.id IN (SELECT user_id FROM resources WHERE course = ?)
                        OR u.id IN (SELECT user_id FROM meeting_participants WHERE meeting_id IN (SELECT id FROM meetings WHERE course = ?))
                    ) LIMIT 30
                ");
                $notifStmt->execute([$uid, $course, $course]);
                $targets = $notifStmt->fetchAll(PDO::FETCH_COLUMN);
                if ($targets) {
                    $n_title = "🆕 New Resource: {$course}";
                    $n_msg = "A new \"{$kind}\" was uploaded: \"{$data['title']}\"";
                    $n_link = "/resources";
                    $n_ins = $pdo->prepare("INSERT INTO notifications (student_id, title, message, link, type, reference_id) VALUES (?, ?, ?, ?, 'resource_alert', ?)");
                    foreach ($targets as $target_sid) { $n_ins->execute([$target_sid, $n_title, $n_msg, $n_link, $rid]); }
                }
            }

            echo json_encode([
                "status"=>"success",
                "message"=>"Resource added successfully. +{$points} points!",
                "points_awarded"=>$points,
                "resource_id"=>$rid,
                "new_points" => $newTotal
            ]); exit;
        }
        echo json_encode(["status"=>"success","message"=>"Resource added successfully.","resource_id"=>$rid]);
    } catch (Throwable $e) {
        echo json_encode(["status"=>"error","message"=>$e->getMessage()]);
    }
    exit;
}

///////////////////////
// PUT — Update row  //
///////////////////////
if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    try {
        $data = json_decode(file_get_contents("php://input"), true);
        $id   = $data['id'] ?? null;
        if (!$id) { echo json_encode(["status"=>"error","message"=>"Missing resource ID"]); exit; }
        $fields = []; $params = [":id"=>$id];
        foreach (['votes','bookmarks','flagged'] as $col) {
            if (isset($data[$col])) { $fields[]="$col = :$col"; $params[":$col"]=(int)$data[$col]; }
        }
        if (!$fields) { echo json_encode(["status"=>"error","message"=>"No valid update fields"]); exit; }
        $sql = "UPDATE resources SET ".implode(', ', $fields).", updated_at=NOW() WHERE id=:id";
        $pdo->prepare($sql)->execute($params);
        echo json_encode(["status"=>"success","message"=>"Resource updated"]);
    } catch (Throwable $e) {
        echo json_encode(["status"=>"error","message"=>$e->getMessage()]);
    }
    exit;
}

///////////////////////////////
// Fallback (invalid method) //
///////////////////////////////
echo json_encode(["status"=>"error","message"=>"Invalid request method"]);
exit;
