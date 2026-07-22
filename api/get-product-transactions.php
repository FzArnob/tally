<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config/database.php';

try {
    // Get product ID from query parameter
    $productId = isset($_GET['product_id']) ? (int)$_GET['product_id'] : 0;
    
    if ($productId <= 0) {
        sendJsonResponse(['error' => 'Invalid product ID'], 400);
    }
    
    // Fetch all transactions for the product ordered by timestamp (newest first)
    $stmt = $pdo->prepare("
        SELECT id, type, quantity, price_per_unit, total_amount, created_at 
        FROM product_transactions 
        WHERE product_id = ? 
        ORDER BY created_at DESC
    ");
    $stmt->execute([$productId]);
    $transactions = $stmt->fetchAll();
    
    // Format the response
    foreach ($transactions as &$tx) {
        $tx['id'] = (int)$tx['id'];
        $tx['quantity'] = (float)$tx['quantity'];
        $tx['price_per_unit'] = (float)$tx['price_per_unit'];
        $tx['total_amount'] = (float)$tx['total_amount'];
    }
    
    $response = [
        'product_id' => $productId,
        'transactions' => $transactions
    ];
    
    sendJsonResponse($response);
    
} catch (Exception $e) {
    sendJsonResponse(['error' => 'Failed to fetch product transactions: ' . $e->getMessage()], 500);
}
?>
