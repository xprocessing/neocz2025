<?php
/**
 * 运德供应链运费试算API PHP测试方法
 * 接口文档参考：开放API接口文档–亚马逊FBA头程海运_美国海外仓_跨境电商物流-运德供应链
 * 接口地址：http://fg.wedoexpress.com/api.php?mod=apiManage&act=getShipFeeQuery
 * 请求方法：POST
 * 数据格式：form-data
 */

function testYundeShipFeeQuery() {
    // -------------------------- 1. 基础配置（需根据实际情况修改）--------------------------
    $apiUrl = 'http://fg.wedoexpress.com/api.php?mod=apiManage&act=getShipFeeQuery'; // 接口地址
    $userAccount = 'YOUR_USER_ACCOUNT'; // 替换为运德提供的用户标识（如WD2024XXXX）
    $signKey = 'YOUR_SIGN_KEY'; // 替换为运德提供的签名密钥（需联系客服获取）

    // -------------------------- 2. 封装content参数（运费试算核心信息）--------------------------
    // 文档要求：content为JSON格式，包含渠道、目的地、货物规格等必填项
    $contentData = [
        'channelCode' => 'USZXT,WDFEDEX', // 运输渠道简码（多个用英文逗号分隔，文档示例值）
        'country' => 'US', // 国家简码（文档示例：美国=US）
        'city' => 'LOS ANGELES', // 收件人城市（英文，文档示例）
        'postcode' => '90001', // 收件人邮编（文档示例）
        'weight' => '0.079', // 货物重量（kg，文档示例）
        'length' => '26', // 货物长度（cm，文档示例）
        'width' => '20', // 货物宽度（cm，文档示例）
        'height' => '2', // 货物高度（cm，文档示例）
        'signatureService' => 0 // 签名服务（可选，0=无，1=成人签名，2=直接签名，文档示例为0）
    ];
    // 将content数组转为JSON字符串（需确保无中文转义问题）
    $contentJson = json_encode($contentData, JSON_UNESCAPED_UNICODE);

    // -------------------------- 3. 生成签名（sign参数，安全验证核心）--------------------------
    // 签名规则：文档未明确，此处按行业通用规则（userAccount + contentJson + signKey）MD5加密（需与运德确认实际规则）
    $signSource = $userAccount . $contentJson . $signKey; // 签名原始串
    $sign = md5($signSource); // 生成MD5签名（示例值格式：48C9D00039EDA8A5DFBD19F9643D4F44）

    // -------------------------- 4. 封装form-data请求参数（顶层参数）--------------------------
    // 文档要求：form-data格式包含userAccount、sign、content三个必填项
    $postData = [
        'userAccount' => $userAccount,
        'sign' => $sign,
        'content' => $contentJson
    ];

    // -------------------------- 5. 发送CURL POST请求（适配form-data格式）--------------------------
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $apiUrl);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $postData); // CURL自动处理form-data格式
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true); // 不直接输出响应内容
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // 开发环境暂关闭SSL验证（生产环境需开启）
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);

    // 执行请求并获取响应
    $response = curl_exec($ch);
    $curlError = curl_error($ch); // 获取CURL错误信息
    curl_close($ch);

    // -------------------------- 6. 解析响应结果 --------------------------
    echo "=== 运德供应链运费试算API测试结果 ===\n";
    // 先判断CURL请求是否成功
    if ($curlError) {
        echo "CURL请求失败：" . $curlError . "\n";
        return false;
    }

    // 解析JSON响应（接口返回为JSON格式，文档示例参考）
    $responseData = json_decode($response, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        echo "响应格式错误（非JSON）：" . $response . "\n";
        return false;
    }

    // 按文档错误码判断接口逻辑是否成功（errCode=200为成功）
    if (isset($responseData['errCode']) && $responseData['errCode'] === '200') {
        echo "接口请求成功！\n";
        echo "响应信息：" . $responseData['errMsg'] . "\n";
        // 解析运费数据（文档示例中data字段包含各渠道运费）
        if (isset($responseData['data']) && !empty($responseData['data'])) {
            $feeData = $responseData['data'];
            echo "运费详情：\n";
            foreach ($feeData as $channel => $channelFee) {
                echo "- 渠道（" . $channel . "）：\n";
                echo "  - 主记录编码：" . $channelFee['mainRecordCode'] . "\n";
                echo "  - 记录编码：" . $channelFee['recordCode'] . "\n";
                echo "  - 运费：" . $channelFee['shipFee'] . " " . $channelFee['currency'] . "\n";
            }
        } else {
            echo "未获取到运费数据（data字段为空）\n";
        }
    } else {
        echo "接口请求失败！\n";
        echo "错误码：" . (isset($responseData['errCode']) ? $responseData['errCode'] : '未知') . "\n";
        echo "错误信息：" . (isset($responseData['errMsg']) ? $responseData['errMsg'] : '未知') . "\n";
        echo "完整响应：" . json_encode($responseData, JSON_PRETTY_PRINT) . "\n";
    }

    return true;
}

// 执行测试方法
testYundeShipFeeQuery();
?>