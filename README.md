# 项目管理应用 V2

基于 Supabase 的项目管理应用，采用模块化架构。

## 功能

- 📊 数据概览 Dashboard
- 📁 项目管理 + 甘特图
- 📄 合同管理
- 💰 费用管理
- ⚠️ 风险管理

## 技术栈

- 前端: 原生 JavaScript (ES6+)
- 后端: Supabase
- 部署: Vercel / GitHub Pages

## 本地开发

```bash
# 直接用浏览器打开
open index.html

# 或用 HTTP 服务器
python3 -m http.server 8080
```

## 部署

推送到 GitHub 后自动部署到 Vercel。

## 配置

需要在 Supabase 中创建以下表:
- projects
- contracts
- expenses
- risks
- project_phases
- app_config

## 访问

部署后访问: https://project-manager-v2.vercel.app

默认密码: admin123
