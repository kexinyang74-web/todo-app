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

## Obsidian 同步

应用可与 Obsidian 笔记双向联动（通过 [Local REST API](https://github.com/coddingtonbear/obsidian-local-rest-api) 插件），任务以 Obsidian Tasks 语法保存，例如：

```markdown
- [ ] 买牛奶 📅 2026-08-25 ⏫ #生活
- [x] 写周报 🔼 #工作
```

### 首次配置

1. 在 Obsidian 中安装并启用 Local REST API 插件；
2. 打开插件设置：记下 API Key，并开启 CORS（允许网页应用跨域请求）；
3. 打开应用页头右上角的 ⚙️，填写 API Key（默认端口 `27123`、文件 `todo.md`，可改）；
4. 点击“测试连接”，成功后点“导出到 Obsidian”或开启“自动同步”（本地改动 1 秒后自动写入文件）。

### 使用说明

- 自动同步方向为“本地 → 文件”；在 Obsidian 里改的任务，需在应用里点“从 Obsidian 导入”拉回；
- 导入为整表替换（会先确认），文件里没有任务行时会取消导入以防误清空；
- 描述字段不参与同步（导出省略、导入为空）；
- 首次从线上页面同步时，浏览器可能提示“允许访问本地网络”，选择允许即可；也可在本地 `npm run dev` 下使用，体验最顺。
