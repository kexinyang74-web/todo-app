import { describe, expect, it } from "vitest";
import type { Todo } from "../types/todo";
import { computeStats } from "./todoStats";

const base: Todo = {
  id: "1",
  title: "t",
  description: "",
  dueDate: null,
  priority: "mid",
  category: "",
  done: false,
  createdAt: 1,
};

const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// 固定"现在"= 2026-08-20 中午，保证用例不依赖真实时钟
const now = new Date(2026, 7, 20, 12, 0, 0);
const today = toISO(now);
const yesterday = toISO(new Date(2026, 7, 19));
const future = toISO(new Date(2026, 7, 25));

describe("computeStats（规格 3：统计派生逻辑）", () => {
  it("空数组：总数/完成/未完成/完成率/今日到期/已过期均为 0", () => {
    expect(computeStats([], now)).toEqual({
      total: 0,
      done: 0,
      undone: 0,
      rate: 0,
      todayDue: 0,
      overdue: 0,
    });
  });

  it("统计总数/完成/未完成，完成率四舍五入", () => {
    const todos: Todo[] = [
      { ...base, id: "1", done: true },
      { ...base, id: "2" },
      { ...base, id: "3" },
    ];
    expect(computeStats(todos, now)).toEqual({
      total: 3,
      done: 1,
      undone: 2,
      rate: 33,
      todayDue: 0,
      overdue: 0,
    });
  });

  it("今日到期只统计未完成任务", () => {
    const todos: Todo[] = [
      { ...base, id: "1", dueDate: today },
      { ...base, id: "2", dueDate: today, done: true },
    ];
    expect(computeStats(todos, now).todayDue).toBe(1);
  });

  it("已过期只统计未完成且早于今天的任务；今天/未来不算", () => {
    const todos: Todo[] = [
      { ...base, id: "1", dueDate: yesterday },
      { ...base, id: "2", dueDate: yesterday, done: true },
      { ...base, id: "3", dueDate: today },
      { ...base, id: "4", dueDate: future },
    ];
    expect(computeStats(todos, now).overdue).toBe(1);
  });
});
