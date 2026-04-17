# OnChain Alpha 前端产品需求文档（PRD）

**版本**：v1.0 - MVP  
**日期**：2026-04-02  
**撰写**：Noah  
**状态**：待开发  

---

## 1. 文档概述

### 1.1 产品背景
基于RAG技术的链上数据智能投研助手，解决"数据可见但解释难"的投研痛点。

### 1.2 前端目标
- **演示价值**：3个核心模块单屏完成主要操作，支持3分钟快速演示
- **技术选型**：Next.js 14 + Tailwind CSS + Recharts
- **部署目标**：Vercel一键部署
- **后端选型**：RESTful API (FastAPI 后端)，WebSocket 用于 AI 实时对话输出（可选项）

### 1.3 范围界定
- **包含**：桌面端Web、3个核心模块、单用户演示
- **不包含**：移动端适配、用户权限管理、多租户

---

## 2. 信息架构（IA）

### 2.1 布局层（Layout）
- 顶部导航栏：Logo + 模块切换 + 搜索
- 底部状态栏：API 连接状态、数据更新时间

### 2.2 模块路由（App Router）
- `/dashboard` → 智能信号舱（首页）
- `/research` → AI投研助手（核心）
- `/risk` → 风险预警台

### 2.3 全局组件
- `SignalCard` - 信号卡片组件
- `ChatBubble` - AI 对话气泡组件
- `PriceChart/WhaleChart` - 图表组件

---

## 3. 页面详细需求

### 3.1 智能信号舱（/dashboard）

**核心价值**：作为数据动态的" cockpit "

**页面布局**：
- 顶部：3 个指标卡片（今日活跃信号数/高风险信号/AI解读完成率）
- 左侧 60%：信号流列表（时间倒序，支持筛选）
- 右侧 40%：AI 解读面板（可收起）

#### A. 指标卡片（Header Stats）
- 今日活跃信号数：数字动态变化，Hover 显示"最新更新：2 分钟前"
- 高风险信号：红色数字，点击自动过滤到高风险信号列表
- AI 解读完成率：进行中/已完成标记

#### B. 信号列表（Signal Feed）
**筛选器（顶部标签栏）**：
- 信号类型：巨鲸 | 资金费率 | 转账
- 风险级别：全部 | 高 | 中 | 低
- 时间维度：1h | 24h | 7d

**信号卡片数据结构**：
```typescript
interface SignalCard {
  id: string;
  type: 'whale' | 'funding' | 'transfer';
  riskLevel: 'high' | 'medium' | 'low';
  title: string; // 简短描述，如 "BTC 巨鲸转移"
  description: string; // 详情：地址、数额、时间、交易对手
  timestamp: number; // Unix 时间戳，显示为 "5分钟前"
  rawData: {
    from: string;
    to: string;
    amount: number;
    txHash: string; // 跳转 Etherscan
  };
  aiInsight?: string; // AI 解读（可选）
}
```

**交互行为**：
- 点击卡片：右侧展示 AI 解读面板，同时触发右侧 AI 解读（若无）
- Hover 显示："查看详情" 按钮，跳转 Etherscan
- 新信号进入：顶部插入 + 底部渐变动画

#### C. AI 解读面板（右侧，可收起）
**触发行为**：点击信号卡片 "AI 解读" 按钮

**加载状态**：
1. 一格一格加载（加强），蓝色进度条：加载中...
2. 格式化输出：分段 → 标题 → 数据引用
3. 操作建议按钮："进入投研"（跳转 Research 并带入上下文）

**空状态设计**：
- "暂无信号解读，请先选择信号..."
- API 报错：红色提示 + "数据连接异常，请检查网络" + 重试按钮

---

### 3.2 AI 投研助手（/research）— 核心模块

**核心价值**：结合 RAG 能力，实时新闻 + 链上数据综合投研分析

**页面布局**：
- 左侧 30%：文档上传面板
- 右侧 70%：对话气泡区域

#### A. 文档上传（左侧）

**文档上传区**：
- 支持 PDF/MD/TXT，最大 10MB
- 上传后显示文件名 + 页数/字数
- MVP 阶段只支持 3 个文档（Uniswap / Aave / ETH 风险报告），用户不可删除（提示"演示模式不支持"）
- RAG 向量库开启指示

**RAG 数据源配置**：
- [x] 实时市场数据（CoinGecko）
- [x] 巨鲸数据分析（Etherscan）
- [ ] 社交舆情数据（Pro 版本）
- 引用说明："分析时，AI 将结合以上数据..."

#### B. 对话气泡（右侧）

**对话气泡**：
- 用户气泡：右侧，蓝色背景
- AI 气泡：左侧，白色背景，支持 Markdown 渲染
- 引用标注：蓝色高亮 Hover 显示数据来源（Etherscan 0x742..."）
- 操作按钮：👍 / 👎（用于反馈分析质量）

**输入区**：
- 对话输入框：多行输入，最大 5 行
- 附件按钮：可上传文档作为上下文（作为后续对话的文件）
- 发送按钮：Enter 发送，Shift+Enter 换行
- 快捷问题提示："分析 ETH 近期 DEX 流动性"

**流式响应**：
- AI 思考时显示："正在分析..." → "正在检索数据..." → 逐字输出
- 引用来源：蓝色链接

**侧边栏行为**：
- 进入对话：点击 "进入投研"
- 跳转操作：自动带入上下文："请分析这个信号：[{信号摘要}]，参考[{文档名}]"

---

### 3.3 风险预警台（/risk）

**核心价值**：展示风险数据边界，实时风险监控

**页面布局**：
- 顶部：风险仪表盘 Gauge Charts，3 个指标
  - 市场风险指数
  - 合约风险指数
  - 流动性风险指数

#### A. 风险仪表盘

**市场风险指数（0-100）**：
- <30 绿色（安全），30-70 黄色（中等），>70 红色（危险）
- 风险因素标注：显示影响指数的 3 个因素
- 合约风险指数、流动性风险指数同理

#### B. 风险因素表

| 风险因素 | 影响级别 | 时间 | 高/中/低 | 操作 |
|---------|---------|------|---------|------|
| 大额转账异常 | High | ↑ 1 小时前 | 🔴 | 查看 /AI 分析 |
| 资金费率极端化 | Medium | 中等 | 🟡 | 查看 |
| 流动性下降 | Low | 下降 | 🟢 | 查看 |

#### 操作行为：
- "完全标记为已处理"（点亮后变灰）
- "导出报告"：生成 Markdown 格式的风险报告，可复制

---

## 3.4 全局组件

### A. 顶部导航栏（高度 64px）
- Logo：左侧，"OnChain Alpha" + 小徽标 "AI Research"
- 模块切换栏：居中，三个 Tab 可滑动切换
  - 当前 Tab 高亮，Hover 显示简短提示（如 "信号总览"）
- 全局搜索：右侧，支持 Cmd+K 快捷键唤起
  - 搜索范围：信号 ID、钱包地址、文档名

### B. 底部状态栏（高度 32px）
- 实时：API 连接状态（● / ○）+ "数据更新：2 分钟前"
- 仅显示：Mainnet only + 测试网标签

---

## 4. 交互规范

### 4.1 响应式布局
- 1280px：三栏布局（开始/开发优先）
- 1024-1280px：两栏布局（风险面板收起为图表）
- <1024px：单栏布局（底部标签导航，主要操作）

### 4.2 动画规范
- **页面切换**：淡入淡出，duration: 200ms
- **数据加载**：骨架屏加载（蓝色占位块），Loading Spinning
- **信号卡片进入**：从顶部滑入（translateY: -20px → 0）+ opacity
- **AI 打字效果**：逐字显示，20ms 延迟，仿打字机效果

### 4.3 错误处理
- API 超时（>5s）：Toast 提示："数据加载超时，请检查网络连接"
- 500 错误：骨架屏变红 + "服务器异常"
- AI 生成失败：气泡内显示："生成失败，请重试" + 重试按钮
- 文件上传过大：Toast 提示："文件超过 10MB 限制"

---

## 5. 数据约定（与后端约定）

### 5.1 RESTful 接口

**信号列表**：
- `GET /api/signals?type=whale&risk=high&limit=20`
- Response: SignalCard[]

**AI 解读（模拟，非流式）**：
- `POST /api/ai/insight`
- Body: { signalId: string, context?: string }
- Response: { insight: string, confidence: number, sources: Source[] }

**投研对话（SSE）**：
- `POST /api/ai/chat`
- Body: { message: string, conversationId?: string, knowledgeBase: string[], onChainData: boolean }
- Response: Stream (text/event-stream)

**风险数据**：
- `GET /api/risk/dashboard`
- Response: { gauges: GaugeData[], alerts: Alert[] }

**文档上传**：
- `POST /api/kb/upload (multipart/form-data)`
- `GET /api/kb/documents`
- `DELETE /api/kb/documents/:id`

### 5.2 本地存储（LocalStorage）
- `recentSignals`: 最近查看的信号 ID（最近 5 条）
- `chatHistory`: 当前会话对话历史（不清除）
- `sidebarCollapsed`: 侧边栏收起状态

---

## 6. 验收标准（Definition of Done）

### 6.1 功能验收
- [ ] 3 个模块页面可正常切换，URL 规范化
- [ ] 信号列表支持筛选，点击后右侧 AI 解读面板内容正确显示
- [ ] 支持上传 PDF 并在对话中引用（文档上传后，对话可引用）
- [ ] AI 对话支持 Markdown 渲染，支持 Hover 显示数据来源
- [ ] 风险仪表盘数据展示正确，5 个风险因素可切换（表格行操作）

### 6.2 性能验收
- [ ] 首屏加载 < 3s（3G 网络）
- [ ] 信号列表默认展示 20 条内容（无需分页，要求首屏性能）
- [ ] AI 首字延迟 < 2s（演示）或 < 500ms（正式）
