# OnChain Alpha - 开发启动清单

---

## 🚀 项目初始化

### 1. 创建 Next.js 项目

```bash
cd projects/onchain-alpha
npx create-next-app@14 frontend --typescript --tailwind --eslint --app
cd frontend
```

### 2. 安装核心依赖

```bash
# 图表
npm install recharts

# 状态管理
npm install zustand

# 表单
npm install react-hook-form

# HTTP 请求
npm install axios

# SSE 处理
npm install eventsource
```

### 3. 配置 Tailwind

```js
// tailwind.config.ts
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#3B82F6",
        secondary: "#8B5CF6",
        danger: "#EF4444",
        warning: "#F59E0B",
        success: "#10B981",
      },
    },
  },
  plugins: [],
};
```

---

## 📁 目录结构创建

```bash
cd frontend

# 创建目录
mkdir -p app/{dashboard,research,risk}
mkdir -p components/{ui,global,dashboard,research,risk}
mkdir -p lib
mkdir -p types
mkdir -p stores

# 创建基础文件
touch app/layout.tsx
touch app/globals.css
touch app/page.tsx
```

---

## 🎨 全局样式配置

```css
/* app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --primary: #3B82F6;
  --secondary: #8B5CF6;
  --danger: #EF4444;
  --warning: #F59E0B;
  --success: #10B981;
}
```

---

## 📝 类型定义

```typescript
// types/signal.ts
export interface SignalCard {
  id: string;
  type: 'whale' | 'funding' | 'transfer';
  riskLevel: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  timestamp: number;
  rawData: {
    from: string;
    to: string;
    amount: number;
    txHash: string;
  };
  aiInsight?: string;
}
```

---

## ✅ 开发检查清单

- [ ] Next.js 项目创建成功
- [ ] Tailwind 配置完成
- [ ] 全局组件 Navbar + Footer 已创建
- [ ] 路由跳转正常
- [ ] 基础状态管理 Store 已配置

---

## 📌 下一步

1. 完成项目初始化
2. 创建 Mock 数据
3. 开始 Dashboard 模块开发
4. 接入后端 API（可选）

---
