import type { Todo } from "../types/todo";
import { useTodoStore } from "../store/todoStore";
import { getDueLabel, type DueTone } from "../lib/dateLabel";

// 优先级标签的显示文字和配色（数据驱动，加新优先级只需在这里补一行）
const priorityStyle: Record<Todo["priority"], { label: string; cls: string }> = {
  high: { label: "高", cls: "bg-red-100 text-red-600" },
  mid: { label: "中", cls: "bg-amber-100 text-amber-600" },
  low: { label: "低", cls: "bg-emerald-100 text-emerald-600" },
};

// 小标签的通用样式（优先级 / 分类 / 日期共用）
const badgeCls = "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium";

// 截止日期徽标的配色：danger 过期 / warning 临近 / success 充裕 / neutral 已完成
const dueToneCls: Record<DueTone, string> = {
  neutral: "bg-slate-100 text-slate-400",
  danger: "bg-red-100 text-red-600",
  warning: "bg-amber-100 text-amber-600",
  success: "bg-emerald-100 text-emerald-600",
};

// 单条任务卡片
function TodoItem({ todo }: { todo: Todo }) {
  const toggleTodo = useTodoStore((s) => s.toggleTodo);
  const deleteTodo = useTodoStore((s) => s.deleteTodo);
  const setEditing = useTodoStore((s) => s.setEditing);
  const editingId = useTodoStore((s) => s.editingId);

  // 这条任务正在被编辑时，卡片加一圈高亮边框提示
  const isEditingThis = editingId === todo.id;

  // ----- 截止日期的文案和颜色（逻辑收敛到 getDueLabel 纯函数）-----
  const due = getDueLabel(todo);

  function handleDelete() {
    // confirm：浏览器原生确认框，防止误删
    if (confirm(`删除任务「${todo.title}」？`)) {
      deleteTodo(todo.id);
    }
  }

  return (
    <article
      className={`rounded-2xl bg-white p-4 shadow-sm transition ${
        isEditingThis ? "ring-2 ring-sky-400" : "hover:shadow-md"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* 复选框：accent-sky-500 让原生复选框直接变成主题蓝色 */}
        <input
          type="checkbox"
          checked={todo.done}
          aria-label={`标记「${todo.title}」为${todo.done ? "未完成" : "已完成"}`}
          onChange={() => toggleTodo(todo.id)}
          className="mt-0.5 size-5 shrink-0 cursor-pointer accent-sky-500"
        />

        {/* 中间主体：标题 + 标签行 + 描述 */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3
              className={
                todo.done
                  ? "font-medium text-slate-400 line-through"
                  : "font-medium text-slate-800"
              }
            >
              {todo.title}
            </h3>
            <span className={`${badgeCls} ${priorityStyle[todo.priority].cls}`}>
              {priorityStyle[todo.priority].label}
            </span>
            {todo.category && (
              <span className={`${badgeCls} bg-sky-100 text-sky-700`}>
                {todo.category}
              </span>
            )}
            {due && (
              <span className={`${badgeCls} ${dueToneCls[due.tone]}`}>
                📅 {due.dateText}
                {due.suffix ? ` · ${due.suffix}` : ""}
              </span>
            )}
          </div>
          {todo.description && (
            <p className="mt-1 text-sm text-slate-500">{todo.description}</p>
          )}
        </div>

        {/* 右侧操作按钮：编辑 / 删除 */}
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={() => setEditing(isEditingThis ? null : todo.id)}
            aria-label="编辑"
            className="size-8 cursor-pointer rounded-lg text-base text-slate-400 transition hover:bg-sky-50 hover:text-sky-600"
          >
            ✏️
          </button>
          <button
            type="button"
            onClick={handleDelete}
            aria-label="删除"
            className="size-8 cursor-pointer rounded-lg text-base text-slate-400 transition hover:bg-red-50 hover:text-red-500"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* 正在编辑的提示（表单在页面上方，这里只做指引） */}
      {isEditingThis && (
        <p className="mt-2 text-xs text-sky-600">↑ 正在编辑，请在上方表单中修改后保存</p>
      )}
    </article>
  );
}

export default TodoItem;
