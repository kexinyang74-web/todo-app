import { useState } from "react";
import StatsPanel from "./components/StatsPanel";
import TodoForm from "./components/TodoForm";
import FilterBar from "./components/FilterBar";
import TodoList from "./components/TodoList";
import ObsidianSettingsPanel from "./components/ObsidianSettingsPanel";
import { useTodoStore } from "./store/todoStore";

// 应用根组件：只负责把各个组件按页面顺序组装起来
function App() {
  const [showObsidian, setShowObsidian] = useState(false);
  const total = useTodoStore((s) => s.todos.length);
  const clearAll = useTodoStore((s) => s.clearAll);

  function handleClearAll() {
    if (total === 0) return;
    // 原生确认框：明确告知数量和不可撤销，防止误操作
    if (confirm(`确定要清空全部 ${total} 条任务吗？\n此操作无法撤销！`)) {
      clearAll();
    }
  }

  return (
    // max-w-3xl：桌面端限制最大宽度居中；手机上 px-4 自动留边
    <main className="mx-auto max-w-3xl px-4 py-8 sm:py-10">
      {/* 页头 */}
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="bg-gradient-to-r from-sky-500 to-violet-500 bg-clip-text text-3xl font-bold text-transparent">
            我的待办清单
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            React + TypeScript + Zustand + Tailwind CSS
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          {/* Obsidian 同步设置开关 */}
          <button
            type="button"
            aria-label="Obsidian 同步设置"
            aria-pressed={showObsidian}
            onClick={() => setShowObsidian((v) => !v)}
            className={`size-10 cursor-pointer rounded-full border text-base transition ${
              showObsidian
                ? "border-sky-300 bg-sky-50"
                : "border-slate-200 hover:bg-sky-50"
            }`}
          >
            ⚙️
          </button>
          {/* 全部清空：红色系危险操作按钮，没任务时置灰 */}
          <button
            type="button"
            onClick={handleClearAll}
            disabled={total === 0}
            className="min-h-10 shrink-0 cursor-pointer rounded-full border border-red-200 px-4 text-sm text-red-500 transition hover:bg-red-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            全部清空
          </button>
        </div>
      </header>

      {/* 功能区：统计 → 表单 → 筛选 → 列表 */}
      <div className="flex flex-col gap-4">
        {showObsidian && <ObsidianSettingsPanel />}
        <StatsPanel />
        <TodoForm />
        <FilterBar />
        <TodoList />
      </div>
    </main>
  );
}

export default App;
