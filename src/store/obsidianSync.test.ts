import { afterEach, describe, expect, it, vi } from "vitest";
import { useTodoStore } from "./todoStore";

const draft = {
  title: "买牛奶",
  description: "",
  dueDate: null,
  priority: "mid" as const,
  category: "",
};

const httpRes = (status: number, body = "") =>
  ({ ok: status >= 200 && status < 300, status, text: async () => body }) as Response;

const mockFetch = (impl: (url: string, init?: RequestInit) => Promise<Response>) => {
  const fn = vi.fn(impl);
  vi.stubGlobal("fetch", fn);
  return fn;
};

const enableObsidian = (overrides: Partial<ReturnType<typeof useTodoStore.getState>["obsidian"]> = {}) =>
  useTodoStore.getState().setObsidianSettings({
    enabled: true,
    apiKey: "test-key",
    ...overrides,
  });

describe("Obsidian 设置（规格 2）", () => {
  it("默认设置：关闭、空 key、端口 27123、路径 todo.md、autoSync 关闭", () => {
    expect(useTodoStore.getState().obsidian).toEqual({
      enabled: false,
      apiKey: "",
      port: 27123,
      filePath: "todo.md",
      autoSync: false,
    });
    expect(useTodoStore.getState().syncState).toBe("idle");
    expect(useTodoStore.getState().lastError).toBeNull();
  });

  it("setObsidianSettings 合并更新并持久化", () => {
    useTodoStore.getState().setObsidianSettings({ enabled: true, apiKey: "k1", port: 27124, filePath: "Inbox/todo.md", autoSync: true });
    expect(useTodoStore.getState().obsidian).toMatchObject({
      enabled: true,
      apiKey: "k1",
      port: 27124,
      filePath: "Inbox/todo.md",
      autoSync: true,
    });
    const raw = JSON.parse(localStorage.getItem("todo-app-storage")!);
    expect(raw.state.obsidian).toMatchObject({ apiKey: "k1", port: 27124 });
  });

  it("v0 旧数据重载：todos 规范化且 obsidian 补默认值", async () => {
    localStorage.setItem(
      "todo-app-storage",
      JSON.stringify({
        state: { todos: [{ id: 1, title: " 旧任务 ", priority: "urgent", done: "yes" }] },
        version: 0,
      })
    );
    await useTodoStore.persist.rehydrate();
    expect(useTodoStore.getState().todos[0]).toMatchObject({ id: "1", title: "旧任务", priority: "mid" });
    expect(useTodoStore.getState().obsidian).toEqual({
      enabled: false,
      apiKey: "",
      port: 27123,
      filePath: "todo.md",
      autoSync: false,
    });
  });

  it("v1 数据重载同样补 obsidian 默认值", async () => {
    localStorage.setItem(
      "todo-app-storage",
      JSON.stringify({
        state: {
          todos: [{ id: "a", title: "任务", done: false, priority: "low", dueDate: null, description: "", category: "", createdAt: 1 }],
        },
        version: 1,
      })
    );
    await useTodoStore.persist.rehydrate();
    expect(useTodoStore.getState().todos).toHaveLength(1);
    expect(useTodoStore.getState().obsidian.autoSync).toBe(false);
  });
});

describe("exportToObsidian（规格 3）", () => {
  it("导出成功：PUT 写入序列化内容，syncState=ok", async () => {
    enableObsidian();
    useTodoStore.getState().addTodo({ ...draft, title: "买牛奶" });
    const fetchImpl = mockFetch(async (url, init) => {
      expect(url).toContain("/v1/vault/todo.md");
      expect(init?.method).toBe("PUT");
      expect(String(init?.body)).toContain("- [ ] 买牛奶");
      return httpRes(204);
    });
    const result = await useTodoStore.getState().exportToObsidian();
    expect(result).toEqual({ ok: true, message: expect.stringContaining("已导出 1 条") });
    expect(useTodoStore.getState().syncState).toBe("ok");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("导出失败：syncState=error 且 lastError 记录原因", async () => {
    enableObsidian();
    useTodoStore.getState().addTodo(draft);
    mockFetch(async () => {
      throw new TypeError("fetch failed");
    });
    const result = await useTodoStore.getState().exportToObsidian();
    expect(result.ok).toBe(false);
    expect(useTodoStore.getState().syncState).toBe("error");
    expect(useTodoStore.getState().lastError).toContain("无法连接");
  });

  it("未启用或缺 API Key：直接返回错误且不发请求", async () => {
    const fetchImpl = mockFetch(async () => httpRes(204));
    const result = await useTodoStore.getState().exportToObsidian();
    expect(result.ok).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("importFromObsidian（规格 3：整表替换）", () => {
  it("导入成功：整表替换、清 editingId、描述置空", async () => {
    enableObsidian();
    useTodoStore.getState().addTodo({ ...draft, title: "本地任务" });
    const localId = useTodoStore.getState().todos[0].id;
    useTodoStore.getState().setEditing(localId);
    mockFetch(async () => httpRes(200, "- [ ] 任务甲 📅 2026-08-25 ⏫ #生活\n- [x] 任务乙"));
    const result = await useTodoStore.getState().importFromObsidian();
    expect(result).toEqual({ ok: true, message: expect.stringContaining("已导入 2 条") });
    const todos = useTodoStore.getState().todos;
    expect(todos).toHaveLength(2);
    expect(todos[0]).toMatchObject({
      title: "任务甲",
      dueDate: "2026-08-25",
      priority: "high",
      category: "生活",
      done: false,
      description: "",
    });
    expect(todos[1]).toMatchObject({ title: "任务乙", done: true });
    expect(useTodoStore.getState().editingId).toBeNull();
    expect(useTodoStore.getState().syncState).toBe("ok");
  });

  it("文件不存在（404）：报错且本地不变", async () => {
    enableObsidian();
    useTodoStore.getState().addTodo(draft);
    mockFetch(async () => httpRes(404));
    const before = useTodoStore.getState().todos;
    const result = await useTodoStore.getState().importFromObsidian();
    expect(result.ok).toBe(false);
    expect(useTodoStore.getState().todos).toBe(before);
  });

  it("文件中没有任务行：报错且本地不变（防止误清空）", async () => {
    enableObsidian();
    useTodoStore.getState().addTodo(draft);
    mockFetch(async () => httpRes(200, "# 只有标题\n没有任务"));
    const before = useTodoStore.getState().todos;
    const result = await useTodoStore.getState().importFromObsidian();
    expect(result).toEqual({ ok: false, error: expect.stringContaining("没有可导入") });
    expect(useTodoStore.getState().todos).toBe(before);
  });
});

describe("autoSync（规格 3：仅本地 → 文件）", () => {
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    useTodoStore.getState().setObsidianSettings({ enabled: false, autoSync: false });
  });

  it("开启后本地变更 1 秒防抖自动导出", async () => {
    vi.useFakeTimers();
    enableObsidian({ autoSync: true });
    const fetchImpl = mockFetch(async () => httpRes(204));
    useTodoStore.getState().addTodo({ ...draft, title: "自动任务" });
    expect(fetchImpl).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1000);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(String(fetchImpl.mock.calls[0][1]?.body)).toContain("- [ ] 自动任务");
    expect(useTodoStore.getState().syncState).toBe("ok");
  });

  it("快速连续变更合并为一次导出", async () => {
    vi.useFakeTimers();
    enableObsidian({ autoSync: true });
    const fetchImpl = mockFetch(async () => httpRes(204));
    useTodoStore.getState().addTodo({ ...draft, title: "任务一" });
    useTodoStore.getState().addTodo({ ...draft, title: "任务二" });
    await vi.advanceTimersByTimeAsync(1000);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const body = String(fetchImpl.mock.calls[0][1]?.body);
    expect(body).toContain("任务一");
    expect(body).toContain("任务二");
  });

  it("关闭 autoSync 后不再自动导出", async () => {
    vi.useFakeTimers();
    enableObsidian({ autoSync: true });
    const fetchImpl = mockFetch(async () => httpRes(204));
    useTodoStore.getState().addTodo(draft);
    useTodoStore.getState().setObsidianSettings({ autoSync: false });
    await vi.advanceTimersByTimeAsync(1500);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
