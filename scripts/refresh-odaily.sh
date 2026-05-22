#!/bin/bash
# Refresh Odaily news cache
curl -s --max-time 8 --proxy http://127.0.0.1:7897 \
  "https://www.odaily.news/newsflash" \
  -o "/Users/noa1h/.openclaw/workspace/projects/onchain-alpha/data/odaily-news.html" 2>/dev/null
echo "Odaily refreshed: $(date)"
