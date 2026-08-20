# 产品规格：待办事项应用（Todo App）

> 状态：implemented（规格对应测试已全部通过，见 spec 第 6 节验证方法）
> 依据：PRD.md、TECH_DESIGN.md，以及代码走查发现的可验收缺口

> 实现说明（相对旧代码的关键变化）：
> - `id` 从时间戳数字改为 UUID 字符串，避免同毫秒碰撞；旧数据加载时自动转字符串；
> - `addTodo` / `updateTodo` 返回校验错误数组，表单据此展示错误提示；
> - 删除正在编辑的任务会自动退出编辑模式；
> - localStorage 增加版本号与 migrate/merge 规范化，坏数据不崩溃；
> - 筛选、统计、截止日期文案、校验收敛为 `src/lib/` 纯函数，组件只负责展示；
> - 表单输入与图标按钮补齐 aria-label / aria-pressed / role="alert" 等可访问性基础。

## 1. 场景化信息

- 背景：个人待办管理，纯前端单页应用，无后端、无账号体系。
- 用户画像：个人用户，桌面端与手机端都会使用。
- 使用场景：
  - 快速添加任务：标题必填，可附带描述、截止日期、优先级、分类；
  - 勾选完成 / 取消完成、编辑、删除单条任务；
  - 清空已完成、清空全部（清空全部需二次确认）；
  - 按关键词（标题/描述）、分类、优先级、状态筛选；
  - 查看统计：总数、未完成、已完成、完成率、今日到期、已过期；
  - 刷新 / 重开页面后数据不丢失。

## 2. 数据模型

### Todo

| 字段 | 类型 | 必填 | 约束与边界 |
| --- | --- | --- | --- |
| `id` | `string` | 是 | 全局唯一；新建时用 `crypto.randomUUID()`；旧数据中的数字 id 加载时转为字符串 |
| `title` | `string` | 是 | trim 后非空；长度 ≤ 100 字符 |
| `description` | `string` | 否 | trim；长度 ≤ 200 字符；空串视为"无描述" |
| `dueDate` | `string \| null` | 否 | 格式必须为 `YYYY-MM-DD` 且是合法日期；`null` 表示未设置；非法值拒绝提交 |
| `priority` | `"high" \| "mid" \| "low"` | 是 | 默认 `"mid"` |
| `category` | `string` | 否 | trim；长度 ≤ 20 字符；空串视为"未分类" |
| `done` | `boolean` | 是 | 默认 `false` |
| `createdAt` | `number` | 是 | epoch 毫秒时间戳 |

### Store 状态

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `todos` | `Todo[]` | 任务数组，保持添加顺序 |
| `editingId` | `string \| null` | 正在编辑的任务 id；`null` = 添加模式 |
| `keyword` | `string` | 搜索关键词 |
| `categoryFilter` | `string` | `"all"` 或具体分类名 |
| `priorityFilter` | `Priority \| "all"` | 优先级筛选 |
| `statusFilter` | `"all" \| "undone" \| "done"` | 状态筛选 |

### 持久化

- localStorage 键名：`todo-app-storage`（Zustand persist，`version: 1`）。
- 只持久化 `todos`；筛选条件与编辑状态每次打开重置。
- 加载时逐条规范化：字段缺失补默认值、类型错误修复、标题非法则丢弃该条；
  数字 id 转字符串；旧格式（无优先级等）自动补默认值。
- localStorage 中 JSON 损坏或非数组 → 视为空数据，页面正常打开，不崩溃。

## 3. 接口设计（Store 操作）

以下操作均为同步接口。`addTodo` / `updateTodo` 返回 `string[]`：
空数组 = 成功；非空数组 = 校验错误信息列表，且不改变任何状态。

| 方法 | 入参 | 成功返回 | 失败返回 / 行为 |
| --- | --- | --- | --- |
| `addTodo` | `draft: TodoDraft` | `[]`，追加新任务（自动生成 id、done=false、createdAt） | 校验错误数组；状态不变 |
| `updateTodo` | `id, draft` | `[]`，替换该任务字段并退出编辑模式 | 校验错误数组；或 id 不存在返回 `["任务不存在"]` |
| `deleteTodo` | `id` | `void`，删除该任务；若正在编辑则同时退出编辑 | id 不存在时静默无操作 |
| `toggleTodo` | `id` | `void`，`done` 取反 | id 不存在时静默无操作 |
| `clearDone` | — | `void`，删除所有已完成任务 | — |
| `clearAll` | — | `void`，清空 `todos` 并退出编辑 | 调用方负责二次确认 |
| `setEditing` | `id \| null` | `void` | — |
| `setKeyword` / `setCategoryFilter` / `setPriorityFilter` / `setStatusFilter` | 对应值 | `void` | — |

### 派生逻辑（纯函数，供组件与测试共用）

- `filterTodos(todos, filters): Todo[]`：关键词 + 分类 + 优先级 + 状态，多条件 AND。
- `getCategoryOptions(todos, selected): string[]`：现有任务分类去重；若 `selected` 不在其中，仍保留它，避免下拉框显示空白。
- `computeStats(todos, now?): { total, done, undone, rate, todayDue, overdue }`：
  - `rate`：`total === 0 ? 0 : Math.round(done / total * 100)`，取值 0–100；
  - `todayDue`：未完成且 `dueDate` 是今天（按自然日）；
  - `overdue`：未完成且 `dueDate` 早于今天。
- `getDueLabel(todo, now?)`：返回 `{ dateText, suffix, tone }`：
  - 未设置截止日期 → 不显示；
  - 过期 → suffix `已过期`（danger 色）；今天 → `今天`（warning）；1–3 天内 → `N天后`（warning）；更远 → 无后缀（success 色）；
  - 已完成 → 一律灰色且无后缀。

## 4. 校验规则与边界条件

- `title`：trim 后非空且 ≤ 100 字符；否则报错 `标题不能为空` / `标题不能超过 100 字`。
- `description`：trim 后 ≤ 200 字符；否则报错。
- `category`：trim 后 ≤ 20 字符；否则报错。
- `dueDate`：`null` 或合法 `YYYY-MM-DD`（`parseISO` + `isValid`）；否则报错 `截止日期格式不正确`。
- 表单提交空标题：不添加任务，显示错误提示，且不刷新页面。
- 关键词搜索：大小写不敏感；匹配 `title` 或 `description`；纯空格关键词等同无关键词。
- 列表空状态二态区分：`没有任务` 与 `筛选无结果` 文案不同。
- 删除正在编辑的任务：自动退出编辑模式（`editingId` 置 null）。
- 清空全部按钮：无任务时禁用；点击后需 `confirm` 确认才执行。
- 完成率：0 条任务时显示 0%，不出现 NaN/除零。

## 5. 明确不做的事（排除范围）

- 不做后端、账号、云同步、多端实时同步；
- 不做拖拽排序、手动排序、分组（列表保持添加顺序）；
- 不做导入导出、分享、重复任务检测、撤销；
- 不做到点提醒 / 通知（仅展示过期与今日到期）；
- 不做分页 / 无限滚动（个人数据量级小）；
- 不做跨标签页实时同步。

## 6. 验证方法

本项目为 TypeScript 前端项目，三层验收做等价适配：

1. 静态校验：`npm run typecheck`（`tsc --noEmit`，等价规格中的 pyright 角色）；
2. 动态测试：`npm run test:run`（Vitest，等价 pytest 角色），
   每条规格映射到测试用例（见下表）；
3. 人工复检：`npm run build` 后按清单走查交互、移动端与可访问性。

### 规格 → 测试用例映射

| 规格条目 | 测试文件 |
| --- | --- |
| 数据模型字段约束、draft 校验规则 | `src/lib/todoValidation.test.ts` |
| 持久化旧数据迁移与坏数据防护 | `src/lib/todoValidation.test.ts`、`src/store/todoStore.test.ts` |
| 筛选 / 分类选项派生 | `src/lib/todoFilter.test.ts` |
| 统计与截止日期文案 | `src/lib/todoStats.test.ts`、`src/lib/dateLabel.test.ts` |
| Store 全部接口与边界 | `src/store/todoStore.test.ts` |
| 表单添加 / 编辑 / 空标题错误提示 | `src/components/TodoForm.test.tsx` |
| 列表筛选展示与空状态 | `src/components/TodoList.test.tsx` |
| 单条任务勾选 / 编辑 / 删除 | `src/components/TodoItem.test.tsx` |
| 统计面板渲染 | `src/components/StatsPanel.test.tsx` |
| 端到端主流程 + localStorage 持久化 | `src/App.test.tsx` |

### 人工复检清单

- [ ] 添加（含描述/日期/优先级/分类）→ 出现在列表顶部，统计同步更新；
- [ ] 空标题提交 → 出现错误提示，列表不变；
- [ ] 勾选完成 → 删除线 + 灰色 + 完成率变化；
- [ ] 编辑保存 → 内容更新并退出编辑；取消编辑 → 表单恢复添加模式；
- [ ] 删除需确认；删除编辑中任务 → 无残留编辑状态；
- [ ] 清空已完成 / 全部（含确认）行为正确；
- [ ] 搜索、分类、优先级、状态筛选组合正确；
- [ ] 刷新后数据保留；筛选条件重置；
- [ ] 手机宽度下布局不破、可操作（响应式）；
- [ ] 图标按钮有可访问名称（aria-label），键盘可操作。
