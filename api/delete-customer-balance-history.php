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
    $historyId = isset($input['history_id']) ? trim($input['history_id']) : '';
    $bookId = isset($input['book_id']) ? (int)$input['book_id'] : 1;
    $customerName = isset($input['customer_name']) ? trim($input['customer_name']) : '';
    
    if (empty($historyId)) {
        sendJsonResponse(['error' => 'History ID is required'], 400);
    }
    
    if (empty($customerName)) {
        sendJsonResponse(['error' => 'Customer name is required'], 400);
    }
    
    // Start transaction
    $pdo->beginTransaction();
    
    try {
        // Get history entry details before deletion
        $stmt = $pdo->prepare("
            SELECT type, amount FROM customer_balance_history 
            WHERE id = ? AND book_id = ? AND customer_name = ?
        ");
        $stmt->execute([$historyId, $bookId, $customerName]);
        $historyEntry = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$historyEntry) {
            $pdo->rollBack();
            sendJsonResponse(['error' => 'History entry not found'], 404);
        }
        
        // Delete the history entry
        $stmt = $pdo->prepare("
            DELETE FROM customer_balance_history 
            WHERE id = ? AND book_id = ? AND customer_name = ?
        ");
        $stmt->execute([$historyId, $bookId, $customerName]);
        
        if ($stmt->rowCount() === 0) {
            $pdo->rollBack();
            sendJsonResponse(['error' => 'Failed to delete history entry'], 500);
        }
        
        // Reverse the balance change on customer's total balance
        // If entry was 'paid' (+amount), we subtract; if 'unpaid' (-amount), we add
        $balanceChange = ($historyEntry['type'] === 'paid') ? -$historyEntry['amount'] : $historyEntry['amount'];
        
        $stmt = $pdo->prepare("
            UPDATE customers 
            SET total_balance = total_balance + ? 
            WHERE book_id = ? AND name = ?
        ");
        $stmt->execute([$balanceChange, $bookId, $customerName]);
        
        // Get updated customer balance
        $stmt = $pdo->prepare("
            SELECT total_balance FROM customers 
            WHERE book_id = ? AND name = ?
        ");
        $stmt->execute([$bookId, $customerName]);
        $newCustomerBalance = $stmt->fetchColumn();
        
        // If customer balance is now 0, we could optionally remove the customer record
        // But let's keep it for history purposes
        
        $pdo->commit();
        
        $response = [
            'success' => true,
            'message' => 'History entry deleted successfully',
            'new_customer_balance' => (float)$newCustomerBalance,
            'deleted_entry' => [
                'id' => $historyId,
                'type' => $historyEntry['type'],
                'amount' => (float)$historyEntry['amount'],
                'customer_name' => $customerName
            ]
        ];
        
        sendJsonResponse($response);
        
    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
    
} catch (Exception $e) {
    sendJsonResponse(['error' => 'Failed to delete history entry: ' . $e->getMessage()], 500);
}
?>