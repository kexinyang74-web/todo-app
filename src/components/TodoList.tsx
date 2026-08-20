import { useMemo } from "react";
import { useTodoStore } from "../store/todoStore";
import { filterTodos } from "../lib/todoFilter";
import TodoItem from "./TodoItem";

// 空状态提示：白卡片 + 居中灰字
function EmptyTip({ text }: { text: string }) {
  return (
    <p className="rounded-2xl bg-white px-4 py-10 text-center text-sm text-slate-400 shadow-sm">
      {text}
    </p>
  );
}

// 任务列表：把筛选 / 搜索条件组合起来，算出真正显示的任务
function TodoList() {
  const todos = useTodoStore((s) => s.todos);
  const keyword = useTodoStore((s) => s.keyword);
  const categoryFilter = useTodoStore((s) => s.categoryFilter);
  const priorityFilter = useTodoStore((s) => s.priorityFilter);
  const statusFilter = useTodoStore((s) => s.statusFilter);
  const clearDone = useTodoStore((s) => s.clearDone);

  // 核心筛选逻辑收敛到纯函数 filterTodos（见 src/lib/todoFilter.ts）
  // todos 或任一筛选条件变化时，useMemo 会自动重算
  const filtered = useMemo(() => {
    return filterTodos(todos, { keyword, categoryFilter, priorityFilter, statusFilter });
  }, [todos, keyword, categoryFilter, priorityFilter, statusFilter]);

  const doneCount = todos.filter((t) => t.done).length;

  // 两种空状态要区分开：
  // 一种是"根本没有任务"，一种是"有任务但筛选条件太严"
  if (todos.length === 0) {
    return <EmptyTip text="暂无任务，添加第一条试试吧 ✨" />;
  }
  if (filtered.length === 0) {
    return <EmptyTip text="没有符合筛选条件的任务 🔍" />;
  }

  return (
    <section className="flex flex-col gap-3">
      {filtered.map((todo) => (
        <TodoItem key={todo.id} todo={todo} />
      ))}

      {/* 列表底部：清空已完成（有已完成任务时才显示） */}
      {doneCount > 0 && (
        <button
          type="button"
          onClick={clearDone}
          className="ml-auto min-h-9 cursor-pointer rounded-full border border-red-200 px-4 text-xs text-red-500 transition hover:bg-red-500 hover:text-white"
        >
          清空已完成（{doneCount}）
        </button>
      )}
    </section>
  );
}

export default TodoList;
