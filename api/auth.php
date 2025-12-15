<?php
/**
 * MIRA E-Commerce API
 * Authentication Endpoint - api/auth.php
 * CON INVIO EMAIL BENVENUTO ✅
 */

require_once 'config.php';
require_once 'email_helper.php'; // ✅ AGGIUNTO

$db = Database::getInstance()->getConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'POST') {
    Response::error('Solo richieste POST sono permesse', 405);
}

$data = json_decode(file_get_contents('php://input'), true);

if (!$data) {
    Response::error('Dati JSON non validi', 400);
}

$action = $data['action'] ?? '';

switch ($action) {
    case 'register':
        registerUser($db, $data);
        break;
    
    case 'login':
        loginUser($db, $data);
        break;
    
    case 'verify':
        verifyToken();
        break;
    
    case 'logout':
        Response::success(null, 'Logout effettuato con successo');
        break;
    
    default:
        Response::error('Action non valida. Usa: register, login, verify, logout', 400);
}

/**
 * Register new user
 */
function registerUser($db, $data) {
    // Validazione campi
    $errors = [];
    
    if ($error = Validator::required($data['email'] ?? '', 'Email')) {
        $errors[] = $error;
    }
    if ($error = Validator::email($data['email'] ?? '')) {
        $errors[] = $error;
    }
    if ($error = Validator::required($data['password'] ?? '', 'Password')) {
        $errors[] = $error;
    }
    if ($error = Validator::minLength($data['password'] ?? '', 6, 'Password')) {
        $errors[] = $error;
    }
    if ($error = Validator::required($data['first_name'] ?? '', 'Nome')) {
        $errors[] = $error;
    }
    if ($error = Validator::required($data['last_name'] ?? '', 'Cognome')) {
        $errors[] = $error;
    }
    
    if (!empty($errors)) {
        Response::error('Validazione fallita', 400, $errors);
    }
    
    // Verifica se email già registrata
    try {
        $checkStmt = $db->prepare("SELECT id FROM users WHERE email = ?");
        $checkStmt->execute([$data['email']]);
        
        if ($checkStmt->fetch()) {
            Response::error('Email già registrata', 400);
        }
        
        // Hash password
        $hashedPassword = password_hash($data['password'], PASSWORD_DEFAULT);
        
        // Inserisci utente
        $sql = "INSERT INTO users (email, password, first_name, last_name, phone, is_admin)
                VALUES (?, ?, ?, ?, ?, ?)";
        
        $stmt = $db->prepare($sql);
        $stmt->execute([
            $data['email'],
            $hashedPassword,
            $data['first_name'],
            $data['last_name'],
            $data['phone'] ?? null,
            0
        ]);
        
        $userId = $db->lastInsertId();
        
        // Genera JWT token
        $token = JWT::encode([
            'id' => $userId,
            'email' => $data['email'],
            'is_admin' => false,
            'exp' => time() + (86400 * 30) // 30 giorni
        ]);
        
        // Crea carrello per nuovo utente
        $db->prepare("INSERT INTO carts (user_id) VALUES (?)")->execute([$userId]);
        
        // ✅ INVIA EMAIL DI BENVENUTO
        try {
            $fullName = $data['first_name'] . ' ' . $data['last_name'];
            $emailSent = EmailHelper::sendWelcomeEmail($data['email'], $fullName);
            
            if ($emailSent) {
                error_log("✅ Email benvenuto inviata a: {$data['email']}");
            } else {
                error_log("⚠️ Email benvenuto non inviata (non critico)");
            }
        } catch (Exception $e) {
            // Non bloccare la registrazione se l'email fallisce
            error_log("⚠️ Errore invio email benvenuto: " . $e->getMessage());
        }
        
        Response::success([
            'token' => $token,
            'user' => [
                'id' => $userId,
                'email' => $data['email'],
                'first_name' => $data['first_name'],
                'last_name' => $data['last_name'],
                'is_admin' => false
            ]
        ], 'Registrazione completata con successo', 201);
        
    } catch (PDOException $e) {
        error_log("Registration error: " . $e->getMessage());
        Response::error('Errore durante la registrazione', 500);
    }
}

/**
 * Login user
 */
function loginUser($db, $data) {
    // Validazione
    $errors = [];
    
    if ($error = Validator::required($data['email'] ?? '', 'Email')) {
        $errors[] = $error;
    }
    if ($error = Validator::required($data['password'] ?? '', 'Password')) {
        $errors[] = $error;
    }
    
    if (!empty($errors)) {
        Response::error('Validazione fallita', 400, $errors);
    }
    
    try {
        // Trova utente
        $stmt = $db->prepare("SELECT * FROM users WHERE email = ?");
        $stmt->execute([$data['email']]);
        $user = $stmt->fetch();
        
        // Verifica password
        if (!$user || !password_verify($data['password'], $user['password'])) {
            Response::error('Email o password non validi', 401);
        }
        
        // Genera JWT token
        $token = JWT::encode([
            'id' => $user['id'],
            'email' => $user['email'],
            'is_admin' => (bool)$user['is_admin'],
            'exp' => time() + (86400 * 30)
        ]);
        
        // Verifica/crea carrello
        $cartCheck = $db->prepare("SELECT id FROM carts WHERE user_id = ?");
        $cartCheck->execute([$user['id']]);
        
        if (!$cartCheck->fetch()) {
            $db->prepare("INSERT INTO carts (user_id) VALUES (?)")->execute([$user['id']]);
        }
        
        Response::success([
            'token' => $token,
            'user' => [
                'id' => $user['id'],
                'email' => $user['email'],
                'first_name' => $user['first_name'],
                'last_name' => $user['last_name'],
                'phone' => $user['phone'],
                'is_admin' => (bool)$user['is_admin']
            ]
        ], 'Login effettuato con successo');
        
    } catch (PDOException $e) {
        error_log("Login error: " . $e->getMessage());
        Response::error('Errore durante il login', 500);
    }
}

/**
 * Verify token validity
 */
function verifyToken() {
    $user = JWT::verify();
    
    Response::success([
        'user' => $user,
        'valid' => true
    ], 'Token valido');
}
?>