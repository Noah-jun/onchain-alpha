#!/bin/bash
# 刷新项目数据缓存
# 从 CoinGecko + DeFiLlama + Cryptocompare 获取最新项目数据

DATA_DIR="/Users/noa1h/.openclaw/workspace/projects/onchain-alpha/data"
PROXY="http://127.0.0.1:7897"

mkdir -p "$DATA_DIR"

# 1. CoinGecko Trending（最新热门项目）
curl -s --max-time 8 --proxy "$PROXY" \
  "https://api.coingecko.com/api/v3/search/trending" \
  -o "$DATA_DIR/coingecko-trending.json" 2>/dev/null
echo "[$(date)] CoinGecko trending saved"

# 2. DeFiLlama 项目列表（含 TVL）
curl -s --max-time 10 --proxy "$PROXY" \
  "https://api.llama.fi/protocols" 2>/dev/null \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
# 只保留有 TVL 的活跃项目
active = [p for p in d if p.get('tvl',0) > 100000]
active.sort(key=lambda x: x['tvl'], reverse=True)
with open('$DATA_DIR/defillama-protocols.json','w') as f:
    json.dump(active[:500], f)
print(f'Saved {min(500, len(active))} protocols')
" 2>/dev/null

# 3. CoinGecko 热门关键词搜索（发现新项目）
for kw in "perp dex perpetual hyperliquid megaeth berachain monad" "rwa tokenization ondo polymarket prediction" "layer2 arbitrum zk-rollup" "defi lending restaking" "meme ai agent depin"; do
  curl -s --max-time 6 --proxy "$PROXY" \
    "https://api.coingecko.com/api/v3/search?query=$kw" \
    -o "$DATA_DIR/cg-search-$RANDOM.json" 2>/dev/null &
done
wait
echo "[$(date)] CoinGecko searches done"

echo "[$(date)] All project data refreshed"
