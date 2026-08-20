import { useEffect, useState, type FormEvent } from "react";
import type { Priority } from "../types/todo";
import { useTodoStore } from "../store/todoStore";

// 表单里次要字段的统一样式（输入框 / 下拉框共用）
const fieldCls =
  "h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100";

// 添加 / 编辑任务表单
// editingId 不为空时自动变成"编辑模式"，表单会填入对应任务的数据
function TodoForm() {
  const editingId = useTodoStore((s) => s.editingId);
  // 找到正在编辑的任务；不在编辑状态时为 null
  const editingTodo = useTodoStore((s) =>
    s.todos.find((t) => t.id === s.editingId) ?? null
  );
  const addTodo = useTodoStore((s) => s.addTodo);
  const updateTodo = useTodoStore((s) => s.updateTodo);
  const setEditing = useTodoStore((s) => s.setEditing);

  // 表单自己的受控状态（React"受控组件"：输入框的值由 state 管理）
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<Priority>("mid");
  const [category, setCategory] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isEditing = editingTodo !== null;

  // 进入 / 退出编辑模式时，把任务数据同步进表单（或清空表单）
  // 依赖只写 editingId：只在"切换编辑对象"的瞬间执行一次
  useEffect(() => {
    setError(null);
    if (editingTodo) {
      setTitle(editingTodo.title);
      setDescription(editingTodo.description);
      setDueDate(editingTodo.dueDate ?? "");
      setPriority(editingTodo.priority);
      setCategory(editingTodo.category);
    } else {
      setTitle("");
      setDescription("");
      setDueDate("");
      setPriority("mid");
      setCategory("");
    }
  }, [editingId]);

  function handleSubmit(e: FormEvent) {
    // 阻止表单默认的页面刷新行为
    e.preventDefault();

    // date 输入框的值是 "YYYY-MM-DD" 字符串，没填就存 null
    const draft = {
      title: title.trim(),
      description: description.trim(),
      dueDate: dueDate || null,
      priority,
      category: category.trim(),
    };

    if (isEditing && editingTodo) {
      // 保存后 store 会自动退出编辑模式；校验失败则展示错误
      const errors = updateTodo(editingTodo.id, draft);
      setError(errors.length > 0 ? errors[0] : null);
    } else {
      const errors = addTodo(draft);
      if (errors.length > 0) {
        setError(errors[0]);
        return;
      }
      // 添加成功后清空表单，方便连续录入
      setTitle("");
      setDescription("");
      setDueDate("");
      setPriority("mid");
      setCategory("");
      setError(null);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-5 shadow-sm">
      {/* 编辑模式提示条 */}
      {isEditing && editingTodo && (
        <div className="mb-4 flex items-center justify-between rounded-xl bg-sky-50 px-4 py-2 text-sm text-sky-700">
          <span>正在编辑：{editingTodo.title}</span>
          <button
            type="button"
            onClick={() => setEditing(null)}
            className="text-slate-400 transition hover:text-slate-600"
          >
            取消编辑
          </button>
        </div>
      )}

      {/* 第一行：标题 + 提交按钮 */}
      <div className="flex gap-2">
        <input
          value={title}
          aria-label="任务标题"
          onChange={(e) => {
            setTitle(e.target.value);
            if (error) setError(null); // 开始输入就清掉错误提示
          }}
          placeholder="今天要做什么？"
          maxLength={100}
          className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
        />
        <button
          type="submit"
          className="min-h-11 shrink-0 cursor-pointer rounded-xl bg-gradient-to-r from-sky-500 to-violet-500 px-5 font-medium text-white transition hover:opacity-90 active:scale-95"
        >
          {isEditing ? "💾 保存修改" : "➕ 添加任务"}
        </button>
      </div>

      {/* 校验错误提示：提交被拒绝时显示具体原因 */}
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-500">
          {error}
        </p>
      )}

      {/* 第二行：描述 / 截止日期 / 优先级 + 分类
          grid 布局：手机一列，≥sm 宽度时三列，自动响应式 */}
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <input
          value={description}
          aria-label="任务描述"
          onChange={(e) => setDescription(e.target.value)}
          placeholder="描述（可选）"
          maxLength={200}
          className={fieldCls}
        />
        <input
          type="date"
          value={dueDate}
          aria-label="截止日期"
          onChange={(e) => setDueDate(e.target.value)}
          className={fieldCls}
        />
        <div className="flex gap-2">
          <select
            value={priority}
            aria-label="优先级"
            onChange={(e) => setPriority(e.target.value as Priority)}
            className={`${fieldCls} flex-1`}
          >
            <option value="high">🔴 高</option>
            <option value="mid">🟡 中</option>
            <option value="low">🟢 低</option>
          </select>
          <input
            value={category}
            aria-label="分类"
            onChange={(e) => setCategory(e.target.value)}
            placeholder="分类"
            maxLength={20}
            className={`${fieldCls} w-24`}
          />
        </div>
      </div>
    </form>
  );
}

export default TodoForm;
