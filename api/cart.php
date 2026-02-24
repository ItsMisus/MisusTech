<?php
/**
 * MIRA E-Commerce API
 * Cart Endpoint - api/cart.php
 * FIX #4: verifica stock comprensiva della quantità già nel carrello
 * FIX #5: carrello creato in modo sicuro senza duplicati
 */

require_once 'config.php';

$db     = Database::getInstance()->getConnection();
$method = $_SERVER['REQUEST_METHOD'];

$user   = JWT::verify();
$userId = $user['id'];

switch ($method) {
    case 'GET':
        getCart($db, $userId);
        break;

    case 'POST':
        addToCart($db, $userId, json_decode(file_get_contents('php://input'), true));
        break;

    case 'PUT':
        if (!isset($_GET['id'])) Response::error('ID item mancante', 400);
        updateCartItem($db, $userId, $_GET['id'], json_decode(file_get_contents('php://input'), true));
        break;

    case 'DELETE':
        if (isset($_GET['clear']) && $_GET['clear'] === '1') {
            clearCart($db, $userId);
        } else {
            if (!isset($_GET['id'])) Response::error('ID item mancante', 400);
            removeFromCart($db, $userId, $_GET['id']);
        }
        break;

    default:
        Response::error('Metodo non supportato', 405);
}

/**
 * FIX #5: getOrCreateCart — usa INSERT IGNORE per evitare duplicati
 */
function getOrCreateCart($db, $userId) {
    // Usa INSERT IGNORE per evitare race condition / duplicati (richiede UNIQUE KEY su user_id)
    $db->prepare("INSERT IGNORE INTO carts (user_id) VALUES (?)")->execute([$userId]);

    $stmt = $db->prepare("SELECT id FROM carts WHERE user_id = ?");
    $stmt->execute([$userId]);
    $cart = $stmt->fetch();

    return $cart['id'];
}

/**
 * Get user cart with all items
 */
function getCart($db, $userId) {
    try {
        $cartId = getOrCreateCart($db, $userId);

        $sql = "SELECT
                    ci.id as item_id,
                    ci.quantity,
                    ci.added_at,
                    p.id as product_id,
                    p.name as product_name,
                    p.price,
                    p.discount_price,
                    p.is_discount,
                    p.image_url,
                    p.stock,
                    p.slug
                FROM cart_items ci
                JOIN products p ON ci.product_id = p.id
                WHERE ci.cart_id = ? AND p.is_active = 1
                ORDER BY ci.added_at DESC";

        $stmt = $db->prepare($sql);
        $stmt->execute([$cartId]);
        $items = $stmt->fetchAll();

        $total      = 0;
        $itemsCount = 0;
        $formatted  = [];

        foreach ($items as $item) {
            $unitPrice = $item['is_discount'] ? (float)$item['discount_price'] : (float)$item['price'];
            $subtotal  = $unitPrice * (int)$item['quantity'];

            $formatted[] = [
                'item_id'      => (int)$item['item_id'],
                'product_id'   => (int)$item['product_id'],
                'product_name' => $item['product_name'],
                'slug'         => $item['slug'],
                'quantity'     => (int)$item['quantity'],
                'unit_price'   => $unitPrice,
                'subtotal'     => round($subtotal, 2),
                'image_url'    => $item['image_url'],
                'stock'        => (int)$item['stock'],
                'is_discount'  => (bool)$item['is_discount'],
                'added_at'     => $item['added_at']
            ];

            $total      += $subtotal;
            $itemsCount += (int)$item['quantity'];
        }

        Response::success([
            'cart_id'     => $cartId,
            'items'       => $formatted,
            'total'       => round($total, 2),
            'items_count' => $itemsCount,
            'currency'    => 'EUR'
        ]);

    } catch (PDOException $e) {
        error_log("Get cart error: " . $e->getMessage());
        Response::error('Errore durante il recupero del carrello', 500);
    }
}

/**
 * Add product to cart
 * FIX #4: la verifica stock tiene conto della quantità già presente nel carrello
 */
function addToCart($db, $userId, $data) {
    if (!isset($data['product_id'])) {
        Response::error('product_id mancante', 400);
    }

    $productId = (int)$data['product_id'];
    $quantity  = isset($data['quantity']) ? max(1, (int)$data['quantity']) : 1;

    try {
        $productStmt = $db->prepare("SELECT id, name, stock, is_active FROM products WHERE id = ?");
        $productStmt->execute([$productId]);
        $product = $productStmt->fetch();

        if (!$product) {
            Response::error('Prodotto non trovato', 404);
        }
        if (!$product['is_active']) {
            Response::error('Prodotto non disponibile', 400);
        }

        $cartId = getOrCreateCart($db, $userId);

        // Quantità già nel carrello per questo prodotto
        $checkStmt = $db->prepare("SELECT id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ?");
        $checkStmt->execute([$cartId, $productId]);
        $existing = $checkStmt->fetch();

        $alreadyInCart = $existing ? (int)$existing['quantity'] : 0;
        $newTotal      = $alreadyInCart + $quantity;

        // FIX #4: verifica stock rispetto al totale (esistente + nuovo)
        if ($newTotal > $product['stock']) {
            Response::error(
                'Stock insufficiente. Nel carrello hai già ' . $alreadyInCart .
                ' pezzi. Disponibili in totale: ' . $product['stock'],
                400
            );
        }

        if ($existing) {
            $updateStmt = $db->prepare("UPDATE cart_items SET quantity = ?, added_at = NOW() WHERE id = ?");
            $updateStmt->execute([$newTotal, $existing['id']]);
            $itemId  = $existing['id'];
            $message = 'Quantità aggiornata nel carrello';
        } else {
            $insertStmt = $db->prepare("INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)");
            $insertStmt->execute([$cartId, $productId, $quantity]);
            $itemId  = $db->lastInsertId();
            $message = 'Prodotto aggiunto al carrello';
        }

        Response::success([
            'item_id'      => $itemId,
            'product_name' => $product['name'],
            'quantity'     => $quantity
        ], $message);

    } catch (PDOException $e) {
        error_log("Add to cart error: " . $e->getMessage());
        Response::error('Errore durante l\'aggiunta al carrello', 500);
    }
}

/**
 * Update cart item quantity
 */
function updateCartItem($db, $userId, $itemId, $data) {
    if (!isset($data['quantity'])) {
        Response::error('Quantità mancante', 400);
    }

    $quantity = (int)$data['quantity'];
    if ($quantity < 1) {
        Response::error('Quantità non valida', 400);
    }

    try {
        $checkStmt = $db->prepare("
            SELECT ci.id, ci.product_id, p.stock, p.name
            FROM cart_items ci
            JOIN carts c ON ci.cart_id = c.id
            JOIN products p ON ci.product_id = p.id
            WHERE ci.id = ? AND c.user_id = ?
        ");
        $checkStmt->execute([$itemId, $userId]);
        $item = $checkStmt->fetch();

        if (!$item) {
            Response::error('Item non trovato nel tuo carrello', 404);
        }
        if ($quantity > $item['stock']) {
            Response::error('Stock insufficiente. Disponibili: ' . $item['stock'], 400);
        }

        $db->prepare("UPDATE cart_items SET quantity = ? WHERE id = ?")->execute([$quantity, $itemId]);

        Response::success([
            'item_id'      => (int)$itemId,
            'quantity'     => $quantity,
            'product_name' => $item['name']
        ], 'Quantità aggiornata');

    } catch (PDOException $e) {
        error_log("Update cart item error: " . $e->getMessage());
        Response::error('Errore durante l\'aggiornamento', 500);
    }
}

/**
 * Remove item from cart
 */
function removeFromCart($db, $userId, $itemId) {
    try {
        $checkStmt = $db->prepare("
            SELECT ci.id, p.name
            FROM cart_items ci
            JOIN carts c ON ci.cart_id = c.id
            JOIN products p ON ci.product_id = p.id
            WHERE ci.id = ? AND c.user_id = ?
        ");
        $checkStmt->execute([$itemId, $userId]);
        $item = $checkStmt->fetch();

        if (!$item) {
            Response::error('Item non trovato nel tuo carrello', 404);
        }

        $db->prepare("DELETE FROM cart_items WHERE id = ?")->execute([$itemId]);

        Response::success([
            'item_id'      => (int)$itemId,
            'product_name' => $item['name']
        ], 'Prodotto rimosso dal carrello');

    } catch (PDOException $e) {
        error_log("Remove from cart error: " . $e->getMessage());
        Response::error('Errore durante la rimozione', 500);
    }
}

/**
 * Clear entire cart
 */
function clearCart($db, $userId) {
    try {
        $cartStmt = $db->prepare("SELECT id FROM carts WHERE user_id = ?");
        $cartStmt->execute([$userId]);
        $cart = $cartStmt->fetch();

        if (!$cart) {
            Response::success([], 'Carrello già vuoto');
            return;
        }

        $deleteStmt   = $db->prepare("DELETE FROM cart_items WHERE cart_id = ?");
        $deleteStmt->execute([$cart['id']]);

        Response::success(['items_removed' => $deleteStmt->rowCount()], 'Carrello svuotato con successo');

    } catch (PDOException $e) {
        error_log("Clear cart error: " . $e->getMessage());
        Response::error('Errore durante lo svuotamento del carrello', 500);
    }
}
?>