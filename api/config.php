<?php
/**
 * MIRA E-Commerce Backend
 * Database Configuration
 * FIX #1: SMTP corretto | FIX #2: JWT verify compatibile Nginx
 */

// Configurazione Database
define('DB_HOST', 'localhost');
define('DB_NAME', 'mira_ecommerce');
define('DB_USER', 'root');
define('DB_PASS', '');

// Configurazione Email — FIX #1: valori SMTP corretti
define('SMTP_HOST', 'smtp.gmail.com');
define('SMTP_PORT', 587);
define('SMTP_USER', 'preventivimira1@gmail.com');
define('SMTP_PASS', 'utss tfvy ecbm bpzh'); // App Password Gmail

// Configurazione Generale
define('SITE_URL', 'http://localhost');
define('API_URL', SITE_URL . '/mira_ecommerce/api');
define('UPLOAD_DIR', __DIR__ . '/uploads/');
define('MAX_UPLOAD_SIZE', 5 * 1024 * 1024); // 5MB

// Timezone
date_default_timezone_set('Europe/Rome');

// CORS Headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=UTF-8');

// Gestisci preflight OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

/**
 * Database Connection Class
 */
class Database {
    private static $instance = null;
    private $connection;

    private function __construct() {
        try {
            $this->connection = new PDO(
                "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
                DB_USER,
                DB_PASS,
                [
                    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES   => false
                ]
            );
        } catch (PDOException $e) {
            error_log("Database connection error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['error' => 'Database connection failed']);
            exit;
        }
    }

    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public function getConnection() {
        return $this->connection;
    }

    private function __clone() {}

    public function __wakeup() {
        throw new Exception("Cannot unserialize singleton");
    }
}

/**
 * Response Helper
 */
class Response {
    public static function success($data = [], $message = '', $code = 200) {
        http_response_code($code);
        echo json_encode([
            'success' => true,
            'message' => $message,
            'data'    => $data
        ]);
        exit;
    }

    public static function error($message, $code = 400, $errors = []) {
        http_response_code($code);
        echo json_encode([
            'success' => false,
            'message' => $message,
            'errors'  => $errors
        ]);
        exit;
    }
}

/**
 * JWT Token Helper
 * FIX #2: verify() ora legge il token anche da $_SERVER per compatibilità Nginx
 */
class JWT {
    // FIX: usa una chiave sicura, non il placeholder di default
    private static $secret = 'mira_JWT_s3cr3t_K3y_2025_CHANGE_ME_IN_PROD!';

    public static function encode($payload) {
        $header  = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
        $payload = json_encode($payload);

        $base64UrlHeader  = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
        $base64UrlPayload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($payload));

        $signature          = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, self::$secret, true);
        $base64UrlSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));

        return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
    }

    public static function decode($token) {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return null;
        }

        list($base64UrlHeader, $base64UrlPayload, $base64UrlSignature) = $parts;

        $signature              = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, self::$secret, true);
        $base64UrlSignatureCheck = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));

        if (!hash_equals($base64UrlSignature, $base64UrlSignatureCheck)) {
            return null;
        }

        $payload = base64_decode(str_replace(['-', '_'], ['+', '/'], $base64UrlPayload));
        $decoded = json_decode($payload, true);

        // Verifica scadenza token
        if (isset($decoded['exp']) && $decoded['exp'] < time()) {
            return null;
        }

        return $decoded;
    }

    /**
     * FIX #2: Legge Authorization sia da getallheaders() (Apache) che da
     * $_SERVER['HTTP_AUTHORIZATION'] (Nginx / FastCGI) per piena compatibilità.
     */
    public static function verify() {
        $token = null;

        // Tentativo 1: getallheaders() — funziona su Apache
        if (function_exists('getallheaders')) {
            $headers = getallheaders();
            // Cerca header case-insensitive
            foreach ($headers as $key => $value) {
                if (strtolower($key) === 'authorization') {
                    $token = str_replace('Bearer ', '', $value);
                    break;
                }
            }
        }

        // Tentativo 2: $_SERVER — funziona su Nginx e FastCGI
        if (!$token && isset($_SERVER['HTTP_AUTHORIZATION'])) {
            $token = str_replace('Bearer ', '', $_SERVER['HTTP_AUTHORIZATION']);
        }

        // Tentativo 3: REDIRECT_HTTP_AUTHORIZATION (alcuni setup Apache mod_rewrite)
        if (!$token && isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
            $token = str_replace('Bearer ', '', $_SERVER['REDIRECT_HTTP_AUTHORIZATION']);
        }

        if (!$token) {
            Response::error('Token mancante', 401);
        }

        $payload = self::decode($token);
        if (!$payload) {
            Response::error('Token non valido o scaduto', 401);
        }

        return $payload;
    }
}

/**
 * Validation Helper
 */
class Validator {
    public static function required($value, $fieldName) {
        if (empty($value) && $value !== '0') {
            return "$fieldName è obbligatorio";
        }
        return null;
    }

    public static function email($value) {
        if (!filter_var($value, FILTER_VALIDATE_EMAIL)) {
            return "Email non valida";
        }
        return null;
    }

    public static function minLength($value, $length, $fieldName) {
        if (mb_strlen($value) < $length) {
            return "$fieldName deve essere almeno $length caratteri";
        }
        return null;
    }

    public static function maxLength($value, $length, $fieldName) {
        if (mb_strlen($value) > $length) {
            return "$fieldName deve essere massimo $length caratteri";
        }
        return null;
    }

    public static function numeric($value, $fieldName) {
        if (!is_numeric($value)) {
            return "$fieldName deve essere un numero";
        }
        return null;
    }
}
// Fine del file config.php
?>