<?php
/**
 * MIRA E-Commerce API
 * Contact Form Endpoint - api/contact.php
 * FIX #6: aggiunto minLength(10) sul messaggio lato backend
 */

require_once 'config.php';
require_once 'email_helper.php';

$db     = Database::getInstance()->getConnection();
$method = $_SERVER['REQUEST_METHOD'];

$user = JWT::verify();

if ($method !== 'POST') {
    Response::error('Solo richieste POST sono permesse', 405);
}

$data = json_decode(file_get_contents('php://input'), true);

if (!$data) {
    Response::error('Dati JSON non validi', 400);
}

$errors = [];
if ($error = Validator::required($data['first_name'] ?? '', 'Nome'))     $errors[] = $error;
if ($error = Validator::required($data['last_name']  ?? '', 'Cognome'))  $errors[] = $error;
if ($error = Validator::required($data['email']      ?? '', 'Email'))    $errors[] = $error;
if ($error = Validator::email($data['email']         ?? ''))             $errors[] = $error;
if ($error = Validator::required($data['message']    ?? '', 'Messaggio')) $errors[] = $error;
// FIX #6: validazione minLength coerente con il frontend (contact.js controlla >= 10)
if ($error = Validator::minLength($data['message']   ?? '', 10, 'Messaggio')) $errors[] = $error;

if (!empty($errors)) {
    Response::error('Validazione fallita', 400, $errors);
}

try {
    $sql  = "INSERT INTO contact_messages (first_name, last_name, email, message, ip_address)
             VALUES (?, ?, ?, ?, ?)";
    $stmt = $db->prepare($sql);
    $stmt->execute([
        $data['first_name'],
        $data['last_name'],
        $data['email'],
        $data['message'],
        $_SERVER['REMOTE_ADDR'] ?? 'unknown'
    ]);

    $messageId = $db->lastInsertId();
    error_log("MIRA Contact: Messaggio #{$messageId} salvato nel database");

    $emailData = [
        'first_name' => $data['first_name'],
        'last_name'  => $data['last_name'],
        'email'      => $data['email'],
        'message'    => $data['message'],
        'ip'         => $_SERVER['REMOTE_ADDR'] ?? 'unknown'
    ];

    try {
        EmailHelper::sendContactNotification($emailData);
    } catch (Exception $e) {
        error_log("MIRA Contact: Errore notifica team — " . $e->getMessage());
    }

    try {
        EmailHelper::sendContactConfirmation($emailData);
    } catch (Exception $e) {
        error_log("MIRA Contact: Errore conferma mittente — " . $e->getMessage());
    }

    Response::success(
        ['message_id' => $messageId],
        'Messaggio inviato con successo! Ti risponderemo al più presto.'
    );

} catch (Exception $e) {
    error_log("Contact form error: " . $e->getMessage());
    Response::error('Errore nell\'invio del messaggio. Riprova più tardi.', 500);
}
?>