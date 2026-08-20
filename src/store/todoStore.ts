import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Priority, StatusFilter, Todo, TodoDraft } from "../types/todo";
import { normalizeDraft, sanitizeTodo, validateDraft } from "../lib/todoValidation";
import { parseTodoMarkdown, serializeTodos } from "../lib/obsidianMarkdown";
import {
  ObsidianApiError,
  readVaultFile,
  testObsidianConnection as probeConnection,
  writeVaultFile,
} from "../lib/obsidianClient";

export interface ObsidianSettings {
  enabled: boolean;
  apiKey: string;
  port: number;
  filePath: string;
  autoSync: boolean;
}

export type SyncState = "idle" | "syncing" | "ok" | "error";

export type SyncResult = { ok: true; message: string } | { ok: false; error: string };

export const DEFAULT_OBSIDIAN_SETTINGS: ObsidianSettings = {
  enabled: false,
  apiKey: "",
  port: 27123,
  filePath: "todo.md",
  autoSync: false,
};

// 持久化设置规范化：类型错误回退默认值
function sanitizeObsidianSettings(raw: unknown): ObsidianSettings {
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  return {
    enabled: typeof r.enabled === "boolean" ? r.enabled : DEFAULT_OBSIDIAN_SETTINGS.enabled,
    apiKey: typeof r.apiKey === "string" ? r.apiKey : DEFAULT_OBSIDIAN_SETTINGS.apiKey,
    port:
      typeof r.port === "number" && r.port >= 1 && r.port <= 65535
        ? r.port
        : DEFAULT_OBSIDIAN_SETTINGS.port,
    filePath:
      typeof r.filePath === "string" && r.filePath.trim()
        ? r.filePath.trim()
        : DEFAULT_OBSIDIAN_SETTINGS.filePath,
    autoSync:
      typeof r.autoSync === "boolean" ? r.autoSync : DEFAULT_OBSIDIAN_SETTINGS.autoSync,
  };
}

// 整个应用共享的状态和操作
interface TodoState {
  // ----- 任务数据与筛选 -----
  todos: Todo[];
  editingId: string | null;
  keyword: string;
  categoryFilter: string;
  priorityFilter: Priority | "all";
  statusFilter: StatusFilter;

  // ----- Obsidian 同步 -----
  obsidian: ObsidianSettings;
  syncState: SyncState;
  lastError: string | null;

  // ----- 任务操作 -----
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

  // ----- Obsidian 同步操作 -----
  setObsidianSettings: (partial: Partial<ObsidianSettings>) => void;
  testObsidianConnection: () => Promise<SyncResult>;
  exportToObsidian: () => Promise<SyncResult>;
  importFromObsidian: () => Promise<SyncResult>;
}

// 唯一 id：优先 UUID；个别环境不支持时退回"时间戳+随机串"
function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// 自动同步的模块级状态：1 秒防抖定时器 + 导入时的抑制标志
let syncTimer: ReturnType<typeof setTimeout> | null = null;
let suppressAutoSync = false;

function clearSyncTimer(): void {
  if (syncTimer !== null) {
    clearTimeout(syncTimer);
    syncTimer = null;
  }
}

function scheduleAutoSync(): void {
  clearSyncTimer();
  syncTimer = setTimeout(() => {
    syncTimer = null;
    void useTodoStore.getState().exportToObsidian();
  }, 1000);
}

export const useTodoStore = create<TodoState>()(
  persist(
    (set, get) => ({
      todos: [],
      editingId: null,
      keyword: "",
      categoryFilter: "all",
      priorityFilter: "all",
      statusFilter: "all",
      obsidian: DEFAULT_OBSIDIAN_SETTINGS,
      syncState: "idle",
      lastError: null,

      // ----- 任务操作（与 v1 一致）-----
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

      deleteTodo: (id) => {
        const { todos, editingId } = get();
        if (!todos.some((t) => t.id === id)) return;
        set({
          todos: todos.filter((t) => t.id !== id),
          editingId: editingId === id ? null : editingId,
        });
      },

      toggleTodo: (id) =>
        set((s) => ({
          todos: s.todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
        })),

      clearDone: () =>
        set((s) => ({ todos: s.todos.filter((t) => !t.done) })),

      clearAll: () => set({ todos: [], editingId: null }),

      setEditing: (id) => set({ editingId: id }),
      setKeyword: (keyword) => set({ keyword }),
      setCategoryFilter: (categoryFilter) => set({ categoryFilter }),
      setPriorityFilter: (priorityFilter) => set({ priorityFilter }),
      setStatusFilter: (statusFilter) => set({ statusFilter }),

      // ----- Obsidian 同步操作 -----
      setObsidianSettings: (partial) => {
        const merged = { ...get().obsidian, ...partial };
        set({ obsidian: merged, lastError: null });
        // 关闭同步或关闭自动同步时，取消未触发的防抖导出
        if (!merged.enabled || !merged.autoSync) clearSyncTimer();
      },

      testObsidianConnection: async () => {
        const { obsidian } = get();
        if (!obsidian.apiKey.trim()) {
          const error = "请先填写 API Key";
          set({ syncState: "error", lastError: error });
          return { ok: false, error };
        }
        set({ syncState: "syncing", lastError: null });
        const result = await probeConnection(obsidian);
        if (result === "ok") {
          set({ syncState: "ok" });
          return { ok: true, message: "连接成功" };
        }
        const error =
          result === "auth-failed"
            ? "连接失败：API Key 不正确或已失效"
            : "连接失败：无法连接到 Obsidian，请确认 Obsidian 已打开且 Local REST API 插件已启用";
        set({ syncState: "error", lastError: error });
        return { ok: false, error };
      },

      exportToObsidian: async () => {
        const { todos, obsidian } = get();
        if (!obsidian.enabled || !obsidian.apiKey.trim()) {
          const error = "请先启用同步并填写 API Key";
          set({ syncState: "error", lastError: error });
          return { ok: false, error };
        }
        set({ syncState: "syncing", lastError: null });
        try {
          await writeVaultFile(obsidian, serializeTodos(todos));
          set({ syncState: "ok" });
          return { ok: true, message: `已导出 ${todos.length} 条任务到 ${obsidian.filePath}` };
        } catch (err) {
          const error = err instanceof ObsidianApiError ? err.message : "导出失败，请检查连接";
          set({ syncState: "error", lastError: error });
          return { ok: false, error };
        }
      },

      importFromObsidian: async () => {
        const { obsidian } = get();
        if (!obsidian.enabled || !obsidian.apiKey.trim()) {
          const error = "请先启用同步并填写 API Key";
          set({ syncState: "error", lastError: error });
          return { ok: false, error };
        }
        set({ syncState: "syncing", lastError: null });
        try {
          const content = await readVaultFile(obsidian);
          if (content === null) {
            const error = `未找到文件 ${obsidian.filePath}（可能还不存在）`;
            set({ syncState: "error", lastError: error });
            return { ok: false, error };
          }
          const parsed = parseTodoMarkdown(content);
          if (parsed.length === 0) {
            const error = "文件中没有可导入的任务，已取消导入（防止误清空）";
            set({ syncState: "error", lastError: error });
            return { ok: false, error };
          }
          const todos = parsed.map((p) => ({
            ...p,
            id: newId(),
            description: "",
            createdAt: Date.now(),
          }));
          // 整表替换；抑制自动导出，避免导入后立刻回写
          suppressAutoSync = true;
          set({ todos, editingId: null });
          suppressAutoSync = false;
          set({ syncState: "ok" });
          return { ok: true, message: `已导入 ${todos.length} 条任务` };
        } catch (err) {
          const error = err instanceof ObsidianApiError ? err.message : "导入失败，请检查连接";
          set({ syncState: "error", lastError: error });
          return { ok: false, error };
        }
      },
    }),
    {
      name: "todo-app-storage",
      version: 2, // v2 起持久化 obsidian 设置
      partialize: (state) => ({ todos: state.todos, obsidian: state.obsidian }),
      // 旧版本（v0/v1）数据：todos 逐条规范化，obsidian 补默认值
      migrate: (persisted) => {
        const raw = (persisted as { todos?: unknown; obsidian?: unknown } | null) ?? {};
        const todos = Array.isArray(raw.todos)
          ? raw.todos.map((t) => sanitizeTodo(t)).filter((t): t is Todo => t !== null)
          : [];
        return { todos, obsidian: sanitizeObsidianSettings(raw.obsidian) };
      },
      // 同版本数据加载时同样做规范化，防御手工改坏 localStorage
      merge: (persisted, current) => {
        const raw = (persisted as { todos?: unknown; obsidian?: unknown } | null) ?? {};
        const todos = Array.isArray(raw.todos)
          ? raw.todos.map((t) => sanitizeTodo(t)).filter((t): t is Todo => t !== null)
          : current.todos;
        return {
          ...current,
          todos,
          obsidian: sanitizeObsidianSettings(raw.obsidian ?? current.obsidian),
        };
      },
    }
  )
);

// 自动同步：enabled && autoSync 时，todos 变更后 1 秒防抖导出（仅本地 → 文件）
useTodoStore.subscribe((state, prev) => {
  if (suppressAutoSync || state.todos === prev.todos) return;
  if (!state.obsidian.enabled || !state.obsidian.autoSync) return;
  scheduleAutoSync();
});
