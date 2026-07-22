<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJsonResponse(['error' => 'Only POST method allowed'], 405);
}

try {
    // Get JSON input
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        sendJsonResponse(['error' => 'Invalid JSON input'], 400);
    }
    
    // Validate required fields
    $bookId = isset($input['book_id']) ? (int)$input['book_id'] : 1;
    $productId = isset($input['product_id']) ? (int)$input['product_id'] : null;
    $name = isset($input['name']) ? trim($input['name']) : '';
    $quantityType = isset($input['quantity_type']) ? trim($input['quantity_type']) : 'piece';
    $imageUrl = isset($input['image_url']) ? trim($input['image_url']) : null;
    
    // Validate required fields
    if (empty($name)) {
        sendJsonResponse(['error' => 'Product name is required'], 400);
    }
    
    // Check if updating or creating new product
    if ($productId) {
        // Update existing product
        $stmt = $pdo->prepare("
            UPDATE products 
            SET name = ?, quantity_type = ?, image_url = ? 
            WHERE id = ? AND book_id = ?
        ");
        $stmt->execute([$name, $quantityType, $imageUrl, $productId, $bookId]);
        
        if ($stmt->rowCount() === 0) {
            sendJsonResponse(['error' => 'Product not found'], 404);
        }
    } else {
        // Create new product
        $stmt = $pdo->prepare("
            INSERT INTO products (book_id, name, quantity_type, image_url) 
            VALUES (?, ?, ?, ?)
        ");
        $stmt->execute([$bookId, $name, $quantityType, $imageUrl]);
    }
    
    // Get the product details
    $stmt = $pdo->prepare("
        SELECT id, name, quantity_type, image_url, created_at 
        FROM products 
        WHERE id = ?
    ");
    $stmt->execute([$productId ?? $pdo->lastInsertId()]);
    $product = $stmt->fetch();
    
    if (!$product) {
        sendJsonResponse(['error' => 'Failed to get product'], 500);
    }
    
    $response = [
        'success' => true,
        'product' => [
            'id' => (int)$product['id'],
            'name' => $product['name'],
            'quantity_type' => $product['quantity_type'],
            'image_url' => $product['image_url'] ?? null,
            'created_at' => $product['created_at']
        ]
    ];
    
    sendJsonResponse($response);
    
} catch (Exception $e) {
    sendJsonResponse(['error' => 'Failed to save product: ' . $e->getMessage()], 500);
}
?>
