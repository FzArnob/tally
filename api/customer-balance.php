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
    $customerName = isset($input['customer_name']) ? trim($input['customer_name']) : '';
    $amount = isset($input['amount']) ? (float)$input['amount'] : 0;
    $type = isset($input['type']) ? trim($input['type']) : '';
    $reason = isset($input['reason']) ? trim($input['reason']) : null;
    $expression = isset($input['expression']) ? trim($input['expression']) : null;
    $timestamp = isset($input['timestamp']) ? $input['timestamp'] : date('Y-m-d H:i:s');
    
    // Validate required fields
    if (empty($customerName)) {
        sendJsonResponse(['error' => 'Customer name is required'], 400);
    }
    
    if (!in_array($type, ['paid', 'unpaid'])) {
        sendJsonResponse(['error' => 'Invalid type. Must be paid or unpaid'], 400);
    }
    
    if ($amount <= 0) {
        sendJsonResponse(['error' => 'Amount must be greater than 0'], 400);
    }
    
    // Start transaction
    $pdo->beginTransaction();
    
    try {
        // Check if customer exists, create if not
        $stmt = $pdo->prepare("
            SELECT total_balance FROM customers 
            WHERE book_id = ? AND name = ?
        ");
        $stmt->execute([$bookId, $customerName]);
        $customer = $stmt->fetch();
        
        if (!$customer) {
            // Create new customer
            $stmt = $pdo->prepare("
                INSERT INTO customers (book_id, name, total_balance) 
                VALUES (?, ?, 0.00)
            ");
            $stmt->execute([$bookId, $customerName]);
            $currentBalance = 0.00;
        } else {
            $currentBalance = (float)$customer['total_balance'];
        }
        
        // Calculate balance change
        $balanceChange = ($type === 'paid') ? $amount : -$amount;
        
        // Update customer balance
        $stmt = $pdo->prepare("
            UPDATE customers 
            SET total_balance = total_balance + ? 
            WHERE book_id = ? AND name = ?
        ");
        $stmt->execute([$balanceChange, $bookId, $customerName]);
        
        // Insert customer balance history
        $historyId = generateId();
        $stmt = $pdo->prepare("
            INSERT INTO customer_balance_history 
            (id, book_id, customer_name, amount, type, reason, expression, timestamp) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $historyId, 
            $bookId, 
            $customerName, 
            $amount, 
            $type, 
            $reason, 
            $expression, 
            $timestamp
        ]);
        
        // Get updated customer balance
        $stmt = $pdo->prepare("
            SELECT total_balance FROM customers 
            WHERE book_id = ? AND name = ?
        ");
        $stmt->execute([$bookId, $customerName]);
        $newBalance = (float)$stmt->fetchColumn();
        
        $pdo->commit();
        
        $response = [
            'success' => true,
            'history_id' => $historyId,
            'customer_name' => $customerName,
            'new_balance' => $newBalance
        ];
        
        sendJsonResponse($response);
        
    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
    
} catch (Exception $e) {
    sendJsonResponse(['error' => 'Failed to process customer balance: ' . $e->getMessage()], 500);
}
?>