# 链上研究终端

加密资产与传统市场的研究辅助工具。默认中文界面，桌面优先，手机可用。它只整理来源、时间和不确定的地方，不自动下单，也不把模型输出写成投资建议。

应用在 `web/`。不配置任何密钥时，行情、资金费率和 5 分钟波动走免密钥公开接口。需要密钥的模块显示「未配置，需在 Vercel 环境变量设置 XXX」，不展示伪造数据。演示快照默认关闭，只有 `RESEARCH_ALLOW_DEMO=1` 才会启用，并会标明演示。

## 启动

```bash
cd web
npm i
npm run dev
```

打开 http://localhost:3000 。

生产构建：

```bash
cd web
npm run build
npm start
```

## 页面

- 市场看板：BTC、ETH、QQQ、标普 500、WTI 原油，以及设置里的永续代码（默认 CLUSDT）
- 热点新闻、热门讨论、资金费率、资金异动、异常波动
- AI 研究助手：事实、推断、未知分开，并附带引用
- 设置：数据源状态、刷新间隔、自选和永续代码
- `/legacy`：原来的信号台

## 数据源

所有外部请求都在 Next.js route handler 里发出。`web/vercel.json` 把函数地区设为 `hkg1`，研究接口也声明了 `preferredRegion = hkg1`，用来避开 Binance 对美国 IP 的 HTTP 451。Binance 或 Bybit 失败时会改用 OKX、Gate、Bitget 等已成功的公开接口，失败的字段保持为空。

| 模块 | 默认 | 环境变量 | 如何获取 |
| --- | --- | --- | --- |
| 行情 | 实时，免密钥 | `COINGECKO_API_KEY` 可选 | CoinGecko 现货、Yahoo Finance 传统资产、OKX/Bitget/Gate/Binance/Bybit 永续。密钥可在 coingecko.com 申请，不填也能用免费接口 |
| 资金费率 | 实时，免密钥 | 无 | Binance `premiumIndex`、Bybit linear tickers、OKX funding-rate、Gate contracts、Bitget tickers |
| 5 分钟波动 | 实时，免密钥 | 无 | 用上述交易所的 5 分钟 K 线计算。绝对变化超过 10% 才进入异常；核对不全标为待确认 |
| 交易所成交 | 实时，免密钥 | 无 | OKX 永续公开成交。这不是链上充提 |
| 链上转账 | 未配置 | `WHALE_ALERT_API_KEY` | https://whale-alert.io 申请 key |
| 新闻 | NewsLiquid 优先 | `NEWSLIQUID_API_TOKEN` | https://6551.io/mcp 。请求 `POST https://ai.6551.io/open/news_search`，头 `Authorization: Bearer`。每日热点 `GET /open/free_hot` 按仓库客户端不带 token。`NEWS_API_KEY` 是 CryptoPanic 可选兜底 |
| X 讨论 | NewsLiquid 优先 | `NEWSLIQUID_API_TOKEN` | `POST /open/twitter_search` 与 `POST /open/twitter_watch`，同样 Bearer。`X_BEARER_TOKEN` 可选 |
| 聪明钱信号 | 未配置时跳过 | `NEWSLIQUID_API_TOKEN` | 只读 `GET /open/trader/routers`，再 `POST /open/trader/{trader}/{api}/market/signal-list`。不下单 |
| 自检 | 随时可开 | 同上 | `GET /api/research/newsliquid/health` 返回各接口 HTTP 状态，不返回 token |
| AI 对话 | 未配置 | `AI_API_KEY`，可选 `AI_BASE_URL`、`AI_MODEL` | 任何兼容 `/chat/completions` 的密钥。不填时页面不会编造回答 |
| 演示快照 | 关闭 | `RESEARCH_ALLOW_DEMO=1` | 只有显式设为 `1` 才启用，页面会标明演示 |

密钥可以在网站「设置」页填写。它们只保存在当前浏览器的 localStorage，请求研究接口时放在 `x-newsliquid-token`、`x-ai-api-key`、`x-ai-base-url`、`x-ai-model`、`x-news-api-key`、`x-x-bearer-token`、`x-whale-alert-key`、`x-coingecko-api-key` 请求头里。服务端优先用请求头，没有再用同名环境变量，并且不会把密钥写进响应。也可以把同名变量配在 Vercel。复制 `web/.env.example` 可查看变量名。

新闻去重：标题和正文去掉链接、标点并小写后相同，或规范化 URL 相同，只保留分数更高、时间更新的一条。讨论去重：空内容、只剩链接、以及规范化后相同的帖文只留热度更高或更新的一条。

## 已知限制

- 公开接口有缓存，大约 20–45 秒。失败时显示错误或暂无数据，不用演示数字填上。
- 资金费率差缺少手续费、盘口、保证金或结算核验时，标为「待验证的费率差」，不是无风险利润。
- 5 分钟绝对变化不超过 10% 的窗口会列在扫描结果里，但不会记成异常。
- 时间显示为 Asia/Shanghai。
- 旧接口仍在 `web/src/app/api/`，研究终端使用 `/api/research/*`。

## 下一步

1. 在 Vercel 配好 `NEWS_API_KEY`、`X_BEARER_TOKEN`、`WHALE_ALERT_API_KEY`、`AI_API_KEY` 后，对应页面会从「未配置」变成实时数据。
2. 费率差要等手续费和盘口数据接入后，才有条件离开「待验证」。
3. 部署时把项目根目录设为 `web`。
