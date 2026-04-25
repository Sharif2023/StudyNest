<?php
/**
 * StudyNest JWT Auth Middleware
 * Session always works; JWT works when firebase/php-jwt is installed (composer).
 */

// Suppress visible errors in API responses
ini_set('display_errors', '0');
error_reporting(E_ALL & ~E_NOTICE & ~E_STRICT & ~E_DEPRECATED);

$studyNestJwtPaths = [
    __DIR__ . '/../../vendor/autoload.php',
    __DIR__ . '/../../../vendor/autoload.php',
];
$STUDYNEST_JWT_AVAILABLE = false;
foreach ($studyNestJwtPaths as $autoload) {
    if (is_file($autoload)) {
        require_once $autoload;
        if (class_exists(\Firebase\JWT\JWT::class)) {
            $STUDYNEST_JWT_AVAILABLE = true;
        }
        break;
    }
}

/**
 * Native minimal JWT implementation as fallback if Firebase JWT is missing.
 */
class StudyNestInternalJWT {
    public static function decode($token, $secret) {
        $parts = explode('.', $token);
        if (count($parts) !== 3) return null;
        list($headb64, $bodyb64, $sigb64) = $parts;
        $sig = self::base64UrlDecode($sigb64);
        if (hash_hmac('sha256', "$headb64.$bodyb64", $secret, true) !== $sig) return null;
        $payload = json_decode(self::base64UrlDecode($bodyb64));
        if (isset($payload->exp) && $payload->exp < time()) return null;
        return $payload;
    }
    public static function encode($payload, $secret) {
        $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
        $segments = [self::base64UrlEncode($header), self::base64UrlEncode(json_encode($payload))];
        $signing_input = implode('.', $segments);
        $signature = hash_hmac('sha256', $signing_input, $secret, true);
        $segments[] = self::base64UrlEncode($signature);
        return implode('.', $segments);
    }
    private static function base64UrlEncode($data) { return str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($data)); }
    private static function base64UrlDecode($data) { return base64_decode(str_replace(['-', '_'], ['+', '/'], $data)); }
}

class StudyNestAuth {
    private static $secret;
    private static $algo = 'HS256';

    public static function init($secret = null) {
        self::$secret = $secret ?: ($_ENV['JWT_SECRET'] ?? getenv('JWT_SECRET') ?: null);
    }

    /**
     * Validate JWT token or Session and return user_id
     */
    public static function validate($scopes = [], $required = true) {
        global $STUDYNEST_JWT_AVAILABLE;

        $user_id = null;
        $decoded = null;

        $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';

        if (empty($authHeader) && function_exists('getallheaders')) {
            $headers = getallheaders();
            $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        }

        if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
            $token = $matches[1];
            try {
                if (!self::$secret) {
                    throw new Exception('JWT secret is not configured');
                }
                if ($STUDYNEST_JWT_AVAILABLE) {
                    if (class_exists('\Firebase\JWT\Key')) {
                        $decoded = \Firebase\JWT\JWT::decode($token, new \Firebase\JWT\Key(self::$secret, self::$algo));
                    } else {
                        $decoded = \Firebase\JWT\JWT::decode($token, self::$secret, [self::$algo]);
                    }
                } else {
                    $decoded = StudyNestInternalJWT::decode($token, self::$secret);
                }
                $user_id = $decoded->user_id ?? $decoded->sub ?? null;
            } catch (Exception $e) {
                if ($required) {
                    http_response_code(401);
                    self::json(['ok' => false, 'error' => 'INVALID_TOKEN', 'message' => $e->getMessage()]);
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
        if (!self::$secret) {
            throw new RuntimeException('JWT secret is not configured');
        }
        $payload = [
            'iss' => 'studynest-api',
            'aud' => 'studynest-frontend',
            'iat' => time(),
            'exp' => time() + $expire,
            'sub' => $user_id,
            'scopes' => $scopes,
        ];

        if ($STUDYNEST_JWT_AVAILABLE) {
            return \Firebase\JWT\JWT::encode($payload, self::$secret, self::$algo);
        } else {
            return StudyNestInternalJWT::encode($payload, self::$secret);
        }
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

function current_user_id($scopes = ['user']) {
    return StudyNestAuth::validate($scopes, false);
}

function generateToken($user_id, $scopes = ['user']) {
    return StudyNestAuth::generate($user_id, $scopes);
}
