# OnChain Alpha

> 面向专业交易者的实时市场信号聚合平台

## 技术栈

- **框架**: Next.js 14 (App Router)
- **样式**: Tailwind CSS
- **图标**: Lucide React
- **语言**: TypeScript

## 开发进度

### 市场信号模块 ✅
- [x] 顶部市场状态栏（恐慌指数/BTC/ETH/美股指数）
- [x] 信号卡片列表
- [x] 信号详情面板
- [x] 筛选功能
- [ ] 排序功能
- [ ] 实时数据接入
- [ ] WebSocket 推送

### 投研工具箱模块 ⏳
- [ ] 地址分析器
- [ ] 信号回测
- [ ] 多信号叠加
- [ ] 监控列表

## 本地开发

```bash
cd web

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

打开 http://localhost:3000 查看应用。

## 项目结构

```
web/src/
├── app/               # App Router 页面
│   ├── layout.tsx    # 根布局
│   ├── page.tsx      # 主页面
│   └── globals.css   # 全局样式
├── components/        # React 组件
│   ├── Header.tsx    # 顶部导航+市场状态栏
│   ├── SignalCard.tsx # 信号卡片
│   └── SignalDetail.tsx # 信号详情面板
├── lib/              # 工具函数
│   ├── mockData.ts   # Mock 数据
│   └── utils.ts      # 通用工具
└── types/           # TypeScript 类型定义
    └── index.ts
```
