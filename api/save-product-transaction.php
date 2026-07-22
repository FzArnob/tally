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
    $productId = isset($input['product_id']) ? (int)$input['product_id'] : 0;
    $type = isset($input['type']) ? trim($input['type']) : '';
    $quantity = isset($input['quantity']) ? (float)$input['quantity'] : 0;
    $pricePerUnit = isset($input['price_per_unit']) ? (float)$input['price_per_unit'] : 0;
    
    // Validate required fields
    if ($productId <= 0) {
        sendJsonResponse(['error' => 'Product ID is required'], 400);
    }
    
    if (!in_array($type, ['stock', 'sale'])) {
        sendJsonResponse(['error' => 'Invalid type. Must be stock or sale'], 400);
    }
    
    if ($quantity <= 0) {
        sendJsonResponse(['error' => 'Quantity must be greater than 0'], 400);
    }
    
    if ($pricePerUnit < 0) {
        sendJsonResponse(['error' => 'Price per unit cannot be negative'], 400);
    }
    
    // Calculate total amount
    $totalAmount = $quantity * $pricePerUnit;
    
    // Get product details
    $stmt = $pdo->prepare("SELECT book_id FROM products WHERE id = ?");
    $stmt->execute([$productId]);
    $product = $stmt->fetch();
    
    if (!$product) {
        sendJsonResponse(['error' => 'Product not found'], 404);
    }
    
    $bookId = (int)$product['book_id'];
    
    // Start transaction
    $pdo->beginTransaction();
    
    try {
        // Insert product transaction (let MySQL auto-generate the ID)
        $stmt = $pdo->prepare("
            INSERT INTO product_transactions 
            (product_id, type, quantity, price_per_unit, total_amount) 
            VALUES (?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $productId,
            $type,
            $quantity,
            $pricePerUnit,
            $totalAmount
        ]);
        
        // Get the last inserted ID and transaction details
        $transactionId = $pdo->lastInsertId();
        $stmt = $pdo->prepare("
            SELECT id, product_id, type, quantity, price_per_unit, total_amount, created_at 
            FROM product_transactions 
            WHERE id = ?
        ");
        $stmt->execute([$transactionId]);
        $transaction = $stmt->fetch();
        
        $pdo->commit();
        
        $response = [
            'success' => true,
            'transaction' => [
                'id' => (string)$transactionId,
                'product_id' => (int)$transaction['product_id'],
                'type' => $transaction['type'],
                'quantity' => (float)$transaction['quantity'],
                'price_per_unit' => (float)$transaction['price_per_unit'],
                'total_amount' => (float)$transaction['total_amount'],
                'created_at' => $transaction['created_at']
            ]
        ];
        
        sendJsonResponse($response);
        
    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
    
} catch (Exception $e) {
    sendJsonResponse(['error' => 'Failed to save transaction: ' . $e->getMessage()], 500);
}
?>
