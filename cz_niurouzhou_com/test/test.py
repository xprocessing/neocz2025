import requests
import json
import html
from xml.etree import ElementTree as ET

def calculate_min_freight(destination_zip, weight, length, width, height, contain_battery=0):
    """
    运费试算函数：获取美东、美西仓库最低运费（修复版）
    :param destination_zip: 目的地邮编（string，美国为5位数字）
    :param weight: 商品重量（kg，float）
    :param length: 商品长度（cm，float）
    :param width: 商品宽度（cm，float）
    :param height: 商品高度（cm，float）
    :param contain_battery: 货物属性（0=普货，1=含电，2=纯电，默认0，必填）
    :return: dict，包含美东、美西仓库最低运费信息
    """
    # 1. 基础配置（按文档固定参数）
    app_token = "dbe7326b9e0727b6078870408f797e32"
    app_key = "567ee1986b53bfe5355da9b94b8f0bfa"
    service_url = "http://cpws.ems.com.cn/default/svc/web-service"  # 正式线地址
    warehouses = {
        "美东仓库": "USEA",
        "美西仓库": "USEE"
    }
    min_freights = {}

    # 2. 遍历两个仓库，分别计算最低运费
    for warehouse_name, warehouse_code in warehouses.items():
        print(f"\n=== 开始计算【{warehouse_name}】({warehouse_code}) 运费 ===")
        # 2.1 先获取当前仓库的可用运输方式（修复：按仓库单独获取，避免复用导致不匹配）
        shipping_methods = get_shipping_methods(app_token, app_key, service_url, warehouse_code)
        if not shipping_methods:
            min_freights[warehouse_name] = {
                "最低运费": None,
                "说明": f"未获取到{warehouse_name}的可用运输方式"
            }
            continue

        # 2.2 遍历每种运输方式，计算运费
        freight_list = []
        for idx, method in enumerate(shipping_methods, 1):
            method_code = method["code"]
            method_name = method["name"]
            print(f"  正在试算运输方式 {idx}/{len(shipping_methods)}：{method_name}（{method_code}）")
            
            # 2.3 构造运费试算请求（修复：补充必选参数+HTML编码）
            request_xml = build_calculate_fee_xml(
                app_token, app_key, warehouse_code, destination_zip,
                method_code, weight, length, width, height, contain_battery
            )
            
            # 2.4 发送请求并解析结果
            response_xml = send_soap_request(service_url, request_xml)
            if not response_xml:
                print(f"    ❌ 该运输方式请求失败，跳过")
                continue
            
            total_fee = parse_calculate_fee_response(response_xml, method_name)
            if total_fee is not None and isinstance(total_fee, (int, float)):
                freight_list.append({
                    "shipping_method_code": method_code,
                    "shipping_method_name": method_name,
                    "total_fee": round(total_fee, 2)  # 保留2位小数，避免精度问题
                })
                print(f"    ✅ 试算成功，运费：{total_fee:.2f}")

        # 2.5 筛选当前仓库的最低运费
        if freight_list:
            min_freight = min(freight_list, key=lambda x: x["total_fee"])
            min_freights[warehouse_name] = {
                "最低运费": min_freight["total_fee"],
                "对应运输方式代码": min_freight["shipping_method_code"],
                "对应运输方式名称": min_freight["shipping_method_name"],
                "仓库代码": warehouse_code,
                "说明": f"共试算{len(freight_list)}种有效运输方式"
            }
            print(f"=== 【{warehouse_name}】最低运费：{min_freight['total_fee']:.2f}（{min_freight['shipping_method_name']}）===")
        else:
            min_freights[warehouse_name] = {
                "最低运费": None,
                "说明": f"获取到{len(shipping_methods)}种运输方式，但均试算失败"
            }

    return min_freights

def get_shipping_methods(app_token, app_key, service_url, warehouse_code):
    """
    获取指定仓库的可用运输方式（修复：参数HTML编码+单独请求）
    :param warehouse_code: 仓库代码（USEA/USEE）
    :return: list，运输方式列表（含code/name等）
    """
    print(f"  正在获取{warehouse_code}仓库的运输方式...")
    # 构造请求参数（修复：JSON序列化后HTML编码）
    params = {"warehouseCode": warehouse_code}
    params_json = html.escape(json.dumps(params, ensure_ascii=False))
    
    # 构造SOAP请求XML
    request_xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns1="http://www.example.org/Ec/">
<SOAP-ENV:Body>
<ns1:callService>
<paramsJson>{params_json}</paramsJson>
<appToken>{app_token}</appToken>
<appKey>{app_key}</appKey>
<service>getShippingMethod</service>
</ns1:callService>
</SOAP-ENV:Body>
</SOAP-ENV:Envelope>"""
    
    # 发送请求并解析
    response_xml = send_soap_request(service_url, request_xml)
    if not response_xml:
        return []
    
    try:
        root = ET.fromstring(response_xml)
        response_json_str = root.find(".//response").text
        print(f"  运输方式接口返回原始数据：{response_json_str[:200]}...")  # 打印前200字符，避免过长
        
        response_json = json.loads(response_json_str)
        if response_json.get("ask") == "Success":
            shipping_methods = response_json.get("data", [])
            print(f"  成功获取{len(shipping_methods)}种运输方式")
            return shipping_methods
        else:
            err_msg = response_json.get("message", "未知错误")
            err_detail = response_json.get("Error", {})
            print(f"  ❌ 获取运输方式失败：{err_msg}，错误详情：{err_detail}")
            return []
    except Exception as e:
        print(f"  ❌ 解析运输方式响应失败：{str(e)}，原始XML：{response_xml[:300]}...")
        return []

def build_calculate_fee_xml(app_token, app_key, warehouse_code, zipcode, shipping_method, 
                           weight, length, width, height, contain_battery):
    """
    构造运费试算请求XML（修复：补充必选参数+HTML编码）
    """
    # 必选参数：按API文档要求，所有字段严格匹配类型
    params = {
        "warehouse_code": warehouse_code,    # 发货仓库（必填）
        "country_code": "US",                # 目的国（默认美国，必填）
        "shipping_method": shipping_method,  # 运输方式代码（必填）
        "postcode": zipcode,                 # 目的地邮编（必填）
        "weight": round(weight, 2),          # 重量（KG，保留2位小数，必填）
        "length": round(length, 2),          # 长（CM，保留2位小数，必填）
        "width": round(width, 2),            # 宽（CM，保留2位小数，必填）
        "height": round(height, 2),          # 高（CM，保留2位小数，必填）
        "contain_battery": contain_battery   # 货物属性（0/1/2，修复：补充必填项）
    }
    
    # 修复：先JSON序列化，再HTML编码（避免特殊字符导致解析失败）
    params_json = html.escape(json.dumps(params, ensure_ascii=False))
    
    # 构造SOAP XML（严格按文档格式，避免标签缺失）
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns1="http://www.example.org/Ec/">
<SOAP-ENV:Body>
<ns1:callService>
<paramsJson>{params_json}</paramsJson>
<appToken>{app_token}</appToken>
<appKey>{app_key}</appKey>
<service>getCalculateFee</service>
</ns1:callService>
</SOAP-ENV:Body>
</SOAP-ENV:Envelope>"""

def send_soap_request(url, xml_data):
    """
    发送SOAP请求（修复：增加详细日志+超时处理）
    """
    headers = {
        "Content-Type": "text/xml; charset=UTF-8",  # 必选请求头，匹配API要求
        "User-Agent": "Python-SOAP-Client/1.0"      # 新增：避免部分接口拦截无UA请求
    }
    try:
        print(f"    发送请求：URL={url[:50]}...，XML长度={len(xml_data)}字符")
        response = requests.post(
            url=url,
            data=xml_data.encode("utf-8"),  # 确保UTF-8编码，避免中文乱码
            headers=headers,
            timeout=30,                     # 超时时间30秒，避免长期阻塞
            verify=False                    # 临时关闭SSL验证（若正式线有证书，可删除该参数）
        )
        response.raise_for_status()  # 触发HTTP错误（如404/500）
        print(f"    请求响应状态码：{response.status_code}")
        return response.text
    except requests.exceptions.Timeout:
        print(f"    ❌ 请求超时（30秒），可能是网络或接口问题")
    except requests.exceptions.HTTPError as e:
        print(f"    ❌ HTTP错误：{e}，响应内容：{response.text[:200]}...")
    except requests.exceptions.ConnectionError:
        print(f"    ❌ 连接失败，检查是否能访问地址：{url}")
    except Exception as e:
        print(f"    ❌ 请求异常：{str(e)}")
    return None

def parse_calculate_fee_response(xml_data, method_name):
    """
    解析运费试算响应（修复：增加错误详情打印）
    """
    try:
        root = ET.fromstring(xml_data)
        response_json_str = root.find(".//response").text
        print(f"    运费响应原始数据：{response_json_str[:150]}...")
        
        response_json = json.loads(response_json_str)
        if response_json.get("ask") == "Success":
            data = response_json.get("data", {})
            total_fee = data.get("totalFee")
            if total_fee is None:
                print(f"    ⚠️ {method_name} 未返回总运费，data字段：{data}")
                return None
            # 处理可能的字符串类型运费（如"123.45"），转为数字
            return float(total_fee) if isinstance(total_fee, str) else total_fee
        else:
            err_msg = response_json.get("message", "未知失败原因")
            err_detail = response_json.get("Error", {})
            print(f"    ❌ {method_name} 试算失败：{err_msg}，错误码：{err_detail.get('errCode')}，错误详情：{err_detail.get('errMessage')}")
            return None
    except ET.ParseError:
        print(f"    ❌ 解析XML失败，原始数据：{xml_data[:200]}...")
    except json.JSONDecodeError:
        print(f"    ❌ 解析JSON失败，原始响应：{response_json_str[:200]}...")
    except Exception as e:
        print(f"    ❌ 解析异常：{str(e)}")
    return None

# ------------------------------ 测试入口 ------------------------------
if __name__ == "__main__":
    print("="*50)
    print("          美东/美西仓库运费试算工具（修复版）          ")
    print("="*50)
    
    # 测试参数（可根据实际需求修改）
    test_params = {
        "destination_zip": "33178",  # 美国佛罗里达州迈阿密邮编（有效美国邮编）
        "weight": 0.5,               # 商品重量：0.5kg
        "length": 30.0,              # 长：30cm
        "width": 25.0,               # 宽：25cm
        "height": 10.0,              # 高：10cm
        "contain_battery": 0         # 货物属性：0=普货（无电池）
    }
    print(f"\n测试参数：")
    for key, val in test_params.items():
        print(f"  {key}: {val}")
    
    # 执行运费试算
    result = calculate_min_freight(**test_params)
    
    # 打印最终结果
    print("\n" + "="*50)
    print("                    最终运费试算结果                    ")
    print("="*50)
    print(json.dumps(result, ensure_ascii=False, indent=2))