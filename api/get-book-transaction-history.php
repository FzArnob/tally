<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config/database.php';

try {
    // Get book ID from query parameter, default to 1 (Samad's Store)
    $bookId = isset($_GET['book_id']) ? (int)$_GET['book_id'] : 1;
    
    // Fetch transaction history ordered by timestamp (newest first)
    $stmt = $pdo->prepare("
        SELECT id, type, amount, expression, timestamp 
        FROM transactions 
        WHERE book_id = ? 
        ORDER BY timestamp DESC
    ");
    $stmt->execute([$bookId]);
    $transactions = $stmt->fetchAll();
    
    // Calculate totals
    $totalCashIn = 0;
    $totalCashOut = 0;
    
    foreach ($transactions as &$transaction) {
        $transaction['amount'] = (float)$transaction['amount'];
        
        if ($transaction['type'] === 'cash_in') {
            $totalCashIn += $transaction['amount'];
        } else {
            $totalCashOut += $transaction['amount'];
        }
    }
    
    $response = [
        'transactions' => $transactions,
        'summary' => [
            'total_cash_in' => $totalCashIn,
            'total_cash_out' => $totalCashOut,
            'net_amount' => $totalCashIn - $totalCashOut
        ]
    ];
    
    sendJsonResponse($response);
    
} catch (Exception $e) {
    sendJsonResponse(['error' => 'Failed to fetch transaction history: ' . $e->getMessage()], 500);
}
?>
