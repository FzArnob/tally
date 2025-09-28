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
    $type = isset($input['type']) ? trim($input['type']) : '';
    $amount = isset($input['amount']) ? (float)$input['amount'] : 0;
    $expression = isset($input['expression']) ? trim($input['expression']) : null;
    $timestamp = isset($input['timestamp']) ? $input['timestamp'] : date('Y-m-d H:i:s');
    
    // Validate type
    if (!in_array($type, ['cash_in', 'cash_out'])) {
        sendJsonResponse(['error' => 'Invalid transaction type. Must be cash_in or cash_out'], 400);
    }
    
    // Validate amount
    if ($amount <= 0) {
        sendJsonResponse(['error' => 'Amount must be greater than 0'], 400);
    }
    
    // Start transaction
    $pdo->beginTransaction();
    
    try {
        // Generate transaction ID
        $transactionId = generateId();
        
        // Insert transaction
        $stmt = $pdo->prepare("
            INSERT INTO transactions (id, book_id, type, amount, expression, timestamp) 
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([$transactionId, $bookId, $type, $amount, $expression, $timestamp]);
        
        // Update book balance
        $balanceChange = ($type === 'cash_in') ? $amount : -$amount;
        $stmt = $pdo->prepare("
            UPDATE books 
            SET current_balance = current_balance + ? 
            WHERE id = ?
        ");
        $stmt->execute([$balanceChange, $bookId]);
        
        // Get updated balance
        $stmt = $pdo->prepare("SELECT current_balance FROM books WHERE id = ?");
        $stmt->execute([$bookId]);
        $newBalance = $stmt->fetchColumn();
        
        $pdo->commit();
        
        $response = [
            'success' => true,
            'transaction_id' => $transactionId,
            'new_balance' => (float)$newBalance
        ];
        
        sendJsonResponse($response);
        
    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
    
} catch (Exception $e) {
    sendJsonResponse(['error' => 'Failed to process transaction: ' . $e->getMessage()], 500);
}
?>