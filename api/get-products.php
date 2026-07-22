<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config/database.php';

try {
    // Get book ID from query parameter, default to 1 (Samad's Store)
    $bookId = isset($_GET['book_id']) ? (int)$_GET['book_id'] : 1;
    
    // Fetch all products for the book
    $stmt = $pdo->prepare("
        SELECT id, name, quantity_type, image_url 
        FROM products 
        WHERE book_id = ? 
        ORDER BY name ASC
    ");
    $stmt->execute([$bookId]);
    $products = $stmt->fetchAll();
    
    // Format the response
    foreach ($products as &$product) {
        $product['id'] = (int)$product['id'];
        $product['quantity_type'] = trim($product['quantity_type']);
        $product['image_url'] = !empty($product['image_url']) ? $product['image_url'] : null;
    }
    
    $response = [
        'products' => $products
    ];
    
    sendJsonResponse($response);
    
} catch (Exception $e) {
    sendJsonResponse(['error' => 'Failed to fetch products: ' . $e->getMessage()], 500);
}
?>
