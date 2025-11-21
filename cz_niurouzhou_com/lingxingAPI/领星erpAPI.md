
 轻轻成功重点在 auth-token 和 x-ak-company-id，另外生成Bookmarklet代码会更快些。

# 商品 api
https://gw.lingxingerp.com/listing-api/api/product/showOnline

以下是完全匹配请求标头和参数的最终可用代码，直接复制执行即可（已包含所有必填认证信息和正确格式）：


```javascript
fetch('https://gw.lingxingerp.com/listing-api/api/product/showOnline', {
  method: 'POST',
  headers: {
    'accept': 'application/json, text/plain, */*',
    'accept-encoding': 'gzip, deflate, br, zstd',
    'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
    'ak-client-type': 'web',
    'ak-origin': 'https://erp.lingxing.com',
    'auth-token': 'fe432oFWSEyEjHL6CCykssUuv3sP20ba2cDEb30i4hJE9yqEL3ilkVbZBVuNU9NtNh9IPxQ/dH22DQvaG2PFUk3RtNHr6ZlCVUUUALnrmd2ifOBgvZFL4U2UMu8+58u/OtOEtoZTa1nQ0jjEs12/IpGwyE5ko2sOV3vg7B4',
    'content-type': 'application/json;charset=UTF-8',
    'origin': 'https://erp.lingxing.com',
    'referer': 'https://erp.lingxing.com/',
    'sec-ch-ua': '"Chromium";v="142", "Microsoft Edge";v="142", "Not_A Brand";v="99"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'cross-site',
    'sec-fetch-storage-access': 'active',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0',
    'x-ak-company-id': '901571037510692352',
    'x-ak-env-key': 'SAAS-126',
    'x-ak-language': 'zh',
    'x-ak-platform': '1',
    'x-ak-request-id': 'f52057e7-79f3-420b-92e3-b738096ec8b9',
    'x-ak-request-source': 'erp',
    'x-ak-uid': '10956565',
    'x-ak-version': '3.7.2.3.0.066',
    'x-ak-zid': '10796914'
  },
  body: JSON.stringify({
    offset: 0,
    length: 200,
    search_field: "",
    pvi_ids: "",
    exact_search: 1,
    sids: "",
    status: "1",
    is_pair: "",
    fulfillment_channel_type: "",
    global_tag_ids: "",
    req_time_sequence: "/listing-api/api/product/showOnline$$4"
  }),
  credentials: 'include'
})
.then(res => {
  if (!res.ok) throw new Error(`HTTP错误：${res.status}`);
  return res.json();
})
.then(data => console.log('请求成功，响应结果：', data))
.catch(err => console.error('请求失败：', err.message));
```

### 关键说明
1. 完全复用了你提供的所有请求标头（包括 `auth-token`、`x-ak-company-id` 等核心认证信息），确保符合接口访问规范。
2. `companyId` 已通过 `x-ak-company-id` 标头传递（接口可能优先从标头读取该参数），同时请求体保持原有结构。
3. 启用 `credentials: 'include'` 确保跨域时携带登录态，匹配浏览器正常访问逻辑。
4. 补充了基础错误处理，便于排查网络或接口返回的异常。

直接复制到浏览器控制台或前端项目中即可执行，无需额外修改。要不要我帮你生成一个**带响应数据解析的增强版**，自动提取返回的产品列表信息？

# 订单 api
https://gw.lingxingerp.com/amz-order/api/order/OrderList


```javascript
fetch('https://gw.lingxingerp.com/amz-order/api/order/OrderList', {
  method: 'POST',
  headers: {
    'accept': 'application/json, text/plain, */*',
    'accept-encoding': 'gzip, deflate, br, zstd',
    'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
    'ak-client-type': 'web',
    'ak-origin': 'https://erp.lingxing.com',
    'auth-token': 'fe432oFWSEyEjHL6CCykssUuv3sP20ba2cDEb30i4hJE9yqEL3ilkVbZBVuNU9NtNh9IPxQ/dH22DQvaG2PFUk3RtNHr6ZlCVUUUALnrmd2ifOBgvZFL4U2UMu8+58u/OtOEtoZTa1nQ0jjEs12/IpGwyE5ko2sOV3vg7B4',
    'content-type': 'application/json;charset=UTF-8',
    'origin': 'https://erp.lingxing.com',
    'referer': 'https://erp.lingxing.com/',
    'sec-ch-ua': '"Chromium";v="142", "Microsoft Edge";v="142", "Not_A Brand";v="99"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'cross-site',
    'sec-fetch-storage-access': 'active',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0',
    'x-ak-company-id': '901571037510692352',
    'x-ak-env-key': 'SAAS-126',
    'x-ak-language': 'zh',
    'x-ak-platform': '1',
    'x-ak-request-id': 'c37d7c35-f9d5-4efc-8255-8d3fea33f249',
    'x-ak-request-source': 'erp',
    'x-ak-uid': '10956565',
    'x-ak-version': '3.7.2.3.0.066',
    'x-ak-zid': '10796914'
  },
  body: JSON.stringify({
  "startDate": "2025-11-12",
  "endDate": "2025-11-19",
  "sortField": "purchaseDateLocal",
  "sortType": "desc",
  "searchField": "amazonOrderId",
  "searchValue": "",
  "fulfillmentChannel": "",
  "pageNo": 1,
  "pageSize": 200,
  "isMcfOrder": "0",
  "req_time_sequence": "/amz-order/api/order/OrderList$$2"
}),
  credentials: 'include'
})
.then(res => {
  if (!res.ok) throw new Error(`HTTP错误：${res.status}`);
  return res.json();
})
.then(data => console.log('请求成功，响应结果：', data))
.catch(err => console.error('请求失败：', err.message));
```



# 库存 api



