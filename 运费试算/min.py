import re
import json
import requests

def ems_raw_calc(postcode: str, weight_kg: float, length_cm=0, width_cm=0, height_cm=0):
    """
    极简版：什么都不处理，直接把 EMS 原始 JSON 字符串打印出来
    调用一次就直接输出原始响应（两个仓库各打一次接口）
    """
    SERVICE_URL = "http://cpws.ems.com.cn/default/svc/web-service"
    APP_TOKEN = "dbe7326b9e0727b6078870408f797e32"
    APP_KEY   = "567ee1986b53bfe5355da9b94b8f0bfa"

    xml_template = """<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns1="http://www.example.org/Ec/">
  <SOAP-ENV:Body>
    <ns1:callService>
      <paramsJson>{params}</paramsJson>
      <appToken>{token}</appToken>
      <appKey>{key}</appKey>
      <service>{service}</service>
    </ns1:callService>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>"""

    s = requests.Session()

    for warehouse in ["USEA", "USWE"]:
        # 1. 先拿渠道列表（原始返回）
        params1 = json.dumps({"warehouse_code": warehouse, "country_code": "US"}, separators=(',', ':'))
        r1 = s.post(SERVICE_URL, data=xml_template.format(params=params1, token=APP_TOKEN, key=APP_KEY, service="getShippingMethod"))
        match1 = re.search(r"<response>([\s\S]*?)</response>", r1.text)
        print("=== 渠道列表原始返回", warehouse, "===")
        print(match1.group(1) if match1 else "无响应")
        print()

        # 2. 直接用一个常用渠道试算（这里固定用第一个渠道，你也可以改）
        if match1:
            channels = json.loads(match1.group(1))
            if channels.get("ask") == "Success" and channels.get("data"):
                channel_code = channels["data"][0]["code"]
                params2 = json.dumps({
                    "warehouse_code": warehouse,
                    "country_code": "US",
                    "postcode": str(postcode),
                    "shipping_method": channel_code,
                    "type": 1,
                    "weight": round(weight_kg, 3),
                    "length": round(length_cm or 0, 1),
                    "width": round(width_cm or 0, 1),
                    "height": round(height_cm or 0, 1),
                    "pieces": 1
                }, separators=(',', ':'))

                r2 = s.post(SERVICE_URL, data=xml_template.format(params=params2, token=APP_TOKEN, key=APP_KEY, service="getCalculateFee"))
                match2 = re.search(r"<response>([\s\S]*?)</response>", r2.text)
                print("=== 运费试算原始返回", warehouse, f"渠道:{channel_code} ===")
                print(match2.group(1) if match2 else "无响应")
                print("\n" + "="*60 + "\n")

# 一行调用，直接狂打原始数据
ems_raw_calc("90210", 2.5, 30, 20, 10)