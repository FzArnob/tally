<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config/database.php';

try {
    // Get book ID from query parameter, default to 1 (Samad's Store)
    $bookId = isset($_GET['book_id']) ? (int)$_GET['book_id'] : 1;
    
    // Fetch all products with their current stock and transactions in a single optimized query
    // Using LEFT JOIN ensures products without transactions are included
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
        LEFT JOIN product_transactions pt ON p.id = pt.product_id AND p.book_id = ?
        WHERE p.book_id = ?
        GROUP BY p.id
        ORDER BY p.name ASC
    ");
    $stmt->execute([$bookId, $bookId]);
    $products = $stmt->fetchAll();
    
    // Fetch all transactions for products in a separate optimized query
    $txStmt = $pdo->prepare("
        SELECT pt.*,
               p.id as product_id
        FROM product_transactions pt
        INNER JOIN products p ON pt.product_id = p.id AND p.book_id = ?
        WHERE p.book_id = ?
        ORDER BY pt.id DESC
    ");
    $txStmt->execute([$bookId, $bookId]);
    $allTransactions = $txStmt->fetchAll();
    
    // Group transactions by product efficiently using array_column and array_chunk pattern
    if (!empty($allTransactions)) {
        $transactionsByProduct = array_reduce(
            $allTransactions,
            function($carry, $item) {
                $productId = (int)$item['product_id'];
                $carry[$productId][] = $item;
                return $carry;
            },
            []
        );
    } else {
        $transactionsByProduct = [];
    }
    
    // Format the response
    foreach ($products as &$product) {
        $product['id'] = (int)$product['id'];
        $product['quantity_type'] = trim($product['quantity_type']);
        $product['image_url'] = !empty($product['image_url']) ? $product['image_url'] : null;
        $product['total_stock_in'] = (float)$product['total_stock_in'];
        $product['total_stock_out'] = (float)$product['total_stock_out'];
        $product['current_stock'] = (float)$product['current_stock'];
        
        // Add transactions array for this product
        $product['transactions'] = $transactionsByProduct[(int)$product['id']] ?? [];
    }
    
    $response = [
        'products' => $products
    ];
    
    sendJsonResponse($response);
    
} catch (Exception $e) {
    sendJsonResponse(['error' => 'Failed to fetch products: ' . $e->getMessage()], 500);
}
?>
