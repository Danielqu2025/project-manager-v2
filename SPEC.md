# 项目管理应用 V2 - 设计规范

## 概述
基于 Supabase 的项目管理应用，采用模块化架构。

## 技术栈
- 前端：原生 JavaScript (ES6+) + TailwindCSS CDN
- 后端：Supabase (PostgreSQL)
- 部署：Vercel

## 目录结构
```
project-manager-v2/
├── index.html          # 入口（登录）
├── app.html           # 主应用
├── css/
│   └── style.css      # 样式
├── js/
│   ├── app.js        # 主入口
│   ├── router.js     # 路由
│   ├── api/
│   │   └── supabase.js
│   └── components/
│       ├── modal.js
│       ├── toast.js
│       └── table.js
└── SPEC.md
```

## 阶段开发计划

### Phase 1: 基础架构 ✅
- [x] 目录结构
- [x] 路由系统
- [ ] 基础组件

### Phase 2: 核心页面
- [ ] Dashboard
- [ ] 项目列表
- [ ] 项目详情

### Phase 3: 业务模块
- [ ] 合同管理
- [ ] 费用管理
- [ ] 风险管理

## 数据库表
- projects: 项目主表
- contracts: 合同
- expenses: 费用
- risks: 风险
- project_phases: 项目阶段
- app_config: 系统配置
