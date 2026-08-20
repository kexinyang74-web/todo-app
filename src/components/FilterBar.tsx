import { useMemo } from "react";
import { useTodoStore } from "../store/todoStore";
import { getCategoryOptions } from "../lib/todoFilter";
import type { StatusFilter } from "../types/todo";

// 输入框 / 下拉框的统一样式
const fieldCls =
  "h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100";

// 状态筛选的三个选项（值 + 显示文字）
const statusOptions: ReadonlyArray<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "全部" },
  { value: "undone", label: "未完成" },
  { value: "done", label: "已完成" },
];

// 搜索 + 筛选栏：关键词、分类、优先级、状态
function FilterBar() {
  const todos = useTodoStore((s) => s.todos);
  const keyword = useTodoStore((s) => s.keyword);
  const categoryFilter = useTodoStore((s) => s.categoryFilter);
  const priorityFilter = useTodoStore((s) => s.priorityFilter);
  const statusFilter = useTodoStore((s) => s.statusFilter);
  const setKeyword = useTodoStore((s) => s.setKeyword);
  const setCategoryFilter = useTodoStore((s) => s.setCategoryFilter);
  const setPriorityFilter = useTodoStore((s) => s.setPriorityFilter);
  const setStatusFilter = useTodoStore((s) => s.setStatusFilter);

  // 分类下拉选项：现有分类去重；当前选中分类已无任务时仍保留，避免空白
  const categories = useMemo(
    () => getCategoryOptions(todos, categoryFilter),
    [todos, categoryFilter]
  );

  return (
    <section className="flex flex-wrap items-center gap-2">
      {/* 搜索框：输入即时生效，不用点搜索按钮 */}
      <input
        value={keyword}
        aria-label="搜索"
        onChange={(e) => setKeyword(e.target.value)}
        placeholder="🔍 搜索标题或描述"
        className={`${fieldCls} min-w-40 flex-1`}
      />

      {/* 分类筛选 */}
      <select
        value={categoryFilter}
        aria-label="分类筛选"
        onChange={(e) => setCategoryFilter(e.target.value)}
        className={fieldCls}
      >
        <option value="all">全部分类</option>
        {categories.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      {/* 优先级筛选 */}
      <select
        value={priorityFilter}
        aria-label="优先级筛选"
        onChange={(e) =>
          setPriorityFilter(e.target.value as "all" | "high" | "mid" | "low")
        }
        className={fieldCls}
      >
        <option value="all">全部优先级</option>
        <option value="high">🔴 高</option>
        <option value="mid">🟡 中</option>
        <option value="low">🟢 低</option>
      </select>

      {/* 状态筛选：三段式按钮组，选中的高亮 */}
      <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-white text-sm">
        {statusOptions.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setStatusFilter(opt.value)}
            aria-pressed={statusFilter === opt.value}
            className={
              statusFilter === opt.value
                ? "min-h-10 cursor-pointer bg-sky-500 px-4 font-medium text-white"
                : "min-h-10 cursor-pointer px-4 text-slate-600 transition hover:bg-sky-50"
            }
          >
            {opt.label}
          </button>
        ))}
      </div>
    </section>
  );
}

export default FilterBar;
