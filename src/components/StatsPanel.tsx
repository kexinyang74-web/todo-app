import { useMemo } from "react";
import { useTodoStore } from "../store/todoStore";
import { computeStats } from "../lib/todoStats";

// 统计面板：任务数量、完成率进度条、今日到期、已过期
function StatsPanel() {
  const todos = useTodoStore((s) => s.todos);

  // useMemo：只有 todos 变化时才重新统计，避免每次渲染都算一遍
  // 统计逻辑收敛到纯函数 computeStats（见 src/lib/todoStats.ts）
  const stats = useMemo(() => computeStats(todos), [todos]);

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-500">
        <span>
          共 <b className="text-slate-800">{stats.total}</b> 项
        </span>
        <span>
          未完成 <b className="text-sky-600">{stats.undone}</b>
        </span>
        <span>
          已完成 <b className="text-emerald-600">{stats.done}</b>
        </span>
        <span>
          今日到期 <b className="text-amber-600">{stats.todayDue}</b>
        </span>
        <span>
          已过期 <b className="text-red-500">{stats.overdue}</b>
        </span>
        <span className="ml-auto font-medium text-slate-700">
          完成率 {stats.rate}%
        </span>
      </div>
      {/* 进度条：外层浅色轨道 + 内层渐变填充，宽度跟随完成率 */}
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-sky-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-sky-400 to-violet-400 transition-all duration-500"
          style={{ width: `${stats.rate}%` }}
        />
      </div>
    </section>
  );
}

export default StatsPanel;
