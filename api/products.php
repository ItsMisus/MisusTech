<?php
/**
 * MIRA E-Commerce API
 * Products Endpoint
 * FIX #3: createSlug() gestisce caratteri italiani accentati
 * FIX: verifica is_admin sulle operazioni di scrittura
 */

require_once 'config.php';

$db     = Database::getInstance()->getConnection();
$method = $_SERVER['REQUEST_METHOD'];

// Router
switch ($method) {
    case 'GET':
        if (isset($_GET['id'])) {
            getProduct($db, $_GET['id']);
        } elseif (isset($_GET['slug'])) {
            getProductBySlug($db, $_GET['slug']);
        } else {
            getProducts($db, $_GET);
        }
        break;

    case 'POST':
        $user = JWT::verify();
        if (empty($user['is_admin'])) Response::error('Accesso non autorizzato', 403);
        createProduct($db, json_decode(file_get_contents('php://input'), true));
        break;

    case 'PUT':
        $user = JWT::verify();
        if (empty($user['is_admin'])) Response::error('Accesso non autorizzato', 403);
        if (!isset($_GET['id'])) Response::error('ID prodotto mancante');
        updateProduct($db, $_GET['id'], json_decode(file_get_contents('php://input'), true));
        break;

    case 'DELETE':
        $user = JWT::verify();
        if (empty($user['is_admin'])) Response::error('Accesso non autorizzato', 403);
        if (!isset($_GET['id'])) Response::error('ID prodotto mancante');
        deleteProduct($db, $_GET['id']);
        break;

    default:
        Response::error('Metodo non supportato', 405);
}

/**
 * Get all products with filters
 */
function getProducts($db, $params) {
    $page   = isset($params['page'])  ? max(1, (int)$params['page'])          : 1;
    $limit  = isset($params['limit']) ? min(100, max(1, (int)$params['limit'])) : 100;
    $offset = ($page - 1) * $limit;

    $where    = ['p.is_active = 1'];
    $bindings = [];

    if (isset($params['category'])) {
        $where[]               = 'c.slug = :category';
        $bindings[':category'] = $params['category'];
    }

    if (isset($params['tag'])) {
        $where[]         = 't.slug = :tag';
        $bindings[':tag'] = $params['tag'];
    }

    if (isset($params['search'])) {
        $where[]           = '(p.name LIKE :search OR p.description LIKE :search)';
        $bindings[':search'] = '%' . $params['search'] . '%';
    }

    if (isset($params['min_price'])) {
        $where[]              = 'p.price >= :min_price';
        $bindings[':min_price'] = $params['min_price'];
    }

    if (isset($params['max_price'])) {
        $where[]              = 'p.price <= :max_price';
        $bindings[':max_price'] = $params['max_price'];
    }

    if (isset($params['discount']) && $params['discount'] === 'true') {
        $where[] = 'p.is_discount = 1';
    }

    if (isset($params['featured']) && $params['featured'] === 'true') {
        $where[] = 'p.is_featured = 1';
    }

    $whereClause = implode(' AND ', $where);

    $orderBy = 'p.created_at DESC';
    if (isset($params['sort'])) {
        switch ($params['sort']) {
            case 'price_asc':  $orderBy = 'p.price ASC';   break;
            case 'price_desc': $orderBy = 'p.price DESC';  break;
            case 'name':       $orderBy = 'p.name ASC';    break;
            case 'popular':    $orderBy = 'p.views DESC';  break;
        }
    }

    $countSql  = "SELECT COUNT(DISTINCT p.id) as total
                  FROM products p
                  LEFT JOIN categories c ON p.category_id = c.id
                  LEFT JOIN product_tags pt ON p.id = pt.product_id
                  LEFT JOIN tags t ON pt.tag_id = t.id
                  WHERE $whereClause";
    $countStmt = $db->prepare($countSql);
    $countStmt->execute($bindings);
    $total = $countStmt->fetch()['total'];

    $sql = "SELECT
                p.*,
                c.name as category_name,
                c.slug as category_slug,
                GROUP_CONCAT(DISTINCT t.slug) as tags,
                COALESCE(AVG(r.rating), 0) as avg_rating,
                COUNT(DISTINCT r.id) as review_count
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN product_tags pt ON p.id = pt.product_id
            LEFT JOIN tags t ON pt.tag_id = t.id
            LEFT JOIN reviews r ON p.id = r.product_id AND r.is_approved = 1
            WHERE $whereClause
            GROUP BY p.id
            ORDER BY $orderBy
            LIMIT :limit OFFSET :offset";

    $stmt = $db->prepare($sql);
    foreach ($bindings as $key => $value) {
        $stmt->bindValue($key, $value);
    }
    $stmt->bindValue(':limit',  $limit,  PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();
    $products = $stmt->fetchAll();

    foreach ($products as &$product) {
        $product['tags']         = $product['tags'] ? explode(',', $product['tags']) : [];
        $product['avg_rating']   = round((float)$product['avg_rating'], 1);
        $product['review_count'] = (int)$product['review_count'];

        $specsStmt = $db->prepare("SELECT spec_key, spec_value FROM product_specs WHERE product_id = ? ORDER BY display_order");
        $specsStmt->execute([$product['id']]);
        $specs = $specsStmt->fetchAll();

        $product['specs'] = [];
        foreach ($specs as $spec) {
            $product['specs'][$spec['spec_key']] = $spec['spec_value'];
        }
    }

    Response::success([
        'products'   => $products,
        'pagination' => [
            'page'  => $page,
            'limit' => $limit,
            'total' => (int)$total,
            'pages' => (int)ceil($total / $limit)
        ]
    ]);
}

/**
 * Get single product by ID
 */
function getProduct($db, $id) {
    $sql = "SELECT
                p.*,
                c.name as category_name,
                c.slug as category_slug,
                GROUP_CONCAT(DISTINCT t.slug) as tags,
                COALESCE(AVG(r.rating), 0) as avg_rating,
                COUNT(DISTINCT r.id) as review_count
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN product_tags pt ON p.id = pt.product_id
            LEFT JOIN tags t ON pt.tag_id = t.id
            LEFT JOIN reviews r ON p.id = r.product_id AND r.is_approved = 1
            WHERE p.id = ? AND p.is_active = 1
            GROUP BY p.id";

    $stmt = $db->prepare($sql);
    $stmt->execute([$id]);
    $product = $stmt->fetch();

    if (!$product) {
        Response::error('Prodotto non trovato', 404);
    }

    $product['tags']         = $product['tags'] ? explode(',', $product['tags']) : [];
    $product['avg_rating']   = round((float)$product['avg_rating'], 1);
    $product['review_count'] = (int)$product['review_count'];

    $specsStmt = $db->prepare("SELECT spec_key, spec_value FROM product_specs WHERE product_id = ? ORDER BY display_order");
    $specsStmt->execute([$product['id']]);
    $specs = $specsStmt->fetchAll();

    $product['specs'] = [];
    foreach ($specs as $spec) {
        $product['specs'][$spec['spec_key']] = $spec['spec_value'];
    }

    $db->prepare("UPDATE products SET views = views + 1 WHERE id = ?")->execute([$id]);

    Response::success($product);
}

/**
 * Get product by slug
 */
function getProductBySlug($db, $slug) {
    $stmt = $db->prepare("SELECT id FROM products WHERE slug = ? AND is_active = 1");
    $stmt->execute([$slug]);
    $result = $stmt->fetch();

    if (!$result) {
        Response::error('Prodotto non trovato', 404);
    }

    getProduct($db, $result['id']);
}

/**
 * Create new product
 */
function createProduct($db, $data) {
    $errors = [];
    if ($error = Validator::required($data['name'] ?? '', 'Nome'))         $errors[] = $error;
    if ($error = Validator::required($data['description'] ?? '', 'Descrizione')) $errors[] = $error;
    if ($error = Validator::numeric($data['price'] ?? '', 'Prezzo'))       $errors[] = $error;
    if ($error = Validator::required($data['image_url'] ?? '', 'Immagine')) $errors[] = $error;

    if (!empty($errors)) {
        Response::error('Validazione fallita', 400, $errors);
    }

    $slug = createSlug($data['name'], $db);

    try {
        $db->beginTransaction();

        $sql  = "INSERT INTO products
                (name, slug, description, price, discount_price, is_discount, image_url, category_id, stock, is_featured, is_active)
                VALUES
                (:name, :slug, :description, :price, :discount_price, :is_discount, :image_url, :category_id, :stock, :is_featured, :is_active)";
        $stmt = $db->prepare($sql);
        $stmt->execute([
            ':name'           => $data['name'],
            ':slug'           => $slug,
            ':description'    => $data['description'],
            ':price'          => $data['price'],
            ':discount_price' => $data['discount_price'] ?? null,
            ':is_discount'    => !empty($data['discount_price']) ? 1 : 0,
            ':image_url'      => $data['image_url'],
            ':category_id'    => $data['category_id'] ?? null,
            ':stock'          => $data['stock'] ?? 0,
            ':is_featured'    => $data['is_featured'] ?? 0,
            ':is_active'      => $data['is_active'] ?? 1
        ]);

        $productId = $db->lastInsertId();

        if (!empty($data['specs'])) {
            $specsStmt = $db->prepare("INSERT INTO product_specs (product_id, spec_key, spec_value, display_order) VALUES (?, ?, ?, ?)");
            $order     = 0;
            foreach ($data['specs'] as $key => $value) {
                $specsStmt->execute([$productId, $key, $value, $order++]);
            }
        }

        if (!empty($data['tags'])) {
            $tagStmt = $db->prepare("INSERT INTO product_tags (product_id, tag_id) SELECT ?, id FROM tags WHERE slug = ?");
            foreach ($data['tags'] as $tagSlug) {
                $tagStmt->execute([$productId, $tagSlug]);
            }
        }

        $db->commit();
        Response::success(['id' => $productId], 'Prodotto creato con successo', 201);

    } catch (Exception $e) {
        $db->rollBack();
        error_log($e->getMessage());
        Response::error('Errore durante la creazione del prodotto', 500);
    }
}

/**
 * Update product
 */
function updateProduct($db, $id, $data) {
    try {
        $db->beginTransaction();

        $fields = [];
        $params = [':id' => $id];
        $allowedFields = ['name', 'description', 'price', 'discount_price', 'is_discount', 'image_url', 'category_id', 'stock', 'is_featured', 'is_active'];

        foreach ($allowedFields as $field) {
            if (array_key_exists($field, $data)) {
                $fields[]        = "$field = :$field";
                $params[":$field"] = $data[$field];
            }
        }

        if (empty($fields)) {
            Response::error('Nessun campo da aggiornare');
        }

        $sql  = "UPDATE products SET " . implode(', ', $fields) . " WHERE id = :id";
        $stmt = $db->prepare($sql);
        $stmt->execute($params);

        if (isset($data['specs'])) {
            $db->prepare("DELETE FROM product_specs WHERE product_id = ?")->execute([$id]);
            $specsStmt = $db->prepare("INSERT INTO product_specs (product_id, spec_key, spec_value, display_order) VALUES (?, ?, ?, ?)");
            $order     = 0;
            foreach ($data['specs'] as $key => $value) {
                $specsStmt->execute([$id, $key, $value, $order++]);
            }
        }

        if (isset($data['tags'])) {
            $db->prepare("DELETE FROM product_tags WHERE product_id = ?")->execute([$id]);
            $tagStmt = $db->prepare("INSERT INTO product_tags (product_id, tag_id) SELECT ?, id FROM tags WHERE slug = ?");
            foreach ($data['tags'] as $tagSlug) {
                $tagStmt->execute([$id, $tagSlug]);
            }
        }

        $db->commit();
        Response::success(null, 'Prodotto aggiornato con successo');

    } catch (Exception $e) {
        $db->rollBack();
        error_log($e->getMessage());
        Response::error('Errore durante l\'aggiornamento del prodotto', 500);
    }
}

/**
 * Delete product (soft delete)
 */
function deleteProduct($db, $id) {
    $stmt = $db->prepare("UPDATE products SET is_active = 0 WHERE id = ?");
    $stmt->execute([$id]);

    if ($stmt->rowCount() === 0) {
        Response::error('Prodotto non trovato', 404);
    }

    Response::success(null, 'Prodotto eliminato con successo');
}

/**
 * FIX #3: createSlug() con supporto completo ai caratteri italiani accentati
 */
function createSlug($name, $db) {
    // Mappa caratteri accentati italiani → ASCII
    $accents = [
        'à' => 'a', 'á' => 'a', 'â' => 'a', 'ã' => 'a', 'ä' => 'a',
        'è' => 'e', 'é' => 'e', 'ê' => 'e', 'ë' => 'e',
        'ì' => 'i', 'í' => 'i', 'î' => 'i', 'ï' => 'i',
        'ò' => 'o', 'ó' => 'o', 'ô' => 'o', 'õ' => 'o', 'ö' => 'o',
        'ù' => 'u', 'ú' => 'u', 'û' => 'u', 'ü' => 'u',
        'ý' => 'y', 'ÿ' => 'y',
        'ñ' => 'n', 'ç' => 'c',
        'À' => 'a', 'Á' => 'a', 'Â' => 'a', 'Ã' => 'a', 'Ä' => 'a',
        'È' => 'e', 'É' => 'e', 'Ê' => 'e', 'Ë' => 'e',
        'Ì' => 'i', 'Í' => 'i', 'Î' => 'i', 'Ï' => 'i',
        'Ò' => 'o', 'Ó' => 'o', 'Ô' => 'o', 'Õ' => 'o', 'Ö' => 'o',
        'Ù' => 'u', 'Ú' => 'u', 'Û' => 'u', 'Ü' => 'u',
        'Ý' => 'y', 'Ñ' => 'n', 'Ç' => 'c'
    ];

    $name = strtr($name, $accents);
    $slug = strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-', $name), '-'));
    $slug = preg_replace('/-+/', '-', $slug); // rimuovi trattini multipli

    // Assicura unicità
    $base  = $slug;
    $count = 0;
    do {
        $check     = $count === 0 ? $base : $base . '-' . $count;
        $stmt      = $db->prepare("SELECT COUNT(*) FROM products WHERE slug = ?");
        $stmt->execute([$check]);
        $exists    = $stmt->fetchColumn() > 0;
        if (!$exists) {
            $slug = $check;
            break;
        }
        $count++;
    } while (true);

    return $slug;
}
// Fine del file products.php
?>