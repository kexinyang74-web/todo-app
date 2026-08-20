import { describe, expect, it } from "vitest";
import type { TodoDraft } from "../types/todo";
import { useTodoStore } from "./todoStore";

const draft: TodoDraft = {
  title: "买牛奶",
  description: "",
  dueDate: null,
  priority: "mid",
  category: "",
};

describe("addTodo（规格 3）", () => {
  it("追加任务：字符串 id、done=false、createdAt 时间戳；返回空错误数组", () => {
    const result = useTodoStore.getState().addTodo(draft);
    expect(result).toEqual([]);
    const todos = useTodoStore.getState().todos;
    expect(todos).toHaveLength(1);
    expect(todos[0]).toMatchObject({ ...draft, done: false });
    expect(typeof todos[0].id).toBe("string");
    expect(todos[0].id.length).toBeGreaterThan(0);
    expect(todos[0].createdAt).toBeTypeOf("number");
  });

  it("连续添加两条 id 不重复", () => {
    useTodoStore.getState().addTodo(draft);
    useTodoStore.getState().addTodo({ ...draft, title: "写周报" });
    const ids = useTodoStore.getState().todos.map((t) => t.id);
    expect(new Set(ids).size).toBe(2);
  });

  it("文本字段 trim 后存储", () => {
    useTodoStore.getState().addTodo({
      ...draft,
      title: "  买牛奶  ",
      description: " 顺便买鸡蛋 ",
      category: " 生活 ",
    });
    expect(useTodoStore.getState().todos[0]).toMatchObject({
      title: "买牛奶",
      description: "顺便买鸡蛋",
      category: "生活",
    });
  });

  it("非法 draft：不改变状态并返回错误", () => {
    const before = useTodoStore.getState().todos;
    const errors = useTodoStore.getState().addTodo({ ...draft, title: "   " });
    expect(errors).toEqual(["标题不能为空"]);
    expect(useTodoStore.getState().todos).toBe(before);
  });
});

describe("updateTodo（规格 3）", () => {
  it("更新字段并退出编辑模式，返回空错误数组", () => {
    useTodoStore.getState().addTodo(draft);
    const id = useTodoStore.getState().todos[0].id;
    useTodoStore.getState().setEditing(id);
    const result = useTodoStore.getState().updateTodo(id, {
      ...draft,
      title: "买牛奶两盒",
      priority: "high",
    });
    expect(result).toEqual([]);
    expect(useTodoStore.getState().todos[0].title).toBe("买牛奶两盒");
    expect(useTodoStore.getState().todos[0].priority).toBe("high");
    expect(useTodoStore.getState().editingId).toBeNull();
  });

  it("id 不存在 → 返回任务不存在且状态不变", () => {
    const result = useTodoStore.getState().updateTodo("nope", draft);
    expect(result).toEqual(["任务不存在"]);
    expect(useTodoStore.getState().todos).toEqual([]);
  });

  it("非法 draft → 返回错误且不更新", () => {
    useTodoStore.getState().addTodo(draft);
    const id = useTodoStore.getState().todos[0].id;
    const result = useTodoStore.getState().updateTodo(id, { ...draft, title: "" });
    expect(result).toEqual(["标题不能为空"]);
    expect(useTodoStore.getState().todos[0].title).toBe("买牛奶");
  });
});

describe("deleteTodo（规格 3）", () => {
  it("删除目标任务", () => {
    useTodoStore.getState().addTodo(draft);
    useTodoStore.getState().addTodo({ ...draft, title: "写周报" });
    const [a, b] = useTodoStore.getState().todos;
    useTodoStore.getState().deleteTodo(a.id);
    expect(useTodoStore.getState().todos.map((t) => t.id)).toEqual([b.id]);
  });

  it("删除正在编辑的任务时自动退出编辑模式", () => {
    useTodoStore.getState().addTodo(draft);
    const id = useTodoStore.getState().todos[0].id;
    useTodoStore.getState().setEditing(id);
    useTodoStore.getState().deleteTodo(id);
    expect(useTodoStore.getState().editingId).toBeNull();
  });

  it("id 不存在 → 静默无操作", () => {
    useTodoStore.getState().addTodo(draft);
    const before = useTodoStore.getState().todos;
    useTodoStore.getState().deleteTodo("nope");
    expect(useTodoStore.getState().todos).toBe(before);
  });
});

describe("toggleTodo / clearDone / clearAll（规格 3）", () => {
  it("toggleTodo 把 done 取反", () => {
    useTodoStore.getState().addTodo(draft);
    const id = useTodoStore.getState().todos[0].id;
    useTodoStore.getState().toggleTodo(id);
    expect(useTodoStore.getState().todos[0].done).toBe(true);
    useTodoStore.getState().toggleTodo(id);
    expect(useTodoStore.getState().todos[0].done).toBe(false);
  });

  it("clearDone 只删除已完成任务", () => {
    useTodoStore.getState().addTodo(draft);
    useTodoStore.getState().addTodo({ ...draft, title: "写周报" });
    const id = useTodoStore.getState().todos[0].id;
    useTodoStore.getState().toggleTodo(id);
    useTodoStore.getState().clearDone();
    expect(useTodoStore.getState().todos.map((t) => t.title)).toEqual(["写周报"]);
  });

  it("clearAll 清空任务并退出编辑模式", () => {
    useTodoStore.getState().addTodo(draft);
    const id = useTodoStore.getState().todos[0].id;
    useTodoStore.getState().setEditing(id);
    useTodoStore.getState().clearAll();
    expect(useTodoStore.getState().todos).toEqual([]);
    expect(useTodoStore.getState().editingId).toBeNull();
  });
});

describe("筛选条件 setter（规格 3）", () => {
  it("keyword / 分类 / 优先级 / 状态 setter 生效", () => {
    const s = useTodoStore.getState();
    s.setKeyword("牛奶");
    s.setCategoryFilter("生活");
    s.setPriorityFilter("high");
    s.setStatusFilter("done");
    expect(useTodoStore.getState()).toMatchObject({
      keyword: "牛奶",
      categoryFilter: "生活",
      priorityFilter: "high",
      statusFilter: "done",
    });
  });
});

describe("持久化（规格 2）", () => {
  it("addTodo 后写入 localStorage（持久化 todos 与 obsidian 设置）", () => {
    useTodoStore.getState().addTodo(draft);
    const raw = JSON.parse(localStorage.getItem("todo-app-storage")!);
    expect(raw.state.todos).toHaveLength(1);
    expect(raw.state).not.toHaveProperty("keyword");
    expect(raw.state.obsidian).toBeDefined();
  });

  it("旧版（version 0）数据重载时规范化迁移", async () => {
    localStorage.setItem(
      "todo-app-storage",
      JSON.stringify({
        state: {
          todos: [
            {
              id: 1,
              title: " 旧任务 ",
              done: "yes",
              priority: "urgent",
              dueDate: "bad",
              description: 123,
              category: " 工作 ",
              createdAt: "str",
            },
          ],
        },
        version: 0,
      })
    );
    await useTodoStore.persist.rehydrate();
    expect(useTodoStore.getState().todos).toEqual([
      {
        id: "1",
        title: "旧任务",
        done: false,
        priority: "mid",
        dueDate: null,
        description: "",
        category: "工作",
        createdAt: expect.any(Number),
      },
    ]);
  });

  it("当前版本数据重载时同样做规范化（非法标题被丢弃）", async () => {
    localStorage.setItem(
      "todo-app-storage",
      JSON.stringify({
        state: {
          todos: [
            {
              id: "x",
              title: "",
              done: false,
              priority: "low",
              dueDate: null,
              description: "",
              category: "",
              createdAt: 1,
            },
          ],
        },
        version: 1,
      })
    );
    await useTodoStore.persist.rehydrate();
    expect(useTodoStore.getState().todos).toEqual([]);
  });

  it("损坏的 JSON 不崩溃，恢复为空数据", async () => {
    localStorage.setItem("todo-app-storage", "{oops");
    await expect(useTodoStore.persist.rehydrate()).resolves.toBeUndefined();
    expect(useTodoStore.getState().todos).toEqual([]);
  });
});
