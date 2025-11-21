const SERVICE_URL = "http://cpws.ems.com.cn/default/svc/web-service";
const APP_TOKEN = "dbe7326b9e0727b6078870408f797e32";
const APP_KEY = "567ee1986b53bfe5355da9b94b8f0bfa";

async function emsCalc(postcode, weightKg, length = 0, width = 0, height = 0) {
    const call = async (service, params) => {
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

        const r = await fetch(SERVICE_URL, { method: "POST", headers: { "Content-Type": "text/xml" }, body: xml });
        const t = await r.text();
        const json = t.match(/<response>([\s\S]*?)<\/response>/)?.[1];
        return json ? JSON.parse(json) : null;
    };

    const warehouses = ["USEA", "USEE"];
    const result = { USEA: null, USEE: null };

    for (const wh of warehouses) {
        try {
            const channels = await call("getShippingMethod", { warehouse_code: wh, country_code: "US" });
            if (!channels?.ask === "Success") continue;

            const fees = await Promise.all(
                channels.data.map(c => call("getCalculateFee", {
                    warehouse_code: wh,
                    country_code: "US",
                    postcode: String(postcode),
                    shipping_method: c.code,
                    type: 1,
                    weight: +weightKg.toFixed(3),
                    length: +length.toFixed(1),
                    width: +width.toFixed(1),
                    height: +height.toFixed(1),
                    pieces: 1
                }).then(r => r?.ask === "Success" ? +r.data[0].totalAmount : null))
            );

            const min = Math.min(...fees.filter(f => f > 0));
            result[wh] = isFinite(min) ? min : null;
        } catch { }
    }

    return result;
}

// 示例直接返回 JSON
 emsCalc("90210", 2.5, 30, 20, 10).then(console.log);
// → { USEA: 78.5, USEE: 65.3 }