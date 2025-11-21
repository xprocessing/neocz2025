//获取最新的auth-token
//获取最新的x-ak-request-id

header_data = {  
  "accept": "application/json, text/plain, */*",
  "accept-encoding": "gzip, deflate, br, zstd",
  "accept-language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
  "ak-client-type": "web",
  "ak-origin": "https://erp.lingxing.com",
  "auth-token": "e54eG3abZtn6fltUOh7TaDzHSF2/rBIO6n+4wkV2H0N1uELFHfTJhX3FYXGJm4peeGJ1uB3yHTQfObglc4ngdt+dAf3OT50n0s4VXZym9gjd/rjAefcHsAGkaT+cj5J2nvEJqb68/E27u+IY+06u08656Np8juEr0z+41Ss",
  "content-length": "688",
  "content-type": "application/json;charset=UTF-8",
  "origin": "https://erp.lingxing.com",
  "priority": "u=1, i",
  "referer": "https://erp.lingxing.com/",
  "sec-ch-ua": "\"Chromium\";v=\"135\", \"Not-A.Brand\";v=\"8\"",
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": "\"Windows\"",
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "cross-site",
  "sec-fetch-storage-access": "active",
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
  "x-ak-company-id": "901571037510692352",
  "x-ak-env-key": "SAAS-126",
  "x-ak-language": "zh",
  "x-ak-platform": "1",
  "x-ak-request-id": "357c8014-0c07-4728-be2b-82b18f9e4a4c",
  "x-ak-request-source": "erp",
  "x-ak-uid": "10956565",
  "x-ak-version": "3.7.2.3.0.095",
  "x-ak-zid": "10796914"
};

body_data ={
    "sort_field": "global_purchase_time",
    "sort_type": "desc",
    "status": "4",
    "tag_no": "",
    "site_code": [],
    "store_id": [],
    "platform_code": [],
    "search_field": "platform_order_name",
    "search_value": [
        ""
    ],
    "search_field_time": "global_purchase_time",
    "start_time": "2025-10-22 00:00:00",
    "end_time": "2025-11-21 23:59:59",
    "offset": 0,
    "length": 100,
    "status_sub": [
        5,
        "<>"
    ],
    "is_pending": "1",
    "receiver_country_code": [],
    "order_from": "",
    "order_type": "",
    "buyer_note_status": "",
    "remark_has": "",
    "platform_status": [],
    "address_type": "",
    "is_marking": "",
    "wid": "",
    "logistics_type_id": "",
    "logistics_provider_id": "",
    "asin_principal_uid": [],
    "included_bundled": "",
    "x_ak_platform": "2",
    "req_time_sequence": "/cepf-oms-sw/list/order$$14"
};


fetch('https://gw.lingxingerp.com/cepf-oms-sw/list/order', {
    method: 'POST',
    headers: header_data,
    body: JSON.stringify(body_data),
    credentials: 'include'
})
    .then(res => {
        if (!res.ok) throw new Error(`HTTP错误：${res.status}`);
        return res.json();
    })
    .then(data => console.log('请求成功，响应结果：', data))
    .catch(err => console.error('请求失败：', err.message));