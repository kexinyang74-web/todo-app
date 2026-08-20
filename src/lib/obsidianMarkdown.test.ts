import { describe, expect, it } from "vitest";
import type { Todo } from "../types/todo";
import { parseTodoMarkdown, serializeTodos } from "./obsidianMarkdown";

const base: Todo = {
  id: "1",
  title: "买牛奶",
  description: "两盒",
  dueDate: null,
  priority: "mid",
  category: "",
  done: false,
  createdAt: 1,
};

const todo = (t: Partial<Todo> & { title: string }): Todo => ({ ...base, ...t });

describe("serializeTodos（规格 3：Tasks 语法序列化）", () => {
  it("完整字段：- [ ] 标题 📅 日期 ⏫ #分类", () => {
    const md = serializeTodos([
      todo({ title: "买牛奶", dueDate: "2026-08-25", priority: "high", category: "生活" }),
    ]);
    expect(md).toContain("- [ ] 买牛奶 📅 2026-08-25 ⏫ #生活");
  });

  it("已完成任务导出为 [x]，未完成导出为 [ ]", () => {
    const md = serializeTodos([
      todo({ title: "写周报", done: true }),
      todo({ title: "背单词" }),
    ]);
    expect(md).toContain("- [x] 写周报");
    expect(md).toContain("- [ ] 背单词");
  });

  it("mid 优先级省略 emoji，low 导出 🔽", () => {
    const md = serializeTodos([
      todo({ title: "背单词", priority: "mid" }),
      todo({ title: "收拾房间", priority: "low" }),
    ]);
    expect(md).toContain("- [ ] 背单词\n");
    expect(md).toContain("- [ ] 收拾房间 🔽");
  });

  it("无截止日期/无分类时不输出对应片段", () => {
    const md = serializeTodos([todo({ title: "学英语" })]);
    expect(md).toBe("# 待办清单\n\n- [ ] 学英语\n");
  });

  it("描述不参与导出", () => {
    const md = serializeTodos([todo({ title: "买牛奶", description: "顺便买鸡蛋" })]);
    expect(md).not.toContain("顺便买鸡蛋");
  });

  it("空列表只输出标题行", () => {
    const md = serializeTodos([]);
    expect(md).toBe("# 待办清单\n\n");
  });
});

describe("parseTodoMarkdown（规格 3：解析）", () => {
  it("解析完整字段", () => {
    expect(parseTodoMarkdown("- [ ] 买牛奶 📅 2026-08-25 ⏫ #生活")).toEqual([
      { title: "买牛奶", dueDate: "2026-08-25", priority: "high", category: "生活", done: false },
    ]);
  });

  it("[x] 与 [X] 都视为已完成", () => {
    expect(parseTodoMarkdown("- [x] 任务甲\n- [X] 任务乙").map((t) => t.done)).toEqual([true, true]);
  });

  it("缺省字段：无 emoji → mid，无日期 → null，无标签 → 空分类", () => {
    expect(parseTodoMarkdown("- [ ] 背单词")).toEqual([
      { title: "背单词", dueDate: null, priority: "mid", category: "", done: false },
    ]);
  });

  it("非任务行（标题/普通文本/空行）被忽略", () => {
    const parsed = parseTodoMarkdown("# 待办清单\n\n一些说明文字\n- 普通列表项\n\n- [ ] 真任务");
    expect(parsed.map((t) => t.title)).toEqual(["真任务"]);
  });

  it("允许前置空白，且按顺序解析多行", () => {
    const parsed = parseTodoMarkdown("  - [ ] 任务甲\n- [ ] 任务乙");
    expect(parsed.map((t) => t.title)).toEqual(["任务甲", "任务乙"]);
  });

  it("非法日期被剥离且置 null", () => {
    expect(parseTodoMarkdown("- [ ] 任务 📅 2026-13-99")[0].dueDate).toBeNull();
  });

  it("多个 #tag 合并为分类（空格分隔），并从标题剥离", () => {
    expect(parseTodoMarkdown("- [ ] 任务 #工作 #生活")[0]).toMatchObject({
      title: "任务",
      category: "工作 生活",
    });
  });

  it("含空格分类序列化后往返保持一致", () => {
    const md = serializeTodos([todo({ title: "整理资料", category: "工作 生活" })]);
    expect(md).toContain("- [ ] 整理资料 #工作 #生活");
    expect(parseTodoMarkdown(md)[0].category).toBe("工作 生活");
  });

  it("标题为空的任务行被忽略", () => {
    expect(parseTodoMarkdown("- [ ] \n- [x] 有效任务")).toHaveLength(1);
  });

  it("序列化 → 解析往返后同步字段一致（描述置空）", () => {
    const todos: Todo[] = [
      todo({ title: "买牛奶", dueDate: "2026-08-25", priority: "high", category: "生活", done: true }),
      todo({ title: "写周报", priority: "low", category: "工作" }),
      todo({ title: "背单词", description: "不会同步的描述" }),
    ];
    const parsed = parseTodoMarkdown(serializeTodos(todos));
    expect(parsed).toEqual([
      { title: "买牛奶", dueDate: "2026-08-25", priority: "high", category: "生活", done: true },
      { title: "写周报", dueDate: null, priority: "low", category: "工作", done: false },
      { title: "背单词", dueDate: null, priority: "mid", category: "", done: false },
    ]);
  });
});
