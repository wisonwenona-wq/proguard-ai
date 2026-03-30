# 保全全 ProGuard AI - 前后端分离版

本项目是从单文件 HTML 版重写的前后端分离 Vue 3 + Vite + Express 架构。

## 项目结构
- `/frontend`: Vue 3 实现的前端
- `/backend`: Node.js + Express 实现的后端 API

## 运行步骤

### 1. 启动后端
```bash
cd backend
npm install
npm start
```
后端服务将运行在 `http://localhost:3000`

### 2. 启动前端
```bash
cd frontend
npm install
npm run dev
```
前端服务将运行在 Vite 默认端口（通常是 `http://localhost:5173`），并已配置 `/api` 代理到后端。

## 主要变更
1. **模块化**: 将原本硬编码在 Vue 实例中的 `advisors`, `history`, `policies`, `vault`, `hotspots`, `risks` 数据全部迁移至后端。
2. **API 化**: 前端通过 `axios` 在 `onMounted` 阶段从后端获取初始数据，AI 对话逻辑迁至后端 `/api/chat`。
3. **架构升级**: 从单 HTML 升级为 Vite 构建系统，样式抽离至 `style.css`，逻辑抽离至 `App.vue`。
4. **保持界面不变**: 严格继承了原有的全部样式和交互逻辑。
