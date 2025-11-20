const axios = require('axios');
const xml2js = require('xml2js');
const he = require('he'); // 用于HTML编码（需先安装：npm install he xml2js axios）

/**
 * 运费试算主函数
 * @param {Object} params - 试算参数
 * @param {string} params.destinationZip - 目的地邮编（美国5位数字）
 * @param {number} params.weight - 商品重量（kg，保留2位小数）
 * @param {number} params.length - 商品长度（cm，保留2位小数）
 * @param {number} params.width - 商品宽度（cm，保留2位小数）
 * @param {number} params.height - 商品高度（cm，保留2位小数）
 * @param {number} [params.containBattery=0] - 货物属性（0=普货，1=含电，2=纯电）
 * @returns {Promise<Object>} 试算结果（美东/美西仓库最低运费）
 */
async function calculateMinFreight({
  destinationZip,
  weight,
  length,
  width,
  height,
  containBattery = 0
}) {
  // 1. 基础配置（按API文档固定参数）
  const config = {
    appToken: 'dbe7326b9e0727b6078870408f797e32',
    appKey: '567ee1986b53bfe5355da9b94b8f0bfa',
    serviceUrl: 'http://cpws.ems.com.cn/default/svc/web-service', // 正式线地址
    warehouses: {
      '美东仓库': 'USEA',
      '美西仓库': 'USEE'
    }
  };

  // 2. 初始化结果对象
  const minFreights = {};

  // 3. 遍历两个仓库，分别计算最低运费
  for (const [warehouseName, warehouseCode] of Object.entries(config.warehouses)) {
    console.log(`\n=== 开始计算【${warehouseName}】(${warehouseCode}) 运费 ===`);
    
    // 3.1 获取当前仓库的可用运输方式（按仓库单独请求，避免复用不匹配）
    const shippingMethods = await getShippingMethods({
      appToken: config.appToken,
      appKey: config.appKey,
      serviceUrl: config.serviceUrl,
      warehouseCode
    });

    if (!shippingMethods.length) {
      minFreights[warehouseName] = {
        最低运费: null,
        说明: `未获取到${warehouseName}的可用运输方式`
      };
      continue;
    }

    // 3.2 遍历运输方式，试算运费
    const freightList = [];
    for (let i = 0; i < shippingMethods.length; i++) {
      const method = shippingMethods[i];
      const methodCode = method.code;
      const methodName = method.name;
      console.log(`  正在试算运输方式 ${i + 1}/${shippingMethods.length}：${methodName}（${methodCode}）`);

      // 3.3 构造运费试算请求XML（补充必选参数+HTML编码）
      const requestXml = buildCalculateFeeXml({
        appToken: config.appToken,
        appKey: config.appKey,
        warehouseCode,
        destinationZip,
        shippingMethod: methodCode,
        weight: Number(weight.toFixed(2)), // 保留2位小数
        length: Number(length.toFixed(2)),
        width: Number(width.toFixed(2)),
        height: Number(height.toFixed(2)),
        containBattery
      });

      // 3.4 发送请求并解析结果
      const responseXml = await sendSoapRequest(config.serviceUrl, requestXml);
      if (!responseXml) {
        console.log(`    ❌ 该运输方式请求失败，跳过`);
        continue;
      }

      const totalFee = await parseCalculateFeeResponse(responseXml, methodName);
      if (totalFee !== null && !isNaN(totalFee)) {
        freightList.push({
          shippingMethodCode: methodCode,
          shippingMethodName: methodName,
          totalFee: Number(totalFee.toFixed(2)) // 保留2位小数
        });
        console.log(`    ✅ 试算成功，运费：${totalFee.toFixed(2)}`);
      }
    }

    // 3.5 筛选当前仓库的最低运费
    if (freightList.length) {
      const minFreight = freightList.sort((a, b) => a.totalFee - b.totalFee)[0]; // 按运费升序排序，取第一个
      minFreights[warehouseName] = {
        最低运费: minFreight.totalFee,
        对应运输方式代码: minFreight.shippingMethodCode,
        对应运输方式名称: minFreight.shippingMethodName,
        仓库代码: warehouseCode,
        说明: `共试算${freightList.length}种有效运输方式`
      };
      console.log(`=== 【${warehouseName}】最低运费：${minFreight.totalFee.toFixed(2)}（${minFreight.shippingMethodName}）===`);
    } else {
      minFreights[warehouseName] = {
        最低运费: null,
        说明: `获取到${shippingMethods.length}种运输方式，但均试算失败`
      };
    }
  }

  return minFreights;
}

/**
 * 获取指定仓库的可用运输方式
 * @param {Object} params - 请求参数
 * @returns {Promise<Array>} 运输方式列表（含code/name等）
 */
async function getShippingMethods({ appToken, appKey, serviceUrl, warehouseCode }) {
  console.log(`  正在获取${warehouseCode}仓库的运输方式...`);
  
  // 构造请求参数（JSON序列化后HTML编码）
  const params = { warehouseCode };
  const paramsJson = he.encode(JSON.stringify(params)); // HTML编码，避免特殊字符破坏XML

  // 构造SOAP请求XML
  const requestXml = `<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns1="http://www.example.org/Ec/">
  <SOAP-ENV:Body>
    <ns1:callService>
      <paramsJson>${paramsJson}</paramsJson>
      <appToken>${appToken}</appToken>
      <appKey>${appKey}</appKey>
      <service>getShippingMethod</service>
    </ns1:callService>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`;

  // 发送请求并解析
  const responseXml = await sendSoapRequest(serviceUrl, requestXml);
  if (!responseXml) return [];

  try {
    // 解析XML为JSON
    const parser = new xml2js.Parser({ explicitArray: false });
    const result = await parser.parseStringPromise(responseXml);
    const responseJsonStr = result['SOAP-ENV:Envelope']['SOAP-ENV:Body']['ns1:callServiceResponse'].response;
    console.log(`  运输方式接口返回原始数据：${responseJsonStr.slice(0, 200)}...`);

    const responseJson = JSON.parse(responseJsonStr);
    if (responseJson.ask === 'Success') {
      const shippingMethods = responseJson.data || [];
      console.log(`  成功获取${shippingMethods.length}种运输方式`);
      return shippingMethods;
    } else {
      const errMsg = responseJson.message || '未知错误';
      const errDetail = responseJson.Error || {};
      console.log(`  ❌ 获取运输方式失败：${errMsg}，错误详情：${JSON.stringify(errDetail)}`);
      return [];
    }
  } catch (error) {
    console.log(`  ❌ 解析运输方式响应失败：${error.message}，原始XML：${responseXml.slice(0, 300)}...`);
    return [];
  }
}

/**
 * 构造运费试算请求XML
 * @param {Object} params - 请求参数
 * @returns {string} SOAP请求XML字符串
 */
function buildCalculateFeeXml({
  appToken,
  appKey,
  warehouseCode,
  destinationZip,
  shippingMethod,
  weight,
  length,
  width,
  height,
  containBattery
}) {
  // 必选参数（严格匹配API文档类型）
  const params = {
    warehouse_code: warehouseCode,
    country_code: 'US', // 默认美国（可根据邮编扩展）
    shipping_method: shippingMethod,
    postcode: destinationZip,
    weight,
    length,
    width,
    height,
    contain_battery: containBattery
  };

  // HTML编码参数JSON（修复：避免特殊字符导致XML解析失败）
  const paramsJson = he.encode(JSON.stringify(params));

  // 构造SOAP XML（严格按文档格式，避免标签缺失）
  return `<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns1="http://www.example.org/Ec/">
  <SOAP-ENV:Body>
    <ns1:callService>
      <paramsJson>${paramsJson}</paramsJson>
      <appToken>${appToken}</appToken>
      <appKey>${appKey}</appKey>
      <service>getCalculateFee</service>
    </ns1:callService>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`;
}

/**
 * 发送SOAP请求
 * @param {string} url - 接口地址
 * @param {string} xmlData - XML请求体
 * @returns {Promise<string|null>} 接口响应XML（失败返回null）
 */
async function sendSoapRequest(url, xmlData) {
  const headers = {
    'Content-Type': 'text/xml; charset=UTF-8', // 必选请求头
    'User-Agent': 'Node.js-SOAP-Client/1.0'    // 避免部分接口拦截无UA请求
  };

  try {
    console.log(`    发送请求：URL=${url.slice(0, 50)}...，XML长度=${xmlData.length}字符`);
    const response = await axios.post(url, xmlData, {
      headers,
      timeout: 30000, // 30秒超时
      httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false }) // 临时关闭SSL验证（正式环境可删除）
    });

    console.log(`    请求响应状态码：${response.status}`);
    return response.data;
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      console.log(`    ❌ 请求超时（30秒），检查网络或接口地址`);
    } else if (error.response) {
      console.log(`    ❌ HTTP错误：${error.response.status}，响应内容：${error.response.data.slice(0, 200)}...`);
    } else if (error.request) {
      console.log(`    ❌ 无响应，检查是否能访问地址：${url}`);
    } else {
      console.log(`    ❌ 请求异常：${error.message}`);
    }
    return null;
  }
}

/**
 * 解析运费试算响应
 * @param {string} xmlData - 响应XML
 * @param {string} methodName - 运输方式名称（用于日志）
 * @returns {Promise<number|null>} 总运费（失败返回null）
 */
async function parseCalculateFeeResponse(xmlData, methodName) {
  try {
    const parser = new xml2js.Parser({ explicitArray: false });
    const result = await parser.parseStringPromise(xmlData);
    const responseJsonStr = result['SOAP-ENV:Envelope']['SOAP-ENV:Body']['ns1:callServiceResponse'].response;
    console.log(`    运费响应原始数据：${responseJsonStr.slice(0, 150)}...`);

    const responseJson = JSON.parse(responseJsonStr);
    if (responseJson.ask === 'Success') {
      const data = responseJson.data || {};
      const totalFee = data.totalFee;

      if (totalFee === undefined || totalFee === null) {
        console.log(`    ⚠️ ${methodName} 未返回总运费，data字段：${JSON.stringify(data)}`);
        return null;
      }

      // 处理字符串类型运费（如"123.45"），转为数字
      return typeof totalFee === 'string' ? parseFloat(totalFee) : totalFee;
    } else {
      const errMsg = responseJson.message || '未知失败原因';
      const errDetail = responseJson.Error || {};
      console.log(`    ❌ ${methodName} 试算失败：${errMsg}，错误码：${errDetail.errCode}，详情：${errDetail.errMessage}`);
      return null;
    }
  } catch (error) {
    if (error.name === 'Xml2JsError') {
      console.log(`    ❌ 解析XML失败，原始数据：${xmlData.slice(0, 200)}...`);
    } else if (error instanceof SyntaxError) {
      console.log(`    ❌ 解析JSON失败，原始响应：${responseJsonStr.slice(0, 200)}...`);
    } else {
      console.log(`    ❌ 解析异常：${error.message}`);
    }
    return null;
  }
}

// ------------------------------ 测试入口 ------------------------------
async function testCalculateFreight() {
  console.log('='.repeat(50));
  console.log('          美东/美西仓库运费试算工具（JavaScript版）          ');
  console.log('='.repeat(50));

  // 测试参数（可根据实际需求修改）
  const testParams = {
    destinationZip: '33178', // 美国佛罗里达州迈阿密有效邮编
    weight: 0.5,             // 0.5kg
    length: 30.0,            // 30cm
    width: 25.0,             // 25cm
    height: 10.0,            // 10cm
    containBattery: 0        // 0=普货
  };

  console.log(`\n测试参数：`);
  Object.entries(testParams).forEach(([key, val]) => {
    console.log(`  ${key}: ${val}`);
  });

  // 执行试算并打印结果
  try {
    const result = await calculateMinFreight(testParams);
    console.log('\n' + '='.repeat(50));
    console.log('                    最终运费试算结果                    ');
    console.log('='.repeat(50));
    console.log(JSON.stringify(result, null, 2)); // 格式化输出
  } catch (error) {
    console.log(`\n❌ 试算流程异常：${error.message}`);
  }
}

// 启动测试
testCalculateFreight();