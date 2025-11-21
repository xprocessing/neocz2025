import re
import json
import requests

def ems_all_channels():
    """只查两个仓库的所有可用渠道，直接狂吐原始 JSON（一点都不处理）"""
    url = "http://cpws.ems.com.cn/default/svc/web-service"
    xml = '''<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns1="http://www.example.org/Ec/">
  <SOAP-ENV:Body>
    <ns1:callService>
      <paramsJson>{}</paramsJson>
      <appToken>dbe7326b9e0727b6078870408f797e32</appToken>
      <appKey>567ee1986b53bfe5355da9b94b8f0bfa</appKey>
      <service>getShippingMethod</service>
    </ns1:callService>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>'''

    for wh in ["USEA", "USEE"]:
        params = json.dumps({"warehouse_code": wh, "country_code": "US"}, separators=(',',':'))
        resp = requests.post(url, data=xml.format(params)).text
        raw = re.search(r"<response>([\s\S]*?)</response>", resp).group(1)
        print(f"【{wh}】所有可用渠道原始返回：")
        print(raw)
        print("\n" + "="*100 + "\n")

# 一行运行，立即看到两个仓库全部真实渠道代码
ems_all_channels()