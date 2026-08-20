import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Priority, StatusFilter, Todo, TodoDraft } from "../types/todo";
import { normalizeDraft, sanitizeTodo, validateDraft } from "../lib/todoValidation";

// 整个应用共享的状态和操作（"能干什么"都写在这里）
interface TodoState {
  // ----- 数据 -----
  todos: Todo[];
  editingId: string | null; // 正在编辑的任务 id，null = 当前是添加模式
  keyword: string;                    // 搜索关键词
  categoryFilter: string;             // 分类筛选："all" 或具体分类名
  priorityFilter: Priority | "all";   // 优先级筛选
  statusFilter: StatusFilter;         // 状态筛选

  // ----- 操作 -----
  // addTodo / updateTodo 返回错误信息数组：空数组 = 成功，非空 = 校验失败（状态不变）
  addTodo: (draft: TodoDraft) => string[];
  updateTodo: (id: string, draft: TodoDraft) => string[];
  deleteTodo: (id: string) => void;
  toggleTodo: (id: string) => void;
  clearDone: () => void;
  clearAll: () => void;
  setEditing: (id: string | null) => void;
  setKeyword: (k: string) => void;
  setCategoryFilter: (c: string) => void;
  setPriorityFilter: (p: Priority | "all") => void;
  setStatusFilter: (s: StatusFilter) => void;
}

// 唯一 id：优先 UUID；个别环境不支持时退回"时间戳+随机串"，保证不重复
function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// create<TodoState>()() 是 Zustand v5 的固定写法（两层括号）
// persist 中间件：状态变化时自动存入 localStorage，页面刷新后自动恢复
export const useTodoStore = create<TodoState>()(
  persist(
    (set, get) => ({
      todos: [],
      editingId: null,
      keyword: "",
      categoryFilter: "all",
      priorityFilter: "all",
      statusFilter: "all",

      // 新增：先规范化再校验，通过后补上 id、done、createdAt
      addTodo: (draft) => {
        const normalized = normalizeDraft(draft);
        const errors = validateDraft(normalized);
        if (errors.length > 0) return errors;
        set((s) => ({
          todos: [
            ...s.todos,
            { ...normalized, id: newId(), done: false, createdAt: Date.now() },
          ],
        }));
        return [];
      },

      // 编辑：先校验，通过后只替换 id 匹配的那一条，并自动退出编辑模式
      updateTodo: (id, draft) => {
        if (!get().todos.some((t) => t.id === id)) return ["任务不存在"];
        const normalized = normalizeDraft(draft);
        const errors = validateDraft(normalized);
        if (errors.length > 0) return errors;
        set((s) => ({
          todos: s.todos.map((t) => (t.id === id ? { ...t, ...normalized } : t)),
          editingId: null,
        }));
        return [];
      },

      // 删除：id 不存在时静默无操作；删除正在编辑的任务时同步退出编辑
      deleteTodo: (id) => {
        const { todos, editingId } = get();
        if (!todos.some((t) => t.id === id)) return;
        set({
          todos: todos.filter((t) => t.id !== id),
          editingId: editingId === id ? null : editingId,
        });
      },

      // 切换完成状态：done 取反
      toggleTodo: (id) =>
        set((s) => ({
          todos: s.todos.map((t) =>
            t.id === id ? { ...t, done: !t.done } : t
          ),
        })),

      // 清空已完成：只保留未完成的
      clearDone: () =>
        set((s) => ({ todos: s.todos.filter((t) => !t.done) })),

      // 全部清空（调用方负责弹确认框）
      clearAll: () => set({ todos: [], editingId: null }),

      setEditing: (id) => set({ editingId: id }),
      setKeyword: (keyword) => set({ keyword }),
      setCategoryFilter: (categoryFilter) => set({ categoryFilter }),
      setPriorityFilter: (priorityFilter) => set({ priorityFilter }),
      setStatusFilter: (statusFilter) => set({ statusFilter }),
    }),
    {
      name: "todo-app-storage", // localStorage 的键名
      version: 1, // 持久化格式版本号，旧数据自动走 migrate 迁移
      // 只持久化任务数据本身；筛选条件每次打开都重置，体验更自然
      partialize: (state) => ({ todos: state.todos }),
      // 旧版本数据：走迁移逻辑，逐条规范化
      migrate: (persisted) => {
        const raw = (persisted as { todos?: unknown } | null)?.todos;
        const todos = Array.isArray(raw)
          ? raw
              .map((t) => sanitizeTodo(t))
              .filter((t): t is Todo => t !== null)
          : [];
        return { todos };
      },
      // 同版本数据加载时也做一次规范化，防御手工改坏 localStorage 的情况
      merge: (persisted, current) => {
        const raw = (persisted as { todos?: unknown } | null)?.todos;
        const todos = Array.isArray(raw)
          ? raw
              .map((t) => sanitizeTodo(t))
              .filter((t): t is Todo => t !== null)
          : current.todos;
        return { ...current, todos };
      },
    }
  )
);
