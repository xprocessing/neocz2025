<?php
// ems_api.php
// 示例调用：http://yourdomain.com/ems_api.php?postcode=90210&weight=2.5&length=35&width=25&height=15
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Content-Length, Accept-Encoding, X-Requested-With");
header("Content-Type: application/json");  

require_once 'key.php';   // 必须包含 EMS_TOKEN 和 EMS_KEY 两个常量

header('Content-Type: application/json; charset=utf-8');

// ============ 参数校验 ============
$postcode = trim($_GET['postcode'] ?? '');
$weight   = floatval($_GET['weight'] ?? 0);
$length   = floatval($_GET['length'] ?? 0);
$width    = floatval($_GET['width'] ?? 0);
$height   = floatval($_GET['height'] ?? 0);

if ($postcode === '' || $weight <= 0) {
    echo json_encode([
        'success' => false,
        'message' => 'postcode 和 weight 为必填参数，且 weight 必须大于 0'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// ============ 公共函数 ============
function callEmsSoap($service, $paramsJson)
{
    $url   = "http://cpws.ems.com.cn/default/svc/web-service";
    $token = EMS_TOKEN;
    $key   = EMS_KEY;

    $xml = <<<XML
<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns1="http://www.example.org/Ec/">
  <SOAP-ENV:Body>
    <ns1:callService>
      <paramsJson>{$paramsJson}</paramsJson>
      <appToken>{$token}</appToken>
      <appKey>{$key}</appKey>
      <service>{$service}</service>
    </ns1:callService>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>
XML;

    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL            => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_TIMEOUT        => 15,
        CURLOPT_POSTFIELDS     => $xml,
        CURLOPT_HTTPHEADER     => ['Content-Type: text/xml; charset=utf-8'],
    ]);

    $resp = curl_exec($ch);
    curl_close($ch);

    // 提取 <response>...</response> 里的内容
    preg_match('#<response>(.*?)</response>#s', $resp, $m);
    return $m[1] ?? '';
}

// ============ 主逻辑 ============
$result = [
    'success'     => true,
    'postcode'    => $postcode,
    'weight_kg'   => $weight,
    'dimensions'  => ['length' => $length, 'width' => $width, 'height' => $height],
    'warehouses'  => []
];

foreach (['USEA', 'USEE'] as $wh) {   // USEE 是美西仓库（原注释里写错了的 USWE）
    $warehouseResult = [
        'warehouse_code' => $wh,
        'channels_raw'   => '',
        'fee_calc_raw'   => '',
        'fee_calc_json'  => null,
        'error'          => ''
    ];

    // 1. 获取渠道列表
    $params1 = json_encode(["warehouse_code" => $wh, "country_code" => "US"], JSON_UNESCAPED_UNICODE);
    $raw1    = callEmsSoap('getShippingMethod', $params1);
    $warehouseResult['channels_raw'] = $raw1;

    $channels = json_decode($raw1, true);
    if (!isset($channels['ask']) || $channels['ask'] !== 'Success' || empty($channels['data'])) {
        $warehouseResult['error'] = '获取渠道失败或无可用渠道';
        $result['warehouses'][] = $warehouseResult;
        continue;
    }

    // 取第一个渠道进行运费试算
    $code = $channels['data'][0]['code'];

    $params2 = json_encode([
        "warehouse_code"  => $wh,
        "country_code"    => "US",
        "postcode"        => (string)$postcode,
        "shipping_method" => $code,
        "type"            => 1,
        "weight"          => round($weight, 3),
        "length"          => round($length ?: 0, 1),
        "width"           => round($width  ?: 0, 1),
        "height"          => round($height ?: 0, 1),
        "pieces"          => 1
    ], JSON_UNESCAPED_UNICODE);

    $raw2 = callEmsSoap('getCalculateFee', $params2);
    $warehouseResult['fee_calc_raw'] = $raw2;

    // 尝试把运费返回转成数组，方便前端直接使用（如果不是标准 json 也会保留原始字符串）
    $feeJson = json_decode($raw2, true);
    if (json_last_error() === JSON_ERROR_NONE) {
        $warehouseResult['fee_calc_json'] = $feeJson;
    }

    $result['warehouses'][] = $warehouseResult;
}

echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);