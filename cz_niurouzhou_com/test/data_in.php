<?php
//允许跨域
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Content-Length, Accept-Encoding, X-Requested-With");
header("Content-Type: application/json");   

echo json_encode(array("test" => 1, "test2" => 2));
?>