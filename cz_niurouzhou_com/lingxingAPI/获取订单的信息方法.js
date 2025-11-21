//获取最新的auth-token
//获取最新的x-ak-request-id


//获取cookie中auth-token的值
const getAuthToken = () => (document.cookie.match(/auth-token=([^;]+)/) || [])[1] || null;
const auth_token = getAuthToken();

function getOrderInfo(global_order_no) {


    header_data = {
        "accept": "application/json, text/plain, */*",
        "accept-encoding": "gzip, deflate, br, zstd",
        "accept-language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
        "ak-client-type": "web",
        "ak-origin": "https://erp.lingxing.com",
        "auth-token": auth_token,
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

    body_data = {};

    let url = `https://erp.lingxing.com/api/platforms/oms/order_list/detail?global_order_no=${global_order_no}&req_time_sequence=%2Fapi%2Fplatforms%2Foms%2Forder_list%2Fdetail$$1`;


    fetch(url, {
        method: 'GET',
        headers: header_data,
        credentials: 'include'
    })
        .then(res => {
            if (!res.ok) throw new Error(`HTTP错误：${res.status}`);
            return res.json();
        })
        .then(data => {
            console.log(data);
            console.log("估算计费重:" + data.data.logistics_info.pre_fee_weight);
            console.log("估算尺寸:" + data.data.logistics_info.pre_package_size);
            console.log("买家国家代码:" + data.data.receive_info.receiver_country_code);
            console.log("买家邮政编码:" + data.data.receive_info.postal_code);

            let pre_fee_weight = data.data.logistics_info.pre_fee_weight;
            let pre_package_size = data.data.logistics_info.pre_package_size;
            let receiver_country_code = data.data.receive_info.receiver_country_code;
            let postal_code = data.data.receive_info.postal_code;
            console.log(pre_fee_weight);
            //返回一个上面四个参数的json对象
            //pre_package_size数据格式为45.0x30.0x9.0cm;           
           length= pre_package_size.split('x')[0];
           width= pre_package_size.split('x')[1];
           height= pre_package_size.split('x')[2].replace('cm','');
           //包裹重量数据格式为26240.00 g，去掉g转换为数字
           pre_fee_weight = pre_fee_weight.replace(' g', '');
           pre_fee_weight = parseFloat(pre_fee_weight);  

           pre_fee_weight=pre_fee_weight/1000;



            ///请求运费接口 https://cz.niurouzhou.com/ems_api.php?postcode=90210&weight=2.5&length=35&width=25&height=15
          
            let url2 = `https://cz.niurouzhou.com/ems_api.php?postcode=${postal_code}&weight=${pre_fee_weight}&length=${length}&width=${width}&height=${height}`;
              console.log(url2);
            


            fetch(url2)
                .then(r => r.json())
                .then(data => console.log(data));






            ///请求运费接口









        })
        .catch(err => console.error('请求失败：', err.message));


}
//getOrderInfo('103639018853876971');
//弹窗输入获取订单号
let global_order_no = prompt("请输入订单号:");
//调用函数获取订单信息
getOrderInfo(global_order_no);


