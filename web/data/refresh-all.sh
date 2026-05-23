#!/bin/bash
# 全量数据刷新脚本
# 每 30 分钟由 cron 触发一次
# 从 CoinGecko + DeFiLlama + Cryptocompare 获取最新数据

export https_proxy=http://127.0.0.1:7897
DATA_DIR="/Users/noa1h/.openclaw/workspace/projects/onchain-alpha/data"

echo "[$(date)] 开始刷新项目数据..."

# 1. CoinGecko Trending - 最实时的热门项目
python3 -c "
import json, urllib.request
req = urllib.request.Request('https://api.coingecko.com/api/v3/search/trending', headers={'User-Agent': 'Mozilla/5.0'})
data = json.loads(urllib.request.urlopen(req, timeout=8).read())
with open('$DATA_DIR/coingecko-trending.json','w') as f:
    json.dump(data, f)
coins = data.get('coins',[])
print(f'CoinGecko trending: {len(coins)} projects')
for c in coins[:5]:
    item = c['item']
    print(f'  {item[\"name\"]} ({item[\"symbol\"]}) rank={item.get(\"market_cap_rank\",\"?\")}')
"

# 2. CoinGecko 热门搜索 - 发现新项目
python3 -c "
import json, urllib.request
keywords = ['perp+dex', 'rwa+tokenization', 'layer2', 'meme+coin', 'ai+agent', 'depin', 'prediction+market', 'hyperliquid', 'berachain', 'monad', 'megaeth', 'restaking', 'aster', 'light', 'meme', 'defi', 'lending']
all_coins = []
seen_ids = set()
for kw in keywords:
    try:
        req = urllib.request.Request(f'https://api.coingecko.com/api/v3/search?query={kw}', headers={'User-Agent': 'Mozilla/5.0'})
        data = json.loads(urllib.request.urlopen(req, timeout=5).read())
        for c in data.get('coins',[]):
            if c['id'] not in seen_ids:
                seen_ids.add(c['id'])
                all_coins.append(c)
    except: pass
all_coins.sort(key=lambda x: x.get('market_cap_rank') or 9999)
with open('$DATA_DIR/coingecko-discovered.json','w') as f:
    json.dump(all_coins, f)
print(f'CoinGecko search: {len(all_coins)} projects')
"

# 3. DeFiLlama 协议 TVL
python3 -c "
import json, urllib.request
req = urllib.request.Request('https://api.llama.fi/protocols', headers={'User-Agent': 'Mozilla/5.0'})
data = json.loads(urllib.request.urlopen(req, timeout=10).read())
active = [p for p in data if p.get('tvl') is not None and p['tvl'] > 100000]
active.sort(key=lambda x: x['tvl'], reverse=True)
with open('$DATA_DIR/defillama-protocols.json','w') as f:
    json.dump(active[:500], f)
print(f'DefiLlama: {len(active[:500])} protocols')
"

echo "[$(date)] 项目数据刷新完成"
