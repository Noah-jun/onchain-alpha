# 链上研究终端

加密资产与传统市场的研究辅助工具。默认中文界面，桌面优先，手机可用。它只整理来源、时间和不确定的地方，不自动下单，也不把模型输出写成投资建议。

应用在 `web/`。没有密钥时使用带标签的演示快照；实时源失败时留空，显示「暂无数据」或「数据延迟」，不用演示数字冒充实时。

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

## 环境变量

复制 `web/.env.example` 为 `web/.env`。全部保持 `demo` 即可运行。

| 变量 | 作用 |
| --- | --- |
| `RESEARCH_MARKET_PROVIDER` | `demo` 或 `coingecko` |
| `COINGECKO_API_KEY` | 可选 |
| `NEWS_PROVIDER` / `NEWS_API_KEY` | `cryptopanic` 需要密钥 |
| `SOCIAL_PROVIDER` / `X_BEARER_TOKEN` | `x` 需要 Bearer |
| `FUNDING_PROVIDER` | `demo` 或 `hyperliquid` |
| `ONCHAIN_PROVIDER` / `WHALE_ALERT_API_KEY` | `whalealert` 需要密钥 |
| `VOLATILITY_PROVIDER` | `demo` 或 `binance` |
| `AI_API_KEY` / `AI_BASE_URL` / `AI_MODEL` | 可选的 OpenAI 兼容接口 |

把某个 `*_PROVIDER` 设成实时值但没配必需密钥时，该页显示「未配置」，不会显示成已连接。

讨论数据走 `SocialAdapter`。默认是 `DemoSocialAdapter`；`SOCIAL_PROVIDER=x` 且有 Bearer 时换成 X recent search。

## 已知限制

- 演示快照的更新时间固定在 2026-10-29 08:00（Asia/Shanghai），所以会显示数据延迟。
- 演示新闻、帖文、地址和交易哈希都是样本。哈希不链接到区块浏览器。
- 资金费率差在手续费、价差、保证金、结算或风险缺失时标为「待验证的费率差」，不是无风险利润。
- 5 分钟绝对变化不超过 10% 的窗口不会进异常列表。核对不全则为「待确认异常」。
- 未配置外部模型时，助手只重组应用内已有字段，不会新编新闻、帖文、地址或价格。
- 旧接口仍在 `web/src/app/api/`，新的研究数据在 `/api/research/*`。

## 下一步

1. 按需要把 provider 改成实时源，并只在服务端保存密钥。
2. 给费率差补上手续费、盘口和保证金，再决定是否还要标成待验证。
3. 若要真实讨论，接入合规的 X API；在此之前保持演示适配器。
4. 外部模型只能改写已经引用的内容。新增的数字会被丢掉，退回规则研判。
