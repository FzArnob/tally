<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config/database.php';

try {
    // Get book ID from query parameter, default to 1 (Samad's Store)
    $bookId = isset($_GET['book_id']) ? (int)$_GET['book_id'] : 1;
    
    // Fetch book details
    $stmt = $pdo->prepare("SELECT id, name, current_balance, logo_url FROM books WHERE id = ?");
    $stmt->execute([$bookId]);
    $book = $stmt->fetch();
    
    if (!$book) {
        sendJsonResponse(['error' => 'Book not found'], 404);
    }
    
    // Format the response
    $response = [
        'id' => (int)$book['id'],
        'name' => $book['name'],
        'current_balance' => (float)$book['current_balance'],
        'logo_url' => $book['logo_url']
    ];
    
    sendJsonResponse($response);
    
} catch (Exception $e) {
    sendJsonResponse(['error' => 'Failed to fetch book details: ' . $e->getMessage()], 500);
}
?>
