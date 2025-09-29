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
    $bookId = isset($input['book_id']) ? (int)$input['book_id'] : 1;
    
    if (empty($transactionId)) {
        sendJsonResponse(['error' => 'Transaction ID is required'], 400);
    }
    
    // Start transaction
    $pdo->beginTransaction();
    
    try {
        // Get transaction details before deletion
        $stmt = $pdo->prepare("
            SELECT type, amount FROM transactions 
            WHERE id = ? AND book_id = ?
        ");
        $stmt->execute([$transactionId, $bookId]);
        $transaction = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$transaction) {
            $pdo->rollBack();
            sendJsonResponse(['error' => 'Transaction not found'], 404);
        }
        
        // Delete the transaction
        $stmt = $pdo->prepare("DELETE FROM transactions WHERE id = ? AND book_id = ?");
        $stmt->execute([$transactionId, $bookId]);
        
        if ($stmt->rowCount() === 0) {
            $pdo->rollBack();
            sendJsonResponse(['error' => 'Failed to delete transaction'], 500);
        }
        
        // Reverse the balance change (opposite of what was done during creation)
        $balanceChange = ($transaction['type'] === 'cash_in') ? -$transaction['amount'] : $transaction['amount'];
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
            'message' => 'Transaction deleted successfully',
            'new_balance' => (float)$newBalance,
            'deleted_transaction' => [
                'id' => $transactionId,
                'type' => $transaction['type'],
                'amount' => (float)$transaction['amount']
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