import { describe, expect, it } from "vitest";
import type { Todo } from "../types/todo";
import { filterTodos, getCategoryOptions } from "./todoFilter";

const base: Todo = {
  id: "1",
  title: "买牛奶",
  description: "顺便买鸡蛋",
  dueDate: null,
  priority: "mid",
  category: "生活",
  done: false,
  createdAt: 1,
};

const todos: Todo[] = [
  base,
  { ...base, id: "2", title: "写周报", description: "", priority: "high", category: "工作" },
  { ...base, id: "3", title: "英语学习 English", description: "背单词", priority: "low", category: "学习", done: true },
];

const noFilter = {
  keyword: "",
  categoryFilter: "all",
  priorityFilter: "all",
  statusFilter: "all",
} as const;

describe("filterTodos（规格 3：筛选派生逻辑）", () => {
  it("无筛选条件时按原顺序返回全部", () => {
    expect(filterTodos(todos, noFilter).map((t) => t.id)).toEqual(["1", "2", "3"]);
  });

  it("关键词匹配标题或描述，忽略大小写与首尾空格", () => {
    expect(filterTodos(todos, { ...noFilter, keyword: "牛奶" }).map((t) => t.id)).toEqual(["1"]);
    expect(filterTodos(todos, { ...noFilter, keyword: "鸡蛋" }).map((t) => t.id)).toEqual(["1"]);
    expect(filterTodos(todos, { ...noFilter, keyword: "english" }).map((t) => t.id)).toEqual(["3"]);
    expect(filterTodos(todos, { ...noFilter, keyword: "  牛奶  " }).map((t) => t.id)).toEqual(["1"]);
    expect(filterTodos(todos, { ...noFilter, keyword: "  " }).map((t) => t.id)).toEqual(["1", "2", "3"]);
  });

  it("分类筛选精确匹配", () => {
    expect(filterTodos(todos, { ...noFilter, categoryFilter: "工作" }).map((t) => t.id)).toEqual(["2"]);
    expect(filterTodos(todos, { ...noFilter, categoryFilter: "不存在" })).toEqual([]);
  });

  it("优先级筛选", () => {
    expect(filterTodos(todos, { ...noFilter, priorityFilter: "high" }).map((t) => t.id)).toEqual(["2"]);
  });

  it("状态筛选：done / undone", () => {
    expect(filterTodos(todos, { ...noFilter, statusFilter: "done" }).map((t) => t.id)).toEqual(["3"]);
    expect(filterTodos(todos, { ...noFilter, statusFilter: "undone" }).map((t) => t.id)).toEqual(["1", "2"]);
  });

  it("多条件按 AND 组合", () => {
    expect(
      filterTodos(todos, {
        keyword: "周",
        categoryFilter: "工作",
        priorityFilter: "high",
        statusFilter: "undone",
      }).map((t) => t.id)
    ).toEqual(["2"]);
    expect(
      filterTodos(todos, {
        keyword: "周",
        categoryFilter: "生活",
        priorityFilter: "high",
        statusFilter: "undone",
      })
    ).toEqual([]);
  });

  it("空数组返回空数组", () => {
    expect(filterTodos([], noFilter)).toEqual([]);
  });
});

describe("getCategoryOptions（规格 3：分类下拉选项）", () => {
  it("去重并按出现顺序返回", () => {
    expect(getCategoryOptions(todos, "all")).toEqual(["生活", "工作", "学习"]);
  });

  it("当前选中的分类已无任务时仍保留该选项，避免下拉空白", () => {
    expect(getCategoryOptions(todos, "运动")).toEqual(["生活", "工作", "学习", "运动"]);
  });
});
