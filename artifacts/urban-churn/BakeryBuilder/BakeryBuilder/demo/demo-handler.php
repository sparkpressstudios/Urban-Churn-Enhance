<?php
header('Content-Type: application/json');

// Simple demo handler - just returns success
$response = array(
    'success' => true,
    'data' => array(
        'message' => 'Order received! (This is a demo - no actual order was placed)'
    )
);

echo json_encode($response);
exit;
