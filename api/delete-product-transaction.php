<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    sendJsonResponse(['error' => 'Only DELETE method allowed'], 405);
}

try {
    // Get JSON input
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        sendJsonResponse(['error' => 'Invalid JSON input'], 400);
    }
    
    // Validate required fields
    $transactionId = isset($input['transaction_id']) ? trim($input['transaction_id']) : '';
    $productId = isset($input['product_id']) ? (int)$input['product_id'] : 0;
    
    if (empty($transactionId)) {
        sendJsonResponse(['error' => 'Transaction ID is required'], 400);
    }
    
    // Start transaction
    $pdo->beginTransaction();
    
    try {
        // Get transaction details before deletion
        $stmt = $pdo->prepare("
            SELECT type, quantity, price_per_unit, total_amount 
            FROM product_transactions 
            WHERE id = ? AND product_id = ?
        ");
        $stmt->execute([$transactionId, $productId]);
        $transaction = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$transaction) {
            $pdo->rollBack();
            sendJsonResponse(['error' => 'Transaction not found'], 404);
        }
        
        // Delete the transaction
        $stmt = $pdo->prepare("
            DELETE FROM product_transactions 
            WHERE id = ? AND product_id = ?
        ");
        $stmt->execute([$transactionId, $productId]);
        
        if ($stmt->rowCount() === 0) {
            $pdo->rollBack();
            sendJsonResponse(['error' => 'Failed to delete transaction'], 500);
        }
        
        // Reverse the balance change on product's stock
        // If entry was 'stock', we subtract; if 'sale', we add
        $stockChange = ($transaction['type'] === 'stock') ? -$transaction['quantity'] : $transaction['quantity'];
        
        $stmt = $pdo->prepare("
            UPDATE products 
            SET quantity = quantity + ? 
            WHERE id = ?
        ");
        // Note: We don't have a quantity column in products table, so we just acknowledge deletion
        // The stock is calculated on read from transactions
        
        $pdo->commit();
        
        $response = [
            'success' => true,
            'message' => 'Transaction deleted successfully',
            'deleted_entry' => [
                'id' => $transactionId,
                'type' => $transaction['type'],
                'quantity' => (float)$transaction['quantity'],
                'price_per_unit' => (float)$transaction['price_per_unit'],
                'total_amount' => (float)$transaction['total_amount']
            ]
        ];
        
        sendJsonResponse($response);
        
    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
    
} catch (Exception $e) {
    sendJsonResponse(['error' => 'Failed to delete transaction: ' . $e->getMessage()], 500);
}
?>
