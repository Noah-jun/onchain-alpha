# OnChain Alpha - 技术架构文档

---

## 🏗️ 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│                    (Next.js 14 + Tailwind)                  │
├─────────────┬─────────────┬─────────────┬──────────────────┤
│  Dashboard  │   Research  │    Risk     │   全局组件       │
│   /dashboard│  /research  │   /risk     │  Navbar/Footer  │
└─────────────┴──────┬──────┴─────────────┴────────┬───────────┘
                     │                            │
                     │    REST API + WebSocket     │
                     ▼                            ▼
┌─────────────────────────────────────────────────────────────┐
│                        Backend                               │
│               (FastAPI + ChromaDB + LangChain)               │
├─────────────┬─────────────┬─────────────┬──────────────────┤
│ Signal API  │  AI Chat API │  Risk API   │   KB Upload API  │
│ GET /signals│ POST /chat  │ GET /risk   │  POST /kb/upload │
└─────────────┴─────────────┴─────────────┴──────────────────┘
         │                │                │
         ▼                ▼                ▼
   ┌──────────┐    ┌──────────┐      ┌──────────┐
   │ 链上数据  │    │ LLM +    │      │ 向量数据库│
   │  (Ethers │    │ RAG      │      │ (ChromaDB│
   │  scan)   │    │ 检索     │      │ )        │
   └──────────┘    └──────────┘      └──────────┘
```

---

## 📂 目录结构

```
onchain-alpha/
├── frontend/                        # Next.js 前端
│   ├── app/                        # App Router
│   │   ├── (routes)/               # 路由组
│   │   │   ├── dashboard/
│   │   │   ├── research/
│   │   │   └── risk/
│   │   ├── layout.tsx              # 根布局
│   │   ├── globals.css             # 全局样式
│   │   └── providers.tsx           # 全局 Provider
│   │
│   ├── components/                 # 组件库
│   │   ├── ui/                     # 基础 UI 组件
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   └── toast.tsx
│   │   │
│   │   ├── global/                  # 全局组件
│   │   │   ├── navbar.tsx
│   │   │   ├── footer.tsx
│   │   │   ├── signal-card.tsx
│   │   │   ├── chat-bubble.tsx
│   │   │   └── price-chart.tsx
│   │   │
│   │   ├── dashboard/              # Dashboard 模块
│   │   │   ├── stats-card.tsx
│   │   │   ├── signal-feed.tsx
│   │   │   └── ai-insight-panel.tsx
│   │   │
│   │   ├── research/               # Research 模块
│   │   │   ├── document-upload.tsx
│   │   │   ├── chat-interface.tsx
│   │   │   └── message-list.tsx
│   │   │
│   │   └── risk/                   # Risk 模块
│   │       ├── gauge-chart.tsx
│   │       └── risk-factor-list.tsx
│   │
│   ├── lib/                        # 工具函数
│   │   ├── api.ts                  # API 请求封装
│   │   ├── utils.ts                # 通用工具
│   │   └── format.ts               # 格式化函数
│   │
│   ├── types/                      # 类型定义
│   │   ├── signal.ts
│   │   ├── chat.ts
│   │   └── risk.ts
│   │
│   └── stores/                     # 状态管理
│       ├── signal-store.ts
│       ├── chat-store.ts
│       └── risk-store.ts
│
├── backend/                         # FastAPI 后端
│   ├── main.py                     # 应用入口
│   ├── api/                        # API 路由
│   │   ├── signals.py              # 信号相关 API
│   │   ├── chat.py                 # AI 聊天 API
│   │   ├── risk.py                 # 风险数据 API
│   │   └── kb.py                   # 知识库 API
│   │
│   ├── services/                   # 业务逻辑层
│   │   ├── signal_service.py
│   │   ├── ai_service.py
│   │   ├── risk_service.py
│   │   └── kb_service.py
│   │
│   ├── models/                     # 数据模型
│   │   ├── signal.py
│   │   ├── chat.py
│   │   └── risk.py
│   │
│   ├── core/                      # 核心配置
│   │   ├── config.py              # 配置管理
│   │   ├── security.py           # 安全相关
│   │   └── database.py            # 数据库连接
│   │
│   ├── agents/                    # AI Agent
│   │   ├── rag_agent.py          # RAG Agent
│   │   └── signal_agent.py       # 信号分析 Agent
│   │
│   └── vectorstore/              # 向量存储
│       └── chroma.py
│
└── docs/                          # 文档
    ├── PRD.md
    ├── ARCHITECTURE.md
    └── API.md
```

---

## 🔌 API 设计

### 1. 信号 API

**获取信号列表**
```
GET /api/signals?type=whale&risk=high&limit=20
```

**获取单个信号详情 + AI 解读**
```
POST /api/ai/insight
Body: { signalId: string, context?: string }
```

### 2. AI 聊天 API

**发送消息（SSE 流式响应）**
```
POST /api/ai/chat
Body: { 
  message: string, 
  conversationId?: string, 
  knowledgeBase: string[],
  onChainData: boolean 
}
Response: text/event-stream
```

### 3. 风险 API

**获取风险仪表盘数据**
```
GET /api/risk/dashboard
Response: { gauges: GaugeData[], alerts: Alert[] }
```

### 4. 知识库 API

**上传文档**
```
POST /api/kb/upload (multipart/form-data)
```

**获取文档列表**
```
GET /api/kb/documents
```

**删除文档**
```
DELETE /api/kb/documents/:id
```

---

## 🎨 前端状态管理

采用 Zustand 进行状态管理：

| Store | 职责 |
|-------|------|
| `signalStore` | 信号列表、筛选状态、当前选中信号 |
| `chatStore` | 对话历史、当前输入、加载状态 |
| `riskStore` | 风险指数、预警规则 |

---

## 🔄 数据流

### Dashboard 数据流
```
用户操作 → Zustand Store → API 请求 → 更新 Store → UI 响应
                              ↓
                      LocalStorage 持久化
```

### Research 流式响应
```
用户发送消息 → POST /api/ai/chat → WebSocket 连接
                              ↓
                      SSE 流式返回 → 更新 UI（逐字显示）
```

---

## 📦 依赖清单

### 前端依赖
```json
{
  "next": "14.x",
  "react": "18.x",
  "tailwindcss": "3.x",
  "recharts": "2.x",
  "zustand": "4.x",
  "react-hook-form": "7.x",
  "@tanstack/react-query": "5.x"
}
```

### 后端依赖
```json
{
  "fastapi": "0.110.x",
  "uvicorn": "0.27.x",
  "langchain": "0.1.x",
  "chromadb": "0.4.x",
  "openai": "1.x",
  "python-multipart": "0.0.9"
}
```

---

## 🚀 部署架构

```
GitHub Repo
     ↓
   Vercel (Frontend) ← 自动部署 main 分支
     ↓
  环境变量配置
  - API_BASE_URL
  - WS_URL
```

---

## 🔐 安全考虑

- [ ] API 请求添加认证 Token
- [ ] 文件上传限制类型和大小
- [ ] WebSocket 连接认证
- [ ] CORS 配置
- [ ] Rate Limiting
