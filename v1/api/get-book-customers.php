<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config/database.php';

try {
    // Get book ID from query parameter, default to 1 (Samad's Store)
    $bookId = isset($_GET['book_id']) ? (int)$_GET['book_id'] : 1;
    
    // Fetch customers ordered by name
    $stmt = $pdo->prepare("
        SELECT name, total_balance 
        FROM customers 
        WHERE book_id = ? 
        ORDER BY name ASC
    ");
    $stmt->execute([$bookId]);
    $customers = $stmt->fetchAll();
    
    // Calculate totals
    $totalPaid = 0;
    $totalUnpaid = 0;
    
    foreach ($customers as &$customer) {
        $customer['total_balance'] = (float)$customer['total_balance'];
        
        if ($customer['total_balance'] > 0) {
            $totalPaid += $customer['total_balance'];
        } else {
            $totalUnpaid += abs($customer['total_balance']);
        }
    }
    
    $response = [
        'customers' => $customers,
        'totals' => [
            'total_paid' => $totalPaid,
            'total_unpaid' => $totalUnpaid
        ]
    ];
    
    sendJsonResponse($response);
    
} catch (Exception $e) {
    sendJsonResponse(['error' => 'Failed to fetch customers: ' . $e->getMessage()], 500);
}
?>
