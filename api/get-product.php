<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config/database.php';

try {
    // Get product ID from query parameter
    $productId = isset($_GET['product_id']) ? (int)$_GET['product_id'] : 0;
    
    if ($productId <= 0) {
        sendJsonResponse(['error' => 'Invalid product ID'], 400);
    }
    
    // Fetch product details with current stock
    $stmt = $pdo->prepare("
        SELECT 
            p.id,
            p.name,
            p.quantity_type,
            p.image_url,
            COALESCE(SUM(CASE WHEN pt.type = 'stock' THEN pt.quantity ELSE 0 END), 0) as total_stock_in,
            COALESCE(SUM(CASE WHEN pt.type = 'sale' THEN pt.quantity ELSE 0 END), 0) as total_stock_out,
            (COALESCE(SUM(CASE WHEN pt.type = 'stock' THEN pt.quantity ELSE 0 END), 0) - 
             COALESCE(SUM(CASE WHEN pt.type = 'sale' THEN pt.quantity ELSE 0 END), 0)) as current_stock
        FROM products p
        LEFT JOIN product_transactions pt ON p.id = pt.product_id
        WHERE p.id = ?
        GROUP BY p.id
    ");
    $stmt->execute([$productId]);
    $product = $stmt->fetch();
    
    if (!$product) {
        sendJsonResponse(['error' => 'Product not found'], 404);
    }
    
    // Format the response
    $response = [
        'id' => (int)$product['id'],
        'name' => $product['name'],
        'quantity_type' => $product['quantity_type'],
        'image_url' => $product['image_url'] ?? null,
        'total_stock_in' => (float)$product['total_stock_in'],
        'total_stock_out' => (float)$product['total_stock_out'],
        'current_stock' => (float)$product['current_stock']
    ];
    
    sendJsonResponse($response);
    
} catch (Exception $e) {
    sendJsonResponse(['error' => 'Failed to fetch product: ' . $e->getMessage()], 500);
}
?>
