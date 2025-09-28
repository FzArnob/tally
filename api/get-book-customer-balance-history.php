<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config/database.php';

try {
    // Get parameters
    $bookId = isset($_GET['book_id']) ? (int)$_GET['book_id'] : 1;
    $customerName = isset($_GET['customer_name']) ? trim($_GET['customer_name']) : '';
    
    if (empty($customerName)) {
        sendJsonResponse(['error' => 'Customer name is required'], 400);
    }
    
    // Fetch customer balance history ordered by timestamp (newest first)
    $stmt = $pdo->prepare("
        SELECT id, amount, type, reason, expression, timestamp 
        FROM customer_balance_history 
        WHERE book_id = ? AND customer_name = ? 
        ORDER BY timestamp DESC
    ");
    $stmt->execute([$bookId, $customerName]);
    $history = $stmt->fetchAll();
    
    // Format the response
    foreach ($history as &$entry) {
        $entry['amount'] = (float)$entry['amount'];
    }
    
    $response = [
        'customer_name' => $customerName,
        'history' => $history
    ];
    
    sendJsonResponse($response);
    
} catch (Exception $e) {
    sendJsonResponse(['error' => 'Failed to fetch customer balance history: ' . $e->getMessage()], 500);
}
?>