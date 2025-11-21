/// https://cpws.ems.com.cn/default/index/api-document
//appToken：  dbe7326b9e0727b6078870408f797e32
//appKey：  567ee1986b53bfe5355da9b94b8f0bfa
//开发一个EMS运费试算API调用的js函数，参数为目的地邮编，商品重量和体积，输出运费
//美西仓库 美东仓库 仓库代码： USEA  USEE
/**
 * EMS 运费试算 API 调用函数
 * @param {string} destinationPostcode - 目的地邮编 (e.g., '90210')
 * @param {number} weight - 商品重量 (kg, e.g., 1.5)
 * @param {number} [length=0] - 包裹长度 (cm, 可选)
 * @param {number} [width=0] - 包裹宽度 (cm, 可选)
 * @param {number} [height=0] - 包裹高度 (cm, 可选)
 * @returns {Promise<Object>} Promise 解析为运费结果 JSON，或 reject 错误
 */
function calculateEMSShippingFee(destinationPostcode, weight, length = 0, width = 0, height = 0) {
  const appToken = 'dbe7326b9e0727b6078870408f797e32';
  const appKey = '567ee1986b53bfe5355da9b94b8f0bfa';
  const serviceUrl = 'http://cpws.ems.com.cn/default/svc/web-service'; // 正式环境
  const warehouseCode = 'USEA'; // 示例仓库代码 (需替换为实际)
  const countryCode = 'US'; // 示例目的国家 (US)
  const shippingMethod = 'USPS-LWPARCEL'; // 示例运输方式 (需替换为实际)

  // 构建 paramsJson
  const paramsJson = {
    warehouse_code: warehouseCode,
    country_code: countryCode,
    shipping_method: shippingMethod,
    type: 1,
    weight: weight.toFixed(3), // 保留3位小数
    postcode: destinationPostcode,
    ...(length > 0 && { length: length.toFixed(1) }),
    ...(width > 0 && { width: width.toFixed(1) }),
    ...(height > 0 && { height: height.toFixed(1) })
  };

  // SOAP XML 请求体
  const soapRequest = `<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns1="http://www.example.org/Ec/">
  <SOAP-ENV:Body>
    <ns1:callService>
      <paramsJson>${JSON.stringify(paramsJson)}</paramsJson>
      <appToken>${appToken}</appToken>
      <appKey>${appKey}</appKey>
      <service>getCalculateFee</service>
    </ns1:callService>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', serviceUrl, true);
    xhr.setRequestHeader('Content-Type', 'text/xml; charset=utf-8');
    // 可选：添加 SOAPAction 头，若 API 要求
    // xhr.setRequestHeader('SOAPAction', 'http://www.example.org/Ec/callService');

    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            // 解析 SOAP 响应，提取 JSON 数据（假设 data 在 <paramsJson> 或指定节点；实际需根据响应调整）
            const responseText = xhr.responseText;
            // 简单提取：查找 JSON 字符串（生产中用 XML 解析器如 DOMParser）
            const jsonMatch = responseText.match(/<paramsJson>(.*?)<\/paramsJson>/s);
            if (jsonMatch) {
              const result = JSON.parse(jsonMatch[1]);
              resolve(result); // { ask: 'Success', message: '', data: [...] }
            } else {
              resolve({ ask: 'Failure', message: 'No JSON data found', data: [] });
            }
          } catch (parseError) {
            reject(new Error(`Parse error: ${parseError.message}`));
          }
        } else {
          reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
        }
      }
    };

    xhr.onerror = () => reject(new Error('Network error'));
    xhr.send(soapRequest);
  });
}

// 示例用法
/*
calculateEMSShippingFee('90210', 1.5, 20, 15, 10)
  .then(result => {
    console.log('运费计算结果:', result);
    if (result.ask === 'Success' && result.data.length > 0) {
      const totalFee = result.data[0].totalAmount;
      console.log(`总运费: ${totalFee} RMB`);
    }
  })
  .catch(error => console.error('错误:', error));
*/