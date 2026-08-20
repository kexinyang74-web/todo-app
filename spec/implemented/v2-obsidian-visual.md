# 产品规格 v2：浅色视觉打磨 + Obsidian 自动同步

> 状态：planned（待实现，测试通过后移入 implemented/）
> 依据：产品规格 v1（spec/implemented/product_spec.md）与用户确认的方向（界面与交互体验优化、Obsidian 联动）

## 1. 场景化信息

- 用户自己使用，手机与电脑都要顺手。
- 使用场景 A（视觉体验）：日常打开待办清单时界面更精致、反馈更顺滑；移动端触控目标够大。
- 使用场景 B（Obsidian 联动）：用户同时在 Obsidian 中维护任务，希望应用与 Obsidian 笔记保持同步——
  应用内改动自动写入笔记，Obsidian 里的改动可手动拉回，且同步格式采用 Obsidian Tasks 语法便于在 Obsidian 内筛选统计。

## 2. 数据模型（新增）

### ObsidianSettings（持久化，随 store 保存）

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `enabled` | `boolean` | `false` | 是否启用同步 |
| `apiKey` | `string` | `""` | Local REST API 插件密钥 |
| `port` | `number` | `27123` | 插件本地服务端口 |
| `filePath` | `string` | `"todo.md"` | 相对 vault 根目录的笔记路径 |
| `autoSync` | `boolean` | `false` | 本地改动自动写入 Obsidian |

### Store 状态（新增）

- `syncState`: `"idle" \| "syncing" \| "ok" \| "error"`；
- `lastError`: `string \| null`，最近一次同步失败原因；
- 同步设置持久化，`syncState`/`lastError` 不持久化；persist `version` 升到 2，migrate 兼容 v0/v1（todos 规范化规则不变，obsidian 补默认值）。

## 3. 接口设计

### Obsidian 笔记格式（Tasks 语法）

```markdown
# 待办清单

- [ ] 买牛奶 📅 2026-08-25 ⏫ #生活
- [x] 写周报 📅 2026-08-20 🔼 #工作
- [ ] 背单词 🔽
```

- 序列化：`- [ ]`/`- [x]` + 标题 + `📅 YYYY-MM-DD`（有截止）+ 优先级 emoji（high=⏫ / mid=🔼 / low=🔽，mid 省略）+ `#分类`（有分类）；
- 解析：只解析复选框行（`- [ ]` / `- [x]` / `- [X]`，允许前置空白），其余行（标题、注释、普通文本）忽略；`[x]/[X]` → done，`[ ]` → undone；优先级缺省 mid；日期非法则忽略；第一个及后续 `#tag` 合并为分类（空格分隔）；标题为空的行忽略；描述不参与同步（导出省略、导入置空）。

### 同步客户端（src/lib/obsidianClient.ts）

- `readVaultFile(conn, fetch?)`: `GET http://127.0.0.1:<port>/v1/vault/<路径>`，`Authorization: Bearer <apiKey>`；404 视为文件不存在（返回 null）；5 秒超时。
- `writeVaultFile(conn, content, fetch?)`: `PUT` 同地址，`Content-Type: text/markdown`，创建或覆盖。
- `testObsidianConnection(conn, fetch?)`: 探测 `/v1/vault/`（404 时回退 `/vault/`），返回 `"ok" | "auth-failed" | "unreachable"`。
- 路径逐段 `encodeURIComponent`（反斜杠归一为 `/`）防目录穿越；fetch 可注入便于测试。
- 错误分类：401 → API Key 错误；网络失败/超时 → 连接类错误（给出排查引导）；写路径 404 → 路径错误。

### Store 动作（新增）

| 方法 | 行为 |
| --- | --- |
| `setObsidianSettings(partial)` | 合并更新设置，清空 lastError |
| `testObsidianConnection()` | 返回 `{ok, message/error}`，更新 syncState |
| `exportToObsidian()` | 序列化当前 todos 写入笔记；成功/失败更新 syncState 与 lastError |
| `importFromObsidian()` | 读取解析后**整表替换** todos 并清 editingId（UI 先确认）；文件不存在或无任务行时取消导入并报错，防止误清空 |

### 自动同步规则

- `enabled && autoSync` 时，todos 变更后 1 秒防抖自动执行 `exportToObsidian`（仅本地 → 文件）；
- Obsidian 侧改动通过手动“从 Obsidian 导入”拉回；
- 导入过程中抑制自动导出，避免回写循环。

## 4. 校验规则与边界条件（视觉与交互）

- 保持浅色清新蓝 + 蓝→紫渐变主题，不换风格、不新增深色模式；
- 移动端触控目标 ≥ 40px；页面适配 safe-area；
- 过渡动效尊重 `prefers-reduced-motion`（减弱时关闭动画）；
- 不改变现有布局结构与数据流；现有断言（删除线、进度条宽度、空状态文案、aria 标签）保持成立；
- 导入前必须确认；文件无任务行时不替换本地数据；
- 设置面板对连接失败给出引导：确认 Obsidian 已打开、Local REST API 插件已启用并开启 CORS、浏览器允许访问本地网络。

## 5. 明确不做的事（排除范围）

- 不做 Obsidian → 本地自动轮询（导入始终手动）；
- 不做双向冲突合并（导入=整表替换；自动同步=仅本地→文件）；
- 描述字段不参与同步；
- 不新增 npm 依赖、不修改现有任务字段与筛选/统计逻辑；
- 不做深色模式、不换全新视觉风格；
- 不做多 vault / 多文件管理（单文件路径可配置）。

## 6. 验证方法

1. 静态校验：`npm run typecheck`；
2. 动态测试：`npm run test:run`（原 71 例回归 + 新增用例，见映射表）；
3. 人工复检：`npm run build` 后浏览器实测，包含 Obsidian 插件联动（首次可能触发本地网络授权）。

### 规格 → 测试映射

| 规格条目 | 测试文件 |
| --- | --- |
| Markdown 序列化/解析与往返 | `src/lib/obsidianMarkdown.test.ts` |
| 同步客户端 URL/鉴权/错误/超时/路径编码 | `src/lib/obsidianClient.test.ts` |
| 设置持久化、迁移、导出/导入/自动同步 | `src/store/obsidianSync.test.ts` |
| 设置面板交互、导入确认、连接测试 | `src/components/ObsidianSettingsPanel.test.tsx` |
| 视觉打磨回归（原 71 例保持全绿） | 现有全部测试 |
