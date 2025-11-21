<?php
// ems_api.php
// 用法：https://your.com/ems_api.php?postcode=90210&weight=2.5&l=30&w=20&h=10
//     或 CLI：php ems_api.php 90210 2.5 30 20 10

require_once 'key.php'; // 必须包含 EMS_TOKEN 和 EMS_KEY

header('Content-Type: application/json; charset=utf-8');

function get_ems_fee($postcode, $weight_kg, $length_cm = 0, $width_cm = 0, $height_cm = 0) {
    $url   = "https://cpws.ems.com.cn/default/svc/web-service";
    $token = EMS_TOKEN;
    $key   = EMS_KEY;

    $xml_tpl = <<<XML
<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns1="http://www.example.org/Ec/">
  <SOAP-ENV:Body>
    <ns1:callService>
      <paramsJson>{PARAMS}</paramsJson>
      <appToken>$token</appToken>
      <appKey>$key</appKey>
      <service>{SERVICE}</service>
    </ns1:callService>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>
XML;

    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL            => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_TIMEOUT        => 20,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_HTTPHEADER     => ['Content-Type: text/xml; charset=utf-8'],
    ]);

    $result = ['USEA' => [], 'USEE' => []];
    $warehouses = ['USEA', 'USEE'];

    foreach ($warehouses as $wh) {
        // 1. 获取渠道列表
        $params1 = json_encode(["warehouse_code" => $wh, "country_code" => "US"], JSON_UNESCAPED_UNICODE);
        $xml1 = str_replace(['{PARAMS}', '{SERVICE}'], [$params1, 'getShippingMethod'], $xml_tpl);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $xml1);
        $resp1 = curl_exec($ch);

        $json1 = extract_response($resp1);
        $data1 = json_decode($json1, true);

        if (!$data1 || !isset($data1['ask']) || $data1['ask'] !== 'Success' || empty($data1['data'])) {
            continue; // 该仓库无渠道，直接跳过
        }

        // 取前 5 个常用渠道（避免全是偏远渠道）
        foreach (array_slice($data1['data'], 0, 5) as $chan) {
            $code = $chan['code'];
            $name = $chan['name'] ?? $code;

            $params2 = json_encode([
                "warehouse_code"  => $wh,
                "country_code"    => "US",
                "postcode"        => (string)$postcode,
                "shipping_method" => $code,
                "type"            => 1,
                "weight"          => round((float)$weight_kg, 3),
                "length"          => max(1, round((float)$length_cm ?: 1, 1)),
                "width"           => max(1, round((float)$width_cm  ?: 1, 1)),
                "height"          => max(1, round((float)$height_cm ?: 1, 1)),
                "pieces"          => 1
            ], JSON_UNESCAPED_UNICODE);

            $xml2 = str_replace(['{PARAMS}', '{SERVICE}'], [$params2, 'getCalculateFee'], $xml_tpl);
            curl_setopt($ch, CURLOPT_POSTFIELDS, $xml2);
            $resp2 = curl_exec($ch);

            $json2 = extract_response($resp2);
            $fee   = json_decode($json2, true);

            if ($fee && $fee['ask'] === 'Success' && isset($fee['data']['fee'])) {
                $total = (float)$fee['data']['fee'];
                $proc  = (float)($fee['data']['processing_fee'] ?? 0);
                $freight = $total - $proc;
                $aging = $fee['data']['aging'] ?? '';

                $result[$wh][] = [
                    "code"           => $code,
                    "name"           => $name,
                    "fee"            => $total,
                    "freight"        => $freight,
                    "processing_fee" => $proc,
                    "aging"          => $aging
                ];
            }
        }
    }

    curl_close($ch);
    return $result;
}

// 提取 <response> 里的内容并去 CDATA
function extract_response($xml) {
    if (preg_match('#<response[^>]*>(.*?)</response>#s', $xml, $m)) {
        $str = trim($m[1]);
        return preg_replace('#^<!\[CDATA\[|\]\]>$#', '', $str);
    }
    return '';
}

// ============ 主入口 ============
if (php_sapi_name() === 'cli') {
    // CLI 模式：php ems_api.php 90210 2.5 30 20 10
    if ($argc < 3) die("用法: php " . basename(__FILE__) . " 邮编 重量kg [长cm 宽cm 高cm]\n");
    $result = get_ems_fee($argv[1], $argv[2], $argv[3]??0, $argv[4]??0, $argv[5]??0);
    echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) . PHP_EOL;
} else {
    // Web 模式
    $postcode = $_GET['postcode'] ?? $_POST['postcode'] ?? '';
    $weight   = $_GET['weight']   ?? $_POST['weight']   ?? '';
    $l = $_GET['l'] ?? $_POST['l'] ?? 0;
    $w = $_GET['w'] ?? $_POST['w'] ?? 0;
    $h = $_GET['h'] ?? $_POST['h'] ?? 0;

    if (!$postcode || !$weight) {
        echo json_encode(['error' => '参数缺失：postcode 和 weight 必填'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $result = get_ems_fee($postcode, $weight, $l, $w, $h);
    echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
}