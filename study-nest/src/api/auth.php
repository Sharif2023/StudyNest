<?php
/**
 * StudyNest JWT Auth Middleware
 * Session always works; JWT works when firebase/php-jwt is installed (composer).
 */

$studyNestJwtPaths = [
    __DIR__ . '/../../vendor/autoload.php',
    __DIR__ . '/../../../vendor/autoload.php',
];
$STUDYNEST_JWT_AVAILABLE = false;
foreach ($studyNestJwtPaths as $autoload) {
    if (is_file($autoload)) {
        require_once $autoload;
        if (class_exists(\Firebase\JWT\JWT::class) && class_exists(\Firebase\JWT\Key::class)) {
            $STUDYNEST_JWT_AVAILABLE = true;
        }
        break;
    }
}

class StudyNestAuth {
    private static $secret;
    private static $algo = 'HS256';

    public static function init($secret = null) {
        self::$secret = $secret ?: $_ENV['JWT_SECRET'] ?? 'default_secret_change_me';
    }

    /**
     * Validate JWT token or Session and return user_id
     */
    public static function validate($scopes = [], $required = true) {
        global $STUDYNEST_JWT_AVAILABLE;

        $user_id = null;
        $decoded = null;

        if ($STUDYNEST_JWT_AVAILABLE) {
            $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';

            if (empty($authHeader) && function_exists('getallheaders')) {
                $headers = getallheaders();
                $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
            }

            if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
                $token = $matches[1];
                try {
                    $decoded = \Firebase\JWT\JWT::decode($token, new \Firebase\JWT\Key(self::$secret, self::$algo));
                    $user_id = $decoded->user_id ?? $decoded->sub ?? null;
                } catch (Exception $e) {
                    if ($required) {
                        http_response_code(401);
                        self::json(['ok' => false, 'error' => 'INVALID_TOKEN', 'code' => 'INVALID_TOKEN']);
                    }
                }
            }
        }

        if (!$user_id && isset($_SESSION['user_id'])) {
            $user_id = $_SESSION['user_id'];
            
            // If session belongs to an admin, set decoded scopes manually for compatibility
            if (strtolower($_SESSION['role'] ?? '') === 'admin') {
                $decoded = (object)['scopes' => ['admin', 'user']];
            }
        }

        if (!$user_id) {
            if ($required) {
                http_response_code(401);
                self::json(['ok' => false, 'error' => 'UNAUTHORIZED', 'code' => 'UNAUTHORIZED']);
            }
            return null;
        }

        // Standardized scope/role check: prioritize scopes, then role, then fallback to 'user'
        $rawScopes = $decoded->scopes ?? [($decoded->role ?? ($_SESSION['role'] ?? 'user'))];
        $userScopes = array_map('strtolower', (array) $rawScopes);
        $scopes = array_map('strtolower', (array) $scopes);
        if ($scopes && !array_intersect($scopes, $userScopes)) {
            if ($required) {
                http_response_code(403);
                self::json(['ok' => false, 'error' => 'FORBIDDEN', 'code' => 'INSUFFICIENT_SCOPE']);
            }
            return null;
        }

        $_REQUEST['auth_user_id'] = $user_id;
        return $user_id;
    }

    /**
     * Generate JWT token (requires composer package firebase/php-jwt)
     */
    public static function generate($user_id, $scopes = ['user'], $expire = 604800) {
        global $STUDYNEST_JWT_AVAILABLE;
        if (!$STUDYNEST_JWT_AVAILABLE) {
            throw new RuntimeException('JWT not available: run composer require firebase/php-jwt in study-nest');
        }
        $payload = [
            'iss' => 'studynest-api',
            'aud' => 'studynest-frontend',
            'iat' => time(),
            'exp' => time() + $expire,
            'sub' => $user_id,
            'scopes' => $scopes,
        ];

        return \Firebase\JWT\JWT::encode($payload, self::$secret, self::$algo);
    }

    private static function json($data) {
        // Ensure frontend gets a 'status' and 'message' field for consistent error handling
        if (!isset($data['status'])) {
            $data['status'] = ($data['ok'] ?? false) ? 'success' : 'error';
        }
        if (!isset($data['message']) && isset($data['error'])) {
            $data['message'] = $data['error'];
        }
        echo json_encode($data, JSON_UNESCAPED_SLASHES);
        exit;
    }
}

StudyNestAuth::init();

function requireAuth($scopes = ['user']) {
    return StudyNestAuth::validate($scopes);
}

function generateToken($user_id, $scopes = ['user']) {
    return StudyNestAuth::generate($user_id, $scopes);
}
