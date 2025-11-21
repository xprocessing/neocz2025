<?php
// ems_raw.php  —— 直接运行 php ems_raw.php 90210 2.5 30 20 10

require_once 'key.php';

function ems_raw_calc($postcode, $weight_kg, $length_cm = 0, $width_cm = 0, $height_cm = 0) {
    $url   = "http://cpws.ems.com.cn/default/svc/web-service";
    $token = EMS_TOKEN;
    $key = EMS_KEY;    
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
        CURLOPT_TIMEOUT        => 15,
        CURLOPT_HTTPHEADER     => ['Content-Type: text/xml; charset=utf-8']
    ]);

    foreach (['USEA', 'USWE'] as $wh) {      // 注意：美西仓库是 USEE（不是 USWE）
        // 1. 获取渠道列表
        $params1 = json_encode(["warehouse_code"=>$wh, "country_code"=>"US"], JSON_UNESCAPED_UNICODE);
        $xml1    = str_replace(['{PARAMS}','{SERVICE}'], [$params1, 'getShippingMethod'], $xml_tpl);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $xml1);
        $resp1   = curl_exec($ch);
        preg_match('#<response>(.*?)</response>#s', $resp1, $m);
        $raw1    = $m[1] ?? '无响应';

        echo "=== 渠道列表原始返回 $wh ===\n";
        echo $raw1 . "\n\n";

        // 2. 用第一个渠道试算运费
        $channels = json_decode($raw1, true);
        if (isset($channels['ask']) && $channels['ask']==='Success' && !empty($channels['data'])) {
            $code = $channels['data'][0]['code'];   // 第一个渠道

            $params2 = json_encode([
                "warehouse_code"   => $wh,
                "country_code"     => "US",
                "postcode"         => (string)$postcode,
                "shipping_method"  => $code,
                "type"             => 1,
                "weight"           => round((float)$weight_kg, 3),
                "length"           => round((float)$length_cm ?: 0, 1),
                "width"            => round((float)$width_cm  ?: 0, 1),
                "height"           => round((float)$height_cm ?: 0, 1),
                "pieces"           => 1
            ], JSON_UNESCAPED_UNICODE);

            $xml2 = str_replace(['{PARAMS}','{SERVICE}'], [$params2, 'getCalculateFee'], $xml_tpl);
            curl_setopt($ch, CURLOPT_POSTFIELDS, $xml2);
            $resp2 = curl_exec($ch);
            preg_match('#<response>(.*?)</response>#s', $resp2, $m);
            $raw2 = $m[1] ?? '无响应';

            echo "=== 运费试算原始返回 $wh  渠道:$code ===\n";
            echo $raw2 . "\n";
            echo str_repeat("=", 60) . "\n\n";
        }
    }
    curl_close($ch);
}

// ============ 命令行直接运行 ============
if (php_sapi_name() === 'cli' && $argc >= 3) {
    ems_raw_calc($argv[1], $argv[2], $argv[3]??0, $argv[4]??0, $argv[5]??0);
    // 用法：php ems_raw.php 90210 2.5 35 25 15
} else {
    // 浏览器访问也行（手动改参数）
    ems_raw_calc('90210', 2.5, 35, 25, 15);
}