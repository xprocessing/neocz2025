#批量cvs文件id查询亚马逊搜索排名
#搜索关键词，查出
#系统只抓取每个关键词搜索结果的前6页，比对后返回商品的排名数据：总排名+在第几页+所在页的位置，​总排名是指该类型排名的位置累计之和。 
# ​比如某个关键词在PC端搜索结果页的结构为：每页60个位置，其中48个自然位置+12个广告位置，
# 某ASIN排在第3页的第10个自然位置，那么其排名显示为：总排名106（第1页48+第2页48+第3页10=106），第3页第10名

# 地址https://www.amazon.com/s?k=car&page=2 k为关键词，page为页数
# div role="listitem" data-asin="B0CWQ8QMKT" 

#第一步：读取csv文件，获取ASIN和keyword
import csv
input_file = 'item.csv'
asins_keywords = []
with open(input_file, mode='r', encoding='utf-8') as file:
    reader = csv.DictReader(file)
    for row in reader:
        if row['ASIN'] and row['keyword']:  # 确保数据不为空
            asins_keywords.append((row['ASIN'], row['keyword']))
            print(f"读取到数据: ASIN={row['ASIN']}, 关键词={row['keyword']}")

print(f"总共需要查询 {len(asins_keywords)} 条记录")
        
#第二步：根据ASIN和keyword，抓取亚马逊搜索结果页面前6页，获取排名数据
import requests
from bs4 import BeautifulSoup
import time
import random
from fake_useragent import UserAgent

# 使用随机User-Agent
ua = UserAgent()

def get_random_headers():
    return {
        'User-Agent': ua.random,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
    }

def get_session():
    """创建会话以保持连接"""
    session = requests.Session()
    session.headers.update(get_random_headers())
    return session

def get_rank(asin, keyword, session):
    base_url = 'https://www.amazon.com/s'
    total_rank = 0
    
    for page in range(1, 7):  # 前6页
        params = {'k': keyword, 'page': page}
        
        try:
            # 随机延迟避免被识别为机器人
            time.sleep(random.uniform(2, 5))
            
            # 更新User-Agent
            session.headers.update(get_random_headers())
            
            response = session.get(base_url, params=params, timeout=10)
            
            # 检查响应状态
            if response.status_code == 503:
                print(f"503错误，等待更长时间...")
                time.sleep(random.uniform(10, 20))
                continue
                
            if response.status_code != 200:
                print(f"HTTP错误: {response.status_code}")
                continue
                
            soup = BeautifulSoup(response.text, 'html.parser')
            items = soup.find_all('div', {'data-asin': True})
            
            if not items:
                print(f"第{page}页未找到商品，可能被反爬虫拦截")
                # 尝试不同的选择器
                items = soup.find_all('div', {'data-component-type': 's-search-result'})
            
            position_in_page = 0
            for item in items:
                data_asin = item.get('data-asin')
                if data_asin:
                    position_in_page += 1
                    total_rank += 1
                    if data_asin == asin:
                        print(f'找到ASIN: {asin} 关键词: {keyword} 总排名: {total_rank}, 第{page}页, 页内位置: {position_in_page}')
                        return total_rank, page, position_in_page
                        
        except requests.exceptions.RequestException as e:
            print(f"请求异常: {e}")
            time.sleep(random.uniform(5, 10))
            continue
            
    return None  # 未找到排名

#执行查询
session = get_session()
for asin, keyword in asins_keywords:
    print(f"
开始查询 ASIN: {asin}, 关键词: {keyword}")
    rank_info = get_rank(asin, keyword, session)
    if rank_info:
        print(f"查询成功: {rank_info}")
    else:
        print("未找到排名信息")





#更新csv文件，添加排名数据

"""
# 第三步：保存结果到新的csv文件
output_file = 'item_with_ranks.csv'
session = get_session()

with open(output_file, mode='w', encoding='utf-8', newline='') as file:
    fieldnames = ['ASIN', 'keyword', 'rank']
    writer = csv.DictWriter(file, fieldnames=fieldnames)
    writer.writeheader()
    
    for asin, keyword in asins_keywords:
        print(f"
开始查询 ASIN: {asin}, 关键词: {keyword}")
        rank_info = get_rank(asin, keyword, session)
        if rank_info:
            total_rank, page, position_in_page = rank_info
            rank_str = f'Total Rank: {total_rank}, Page: {page}, Position: {position_in_page}'
            print(f"查询成功: {rank_str}")
        else:
            rank_str = 'Not Found'
            print("未找到排名信息")
        
        writer.writerow({'ASIN': asin, 'keyword': keyword, 'rank': rank_str})
        print(f'已处理 ASIN: {asin}, 关键词: {keyword}, 排名: {rank_str}')
#第三步：保存结果到新的csv文件
"""