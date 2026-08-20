# 待办事项应用

个人待办清单：添加（标题/描述/截止日期/优先级/分类）、编辑、删除、清空、筛选与搜索、统计面板，数据保存在浏览器 localStorage，刷新不丢失。

## 技术栈

React 19 + TypeScript + Vite · Zustand（persist 持久化）· Tailwind CSS v4 · date-fns · Vitest + Testing Library

## 本地开发

```bash
npm install
npm run dev
```

## 测试与构建

```bash
npm run test:run    # 全量测试（Vitest，71 用例）
npm run typecheck   # 静态类型检查（tsc --noEmit）
npm run build       # 生产构建
```

## 线上地址

<https://kexinyang74-web.github.io/todo-app/>
