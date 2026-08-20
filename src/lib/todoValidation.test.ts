import { describe, expect, it } from "vitest";
import type { TodoDraft } from "../types/todo";
import { normalizeDraft, sanitizeTodo, validateDraft } from "./todoValidation";

const validDraft: TodoDraft = {
  title: "买牛奶",
  description: "",
  dueDate: null,
  priority: "mid",
  category: "",
};

describe("validateDraft（规格 4：校验规则）", () => {
  it("合法 draft 返回空错误数组", () => {
    expect(validateDraft(validDraft)).toEqual([]);
    expect(validateDraft({ ...validDraft, dueDate: "2024-02-29" })).toEqual([]);
  });

  it("标题为空或全空格 → 标题不能为空", () => {
    expect(validateDraft({ ...validDraft, title: "" })).toEqual(["标题不能为空"]);
    expect(validateDraft({ ...validDraft, title: "   " })).toEqual(["标题不能为空"]);
  });

  it("标题长度边界：100 字合法，101 字报错", () => {
    expect(validateDraft({ ...validDraft, title: "a".repeat(100) })).toEqual([]);
    expect(validateDraft({ ...validDraft, title: "a".repeat(101) })).toEqual([
      "标题不能超过 100 字",
    ]);
  });

  it("描述超过 200 字报错", () => {
    expect(validateDraft({ ...validDraft, description: "a".repeat(201) })).toEqual([
      "描述不能超过 200 字",
    ]);
  });

  it("分类超过 20 字报错", () => {
    expect(validateDraft({ ...validDraft, category: "a".repeat(21) })).toEqual([
      "分类不能超过 20 字",
    ]);
  });

  it("非法截止日期报错，null 与合法日期通过", () => {
    for (const bad of ["2024-13-99", "2024-02-30", "abc", "2024/01/01", "20240101"]) {
      expect(validateDraft({ ...validDraft, dueDate: bad })).toEqual([
        "截止日期格式不正确",
      ]);
    }
    expect(validateDraft({ ...validDraft, dueDate: null })).toEqual([]);
  });

  it("一次性返回多个错误（标题 + 描述）", () => {
    expect(
      validateDraft({ ...validDraft, title: " ", description: "x".repeat(201) })
    ).toEqual(["标题不能为空", "描述不能超过 200 字"]);
  });
});

describe("normalizeDraft（规格 2：文本字段 trim）", () => {
  it("trim 标题、描述、分类，其余字段原样保留", () => {
    expect(
      normalizeDraft({
        ...validDraft,
        title: "  买牛奶  ",
        description: " 顺便买鸡蛋 ",
        category: " 生活 ",
      })
    ).toEqual({
      title: "买牛奶",
      description: "顺便买鸡蛋",
      dueDate: null,
      priority: "mid",
      category: "生活",
    });
  });
});

describe("sanitizeTodo（规格 2：持久化数据规范化）", () => {
  it("非对象、标题缺失/非字符串/空 → 丢弃该条", () => {
    expect(sanitizeTodo(null)).toBeNull();
    expect(sanitizeTodo("x")).toBeNull();
    expect(sanitizeTodo({ title: "" })).toBeNull();
    expect(sanitizeTodo({ title: 123 })).toBeNull();
    expect(sanitizeTodo({ title: "ok" })).toBeNull(); // id 缺失
  });

  it("数字 id 转字符串；缺失/非法字段补默认值或修复", () => {
    const t = sanitizeTodo({
      id: 1,
      title: " 旧任务 ",
      done: "yes",
      priority: "urgent",
      dueDate: "bad",
      description: 123,
      category: " 工作 ",
      createdAt: "str",
    });
    expect(t).toEqual({
      id: "1",
      title: "旧任务",
      description: "",
      dueDate: null,
      priority: "mid",
      category: "工作",
      done: false,
      createdAt: expect.any(Number),
    });
  });

  it("超长字段截断；非法日期置 null", () => {
    const t = sanitizeTodo({
      id: 2,
      title: "a".repeat(120),
      description: "b".repeat(250),
      category: "c".repeat(30),
      dueDate: "2024-13-99",
      priority: "high",
      done: true,
      createdAt: 1,
    });
    expect(t).not.toBeNull();
    expect(t!.title).toHaveLength(100);
    expect(t!.description).toHaveLength(200);
    expect(t!.category).toHaveLength(20);
    expect(t!.dueDate).toBeNull();
  });
});
