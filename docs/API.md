# OnChain Alpha - API 接口文档

---

## 概述

- **Base URL**: `http://localhost:8000/api`
- **认证方式**: API Key（后续扩展）
- **内容类型**: `application/json`
- **字符编码**: UTF-8

---

## 📡 信号 API

### 获取信号列表

```
GET /api/signals
```

**Query 参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | string | 否 | 信号类型：`whale` / `funding` / `transfer` |
| risk | string | 否 | 风险级别：`high` / `medium` / `low` |
| limit | number | 否 | 返回数量，默认 20 |

**响应示例：**
```json
{
  "signals": [
    {
      "id": "sig_001",
      "type": "whale",
      "riskLevel": "high",
      "title": "BTC 巨鲸转移",
      "description": "地址 0x742... 转移 5000 BTC 到冷钱包",
      "timestamp": 1743600000,
      "rawData": {
        "from": "0x742d35Cc6634C0532",
        "to": "0x8Ba1f109551bD432803",
        "amount": 5000,
        "txHash": "0x1234...abcd"
      },
      "aiInsight": null
    }
  ],
  "total": 42,
  "hasMore": true
}
```

---

### 获取信号 AI 解读

```
POST /api/ai/insight
```

**请求体：**
```json
{
  "signalId": "sig_001",
  "context": "近期 BTC 市场波动较大"
}
```

**响应示例：**
```json
{
  "insight": "此巨鲸转移行为通常出现在市场顶部或底部信号...",
  "confidence": 0.85,
  "sources": [
    {
      "type": "etherscan",
      "url": "https://etherscan.io/tx/0x1234...abcd",
      "title": "交易详情"
    }
  ]
}
```

---

## 💬 AI 聊天 API

### 发送消息（流式）

```
POST /api/ai/chat
Content-Type: text/event-stream
```

**请求体：**
```json
{
  "message": "分析 Uniswap V3 的流动性变化趋势",
  "conversationId": "conv_001",
  "knowledgeBase": ["uniswap_v3_guide.pdf"],
  "onChainData": true
}
```

**SSE 响应格式：**
```
data: {"type": "text", "content": "根据"}
data: {"type": "text", "content": "链上数据"}
data: {"type": "text", "content": "分析..."}
data: {"type": "source", "content": "uniswap_v3_guide.pdf", "page": 12}
data: {"type": "done"}
```

**事件类型：**
| 事件 | 说明 |
|------|------|
| `text` | 文本片段 |
| `source` | 数据来源引用 |
| `done` | 响应结束 |

---

## ⚠️ 风险 API

### 获取风险仪表盘

```
GET /api/risk/dashboard
```

**响应示例：**
```json
{
  "gauges": [
    {
      "id": "market_risk",
      "name": "市场风险指数",
      "value": 65,
      "level": "medium",
      "factors": [
        { "name": "BTC 巨鲸转账", "impact": 1, "trend": "up" },
        { "name": "资金费率极端化", "impact": 2, "trend": "up" }
      ]
    },
    {
      "id": "contract_risk",
      "name": "合约风险指数",
      "value": 25,
      "level": "low",
      "factors": []
    },
    {
      "id": "liquidity_risk",
      "name": "流动性风险指数",
      "value": 45,
      "level": "medium",
      "factors": []
    }
  ],
  "alerts": [
    {
      "id": "alert_001",
      "type": "high",
      "title": "高风险信号预警",
      "description": "检测到 3 个高风险信号，建议关注",
      "timestamp": 1743600000
    }
  ]
}
```

---

## 📚 知识库 API

### 上传文档

```
POST /api/kb/upload
Content-Type: multipart/form-data
```

**Form 字段：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| file | File | 是 | PDF/MD/TXT 文件，最大 10MB |
| name | string | 否 | 自定义文档名称 |

**响应示例：**
```json
{
  "id": "doc_001",
  "name": "uniswap_v3_guide.pdf",
  "size": 2048576,
  "pages": 45,
  "status": "processed",
  "createdAt": "2026-04-02T12:00:00Z"
}
```

---

### 获取文档列表

```
GET /api/kb/documents
```

**响应示例：**
```json
{
  "documents": [
    {
      "id": "doc_001",
      "name": "uniswap_v3_guide.pdf",
      "size": 2048576,
      "pages": 45,
      "status": "processed",
      "createdAt": "2026-04-02T12:00:00Z"
    }
  ]
}
```

---

### 删除文档

```
DELETE /api/kb/documents/:id
```

**响应示例：**
```json
{
  "success": true,
  "message": "文档已删除"
}
```

---

## 🔌 WebSocket 连接

### 建立连接

```
ws://localhost:8000/ws/chat
```

**认证头：**
```
Authorization: Bearer <token>
```

---

## 📊 状态码说明

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未授权 |
| 413 | 文件过大 |
| 429 | 请求过于频繁 |
| 500 | 服务器内部错误 |

---

## ⚠️ 错误响应格式

```json
{
  "error": {
    "code": "INVALID_FILE_TYPE",
    "message": "不支持的文件类型，仅支持 PDF/MD/TXT",
    "details": {
      "received": "image/png",
      "expected": ["application/pdf", "text/markdown", "text/plain"]
    }
  }
}
```
