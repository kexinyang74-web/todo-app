# 技术设计

## 技术栈
- React 19 + TypeScript + Vite
- Tailwind CSS v4（样式）
- Zustand（状态管理，persist 中间件持久化到 localStorage）
- date-fns（截止日期的格式化与计算）

## 主题
浅色清新蓝（以 PRD.md 设计要求为准）：
#eff6ff 背景 + 蓝→紫渐变强调色 + 圆角卡片 + 柔和阴影

## 项目结构
src/
  components/
    TodoForm.tsx      添加 / 编辑任务表单（标题、描述、截止日期、优先级、分类）
    TodoList.tsx      任务列表（应用筛选与搜索，含空状态提示）
    TodoItem.tsx      单条任务（勾选、编辑、删除、标签展示）
    FilterBar.tsx     搜索框 + 分类 / 优先级 / 状态筛选
    StatsPanel.tsx    统计面板（总数、完成率进度条、今日到期、已过期）
  store/
    todoStore.ts      Zustand 全局状态 + localStorage 持久化
  types/
    todo.ts           Todo 等数据类型定义
  App.tsx             页面组装
  main.tsx            入口
  index.css           Tailwind 引入 + 全局主题

## 数据管理
- 任务数据结构：{ id, title, description, dueDate, priority, category, done, createdAt }
- 状态集中在 Zustand store，通过 persist 中间件自动写入 localStorage（键名 todo-app-storage）
- 筛选 / 搜索条件也放 store，便于多个组件共享
- 派生数据（筛选结果、统计数字）在组件中用 useMemo 计算，避免重复计算
- 编辑模式：store 里存 editingId，TodoForm 读取后自动切换为编辑表单
