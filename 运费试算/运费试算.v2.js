/// 开发文档 https://cpws.ems.com.cn/default/index/api-document

//service地址(curl数据) 正式线： http://cpws.ems.com.cn/default/svc/web-service

//appToken：  dbe7326b9e0727b6078870408f797e32
//appKey：  567ee1986b53bfe5355da9b94b8f0bfa
//美东仓库 仓库代码： USEA， 美西仓库 仓库代码：USEE
//用python 开发一个运费试算API调用的js函数，参数为目的地邮编，商品重量和体积，输出 美东仓库 美西仓库 分别最低的运费

/**
 * EMS 海外仓运费试算（JS 版）
 * 自动获取两个仓库（USEA 美东、USEE 美西）所有可用渠道，返回各自最低运费
 *
 * @param {string} postcode      目的地邮编（如 "90210"）
 * @param {number} weightKg      重量（kg）
 * @param {number} lengthCm      长（cm，可选）
 * @param {number} widthCm       宽（cm，可选）
 * @param {number} heightCm      高（cm，可选）
 * @returns {Promise<Object>}    { USEA: { fee, channel }, USEE: { fee, channel } }
 */
async function emsShippingCalc(postcode, weightKg, lengthCm = 0, widthCm = 0, heightCm = 0) {
    const SERVICE_URL = "http://cpws.ems.com.cn/default/svc/web-service";
    const APP_TOKEN   = "dbe7326b9e0727b6078870408f797e32";
    const APP_KEY     = "567ee1986b53bfe5355da9b94b8f0bfa";

    const warehouses = [
        { code: "USEA", name: "美东仓" },
        { code: "USEE", name: "美西仓" }
    ];

    // 统一的 SOAP 调用
    async function callSoap(service, params) {
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns1="http://www.example.org/Ec/">
   <SOAP-ENV:Body>
      <ns1:callService>
         <paramsJson>${JSON.stringify(params)}</paramsJson>
         <appToken>${APP_TOKEN}</appToken>
         <appKey>${APP_KEY}</appKey>
         <service>${service}</service>
      </ns1:callService>
   </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`;

        const res = await fetch(SERVICE_URL, {
            method: "POST",
            headers: { "Content-Type": "text/xml; charset=utf-8" },
            body: xml
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const text = await res.text();
        const match = text.match(/<response>([\s\S]*?)<\/response>/);
        if (!match) throw new Error("解析响应失败");

        return JSON.parse(match[1]);
    }

    // 获取某个仓库的所有可用渠道代码
    async function getAvailableChannels(warehouseCode) {
        const params = { warehouse_code: warehouseCode, country_code: "US" };
        const data = await callSoap("getShippingMethod", params);
        if (data.ask !== "Success") throw new Error(data.message || "获取渠道失败");
        return data.data.map(item => item.code);
    }

    // 计算单个仓库 + 单个渠道的运费
    async function calcOne(warehouseCode, channelCode) {
        const params = {
            warehouse_code: warehouseCode,
            country_code: "US",
            postcode: String(postcode).trim(),
            shipping_method: channelCode,
            type: 1,
            weight: Number(weightKg.toFixed(3)),
            length: Number((lengthCm || 0).toFixed(1)),
            width:  Number((widthCm  || 0).toFixed(1)),
            height: Number((heightCm || 0).toFixed(1)),
            pieces: 1
        };

        const data = await callSoap("getCalculateFee", params);
        if (data.ask !== "Success") return null; // 该渠道可能不支持此邮编
        const feeInfo = data.data[0];
        return {
            total: Number(feeInfo.totalAmount || 0),
            channel: feeInfo.sm_name_cn || feeInfo.sm_code,
            code: feeInfo.sm_code
        };
    }

    // 主逻辑：并行处理两个仓库
    const result = {};

    for (const wh of warehouses) {
        try {
            const channels = await getAvailableChannels(wh.code);
            if (channels.length === 0) {
                result[wh.code] = { fee: null, channel: "无可用渠道", warehouse: wh.name };
                continue;
            }

            // 并行计算所有渠道的运费，取最低的
            const promises = channels.map(ch => calcOne(wh.code, ch));
            const results = await Promise.all(promises);
            const valid = results.filter(r => r && r.total > 0);

            if (valid.length === 0) {
                result[wh.code] = { fee: null, channel: "全部渠道不可用", warehouse: wh.name };
                continue;
            }

            valid.sort((a, b) => a.total - b.total);
            const best = valid[0];

            result[wh.code] = {
                fee: best.total,
                channel: best.channel,
                code: best.code,
                warehouse: wh.name
            };
        } catch (err) {
            result[wh.code] = { fee: null, channel: err.message, warehouse: wh.name };
        }
    }

    return result;
}

// ====================== 使用示例 ======================
emsShippingCalc("90210", 2.5, 35, 25, 15)
    .then(res => {
        console.log("EMS 海外仓最低运费对比：");
        console.log(`美东仓 (USEA) → ¥${res.USEA.fee}  (${res.USEA.channel})`);
        console.log(`美西仓 (USEE) → ¥${res.USEE.fee}  (${res.USEE.channel})`);

        // 推荐更便宜的仓库
        if (res.USEA.fee !== null && res.USEE.fee !== null) {
            const cheap = res.USEA.fee < res.USEE.fee ? "美东仓" : "美西仓";
            const diff = Math.abs(res.USEA.fee - res.USEE.fee);
            console.log(`\n推荐使用 ${cheap}，可省 ¥${diff.toFixed(2)}`);
        }
    })
    .catch(err => console.error("运费试算失败：", err));