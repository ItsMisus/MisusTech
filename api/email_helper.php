<?php
/**
 * MIRA E-Commerce - Email Helper SISTEMATO
 * api/email_helper.php
 * Gestisce l'invio di email tramite PHPMailer
 */

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;
use PHPMailer\PHPMailer\SMTP;

// Carica PHPMailer
require_once __DIR__ . '/../vendor/autoload.php';

class EmailHelper {
    // ✅ CONFIGURAZIONE GMAIL APP PASSWORD
    private static $smtp_host = 'smtp.gmail.com';
    private static $smtp_port = 587;
    private static $smtp_user = 'preventivimira1@gmail.com';
    private static $smtp_pass = 'utss tfvy ecbm bpzh'; // ✅ App Password corretta
    private static $from_email = 'preventivimira1@gmail.com';
    private static $from_name = 'MIRA E-Commerce';
    
    /**
     * Configurazione base PHPMailer
     */
    private static function getMailer() {
        $mail = new PHPMailer(true);
        
        try {
            // Server settings
            $mail->isSMTP();
            $mail->Host = self::$smtp_host;
            $mail->SMTPAuth = true;
            $mail->Username = self::$smtp_user;
            $mail->Password = self::$smtp_pass;
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            $mail->Port = self::$smtp_port;
            $mail->CharSet = 'UTF-8';
            
            // ✅ Debug mode (commentare in produzione)
            // $mail->SMTPDebug = SMTP::DEBUG_SERVER;
            // $mail->Debugoutput = function($str, $level) {
            //     error_log("SMTP Debug level $level: $str");
            // };
            
            // Timeout settings
            $mail->Timeout = 30;
            $mail->SMTPKeepAlive = false;
            
            return $mail;
            
        } catch (Exception $e) {
            error_log("PHPMailer setup error: " . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * ✅ Invia email di benvenuto al nuovo utente
     */
    public static function sendWelcomeEmail($userEmail, $userName) {
        try {
            $mail = self::getMailer();
            
            // Mittente
            $mail->setFrom(self::$from_email, self::$from_name);
            
            // Destinatario
            $mail->addAddress($userEmail, $userName);
            
            // Contenuto
            $mail->isHTML(true);
            $mail->Subject = 'Benvenuto in MIRA - Account Attivato';
            
            $siteUrl = defined('SITE_URL') ? SITE_URL : 'http://localhost';
            
            $mail->Body = self::getWelcomeEmailHTML($userName, $siteUrl);
            $mail->AltBody = self::getWelcomeEmailText($userName, $siteUrl);
            
            $result = $mail->send();
            
            if ($result) {
                error_log("✅ Welcome email inviata a: $userEmail");
            }
            
            return $result;
            
        } catch (Exception $e) {
            error_log("❌ Welcome email error: " . $e->getMessage());
            error_log("PHPMailer Error Info: " . $mail->ErrorInfo);
            return false;
        }
    }
    
    /**
     * ✅ Invia notifica al team MIRA per nuovo messaggio contatti
     */
    public static function sendContactNotification($contactData) {
        try {
            $mail = self::getMailer();
            
            // Mittente
            $mail->setFrom(self::$from_email, self::$from_name);
            $mail->addReplyTo($contactData['email'], $contactData['first_name'] . ' ' . $contactData['last_name']);
            
            // Destinatario (team MIRA)
            $mail->addAddress(self::$from_email, 'Team MIRA');
            
            // Contenuto
            $mail->isHTML(true);
            $mail->Subject = "[MIRA] Nuovo messaggio da {$contactData['first_name']} {$contactData['last_name']}";
            
            $mail->Body = self::getContactNotificationHTML($contactData);
            $mail->AltBody = self::getContactNotificationText($contactData);
            
            $result = $mail->send();
            
            if ($result) {
                error_log("✅ Contact notification inviata al team");
            }
            
            return $result;
            
        } catch (Exception $e) {
            error_log("❌ Contact notification error: " . $e->getMessage());
            error_log("PHPMailer Error Info: " . $mail->ErrorInfo);
            return false;
        }
    }
    
    /**
     * ✅ Invia conferma al mittente del messaggio
     */
    public static function sendContactConfirmation($contactData) {
        try {
            $mail = self::getMailer();
            
            // Mittente
            $mail->setFrom(self::$from_email, self::$from_name);
            
            // Destinatario
            $mail->addAddress($contactData['email'], $contactData['first_name'] . ' ' . $contactData['last_name']);
            
            // Contenuto
            $mail->isHTML(true);
            $mail->Subject = 'Conferma Ricezione Messaggio - MIRA';
            
            $siteUrl = defined('SITE_URL') ? SITE_URL : 'http://localhost';
            
            $mail->Body = self::getContactConfirmationHTML($contactData, $siteUrl);
            $mail->AltBody = self::getContactConfirmationText($contactData, $siteUrl);
            
            $result = $mail->send();
            
            if ($result) {
                error_log("✅ Contact confirmation inviata a: " . $contactData['email']);
            }
            
            return $result;
            
        } catch (Exception $e) {
            error_log("❌ Contact confirmation error: " . $e->getMessage());
            error_log("PHPMailer Error Info: " . $mail->ErrorInfo);
            return false;
        }
    }
    
    // ========================================
    // TEMPLATE HTML
    // ========================================
    
    private static function getWelcomeEmailHTML($userName, $siteUrl) {
        return "
<!DOCTYPE html>
<html>
<head>
    <meta charset='UTF-8'>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%); color: #fff; padding: 40px 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 36px; letter-spacing: 3px; font-weight: 700; }
        .content { padding: 40px 30px; }
        .content h2 { color: #000; font-size: 24px; margin-bottom: 20px; font-weight: 600; }
        .content p { color: #555; margin-bottom: 15px; line-height: 1.8; }
        .benefits { background: #f9fafb; padding: 20px; border-radius: 6px; margin: 25px 0; border-left: 4px solid #9b59b6; }
        .benefits ul { margin: 10px 0; padding-left: 20px; }
        .benefits li { margin: 8px 0; color: #555; }
        .button { display: inline-block; padding: 16px 40px; background: #000; color: #fff; text-decoration: none; border-radius: 6px; margin: 25px 0; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
        .footer { background: #f9fafb; text-align: center; padding: 30px; color: #666; font-size: 13px; border-top: 1px solid #e5e7eb; }
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1>MIRA</h1>
        </div>
        <div class='content'>
            <h2>Benvenuto, {$userName}! </h2>
            <p><strong>Il tuo account è stato attivato con successo.</strong></p>
            <p>Grazie per esserti registrato su MIRA. Ora puoi accedere al tuo account per un'esperienza di acquisto veloce e personalizzata.</p>
            
            <div class='benefits'>
                <p><strong>Vantaggi del tuo account:</strong></p>
                <ul>
                    <li>✓ Gestione completa dei tuoi ordini</li>
                    <li>✓ Salvataggio indirizzi di spedizione</li>
                    <li>✓ Accesso anticipato a offerte esclusive</li>
                    <li>✓ Aggiornamenti sui nuovi prodotti</li>
                </ul>
            </div>
            
            <center>
                <a href='{$siteUrl}' class='button'>Visita il Negozio</a>
            </center>
            
            <p>Per qualsiasi domanda, non esitare a contattarci.</p>
            
            <p style='margin-top: 30px; color: #999; font-size: 13px;'>
                Cordiali saluti,<br>
                <strong>Team MIRA</strong>
            </p>
        </div>
        <div class='footer'>
            <p><strong>MIRA E-Commerce</strong></p>
            <p>PC Gaming di Alta Qualità</p>
            <p>© 2025 MIRA. Tutti i diritti riservati.</p>
        </div>
    </div>
</body>
</html>";
    }
    
    private static function getWelcomeEmailText($userName, $siteUrl) {
        return "Benvenuto, {$userName}!\n\n"
            . "Il tuo account MIRA è stato attivato con successo.\n\n"
            . "Vantaggi del tuo account:\n"
            . "- Gestione completa dei tuoi ordini\n"
            . "- Salvataggio indirizzi di spedizione\n"
            . "- Accesso anticipato a offerte esclusive\n"
            . "- Aggiornamenti sui nuovi prodotti\n\n"
            . "Visita il negozio: {$siteUrl}\n\n"
            . "Cordiali saluti,\nTeam MIRA";
    }
    
    private static function getContactNotificationHTML($contactData) {
        $date = date('d/m/Y H:i:s');
        
        return "
<!DOCTYPE html>
<html>
<head>
    <meta charset='UTF-8'>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%); color: #fff; padding: 30px; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
        .content { padding: 30px; }
        .info-section { background: #f9fafb; padding: 20px; border-radius: 6px; margin-bottom: 20px; }
        .info-row { margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
        .label { font-weight: 600; color: #666; display: inline-block; width: 80px; }
        .message-box { background: #fff; border-left: 4px solid #9b59b6; padding: 20px; margin: 20px 0; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .reply-info { background: #f0f9ff; padding: 15px; border-radius: 6px; margin-top: 20px; border-left: 4px solid #3b82f6; }
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1> Nuovo Messaggio - MIRA</h1>
        </div>
        <div class='content'>
            <div class='info-section'>
                <h3 style='margin-top: 0;'>Informazioni Mittente</h3>
                <div class='info-row'>
                    <span class='label'>Nome:</span>
                    {$contactData['first_name']} {$contactData['last_name']}
                </div>
                <div class='info-row'>
                    <span class='label'>Email:</span>
                    <a href='mailto:{$contactData['email']}'>{$contactData['email']}</a>
                </div>
                <div class='info-row'>
                    <span class='label'>Data:</span>
                    {$date}
                </div>
                <div class='info-row'>
                    <span class='label'>IP:</span>
                    {$contactData['ip']}
                </div>
            </div>
            
            <div class='message-box'>
                <h3>Messaggio</h3>
                " . nl2br(htmlspecialchars($contactData['message'])) . "
            </div>
            
            <div class='reply-info'>
                <strong>Per rispondere:</strong> Clicca \"Rispondi\" o invia email a 
                <a href='mailto:{$contactData['email']}'>{$contactData['email']}</a>
            </div>
        </div>
    </div>
</body>
</html>";
    }
    
    private static function getContactNotificationText($contactData) {
        $date = date('d/m/Y H:i:s');
        
        return "NUOVO MESSAGGIO DAL SITO MIRA\n\n"
            . "INFORMAZIONI MITTENTE:\n"
            . "Nome: {$contactData['first_name']} {$contactData['last_name']}\n"
            . "Email: {$contactData['email']}\n"
            . "Data: {$date}\n"
            . "IP: {$contactData['ip']}\n\n"
            . "MESSAGGIO:\n{$contactData['message']}\n\n"
            . "Per rispondere: {$contactData['email']}";
    }
    
    private static function getContactConfirmationHTML($contactData, $siteUrl) {
        return "
<!DOCTYPE html>
<html>
<head>
    <meta charset='UTF-8'>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%); color: #fff; padding: 40px 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 36px; letter-spacing: 3px; font-weight: 700; }
        .content { padding: 40px 30px; }
        .content h2 { color: #000; font-size: 22px; margin-bottom: 20px; font-weight: 600; }
        .content p { color: #555; margin-bottom: 15px; line-height: 1.8; }
        .message-box { background: #f9fafb; border-left: 4px solid #9b59b6; padding: 20px; margin: 25px 0; border-radius: 4px; }
        .contact-info { background: #f0f9ff; padding: 20px; border-radius: 6px; margin: 25px 0; }
        .contact-info ul { list-style: none; padding: 0; margin: 10px 0; }
        .contact-info li { margin: 8px 0; }
        .footer { background: #f9fafb; text-align: center; padding: 30px; color: #666; font-size: 13px; border-top: 1px solid #e5e7eb; }
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1>MIRA</h1>
        </div>
        <div class='content'>
            <h2>Messaggio Ricevuto</h2>
            <p>Gentile {$contactData['first_name']},</p>
            <p>Grazie per averci contattato. Confermiamo di aver ricevuto il tuo messaggio e ti risponderemo nel più breve tempo possibile.</p>
            
            <div class='message-box'>
                <p><strong>Il tuo messaggio:</strong></p>
                " . nl2br(htmlspecialchars($contactData['message'])) . "
            </div>
            
            <p>Ti risponderemo entro 24-48 ore all'indirizzo: <strong>{$contactData['email']}</strong></p>
            
            <div class='contact-info'>
                <p><strong>Per assistenza immediata:</strong></p>
                <ul>
                    <li> Email: preventivimira1@gmail.com</li>
                    <li> Tel/WhatsApp: +39 377 590 0298</li>
                    <li> Discord: https://discord.gg/NrdB2AmFYB</li>
                </ul>
            </div>
            
            <p style='margin-top: 30px; color: #999; font-size: 13px;'>
                Cordiali saluti,<br><strong>Team MIRA</strong>
            </p>
        </div>
        <div class='footer'>
            <p><strong>MIRA E-Commerce</strong></p>
            <p>PC Gaming di Alta Qualità</p>
            <p>© 2025 MIRA. Tutti i diritti riservati.</p>
        </div>
    </div>
</body>
</html>";
    }
    
    private static function getContactConfirmationText($contactData, $siteUrl) {
        return "Messaggio Ricevuto\n\n"
            . "Gentile {$contactData['first_name']},\n\n"
            . "Grazie per averci contattato. Confermiamo di aver ricevuto il tuo messaggio:\n\n"
            . "{$contactData['message']}\n\n"
            . "Ti risponderemo entro 24-48 ore.\n\n"
            . "Per assistenza immediata:\n"
            . "Email: preventivimira1@gmail.com\n"
            . "Tel/WhatsApp: +39 377 590 0298\n\n"
            . "Cordiali saluti,\nTeam MIRA";
    }
}
?>