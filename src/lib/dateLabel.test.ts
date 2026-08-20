import { describe, expect, it } from "vitest";
import { getDueLabel } from "./dateLabel";

const now = new Date(2026, 7, 20, 12, 0, 0);
const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

describe("getDueLabel（规格 3：截止日期文案）", () => {
  it("未设置截止日期 → null（不显示）", () => {
    expect(getDueLabel({ dueDate: null, done: false }, now)).toBeNull();
  });

  it("过期 → 已过期（danger）", () => {
    expect(getDueLabel({ dueDate: iso(2026, 8, 19), done: false }, now)).toEqual({
      dateText: "8月19日",
      suffix: "已过期",
      tone: "danger",
    });
  });

  it("今天 → 今天（warning）", () => {
    expect(getDueLabel({ dueDate: iso(2026, 8, 20), done: false }, now)).toEqual({
      dateText: "8月20日",
      suffix: "今天",
      tone: "warning",
    });
  });

  it("1–3 天内 → N天后（warning）", () => {
    expect(getDueLabel({ dueDate: iso(2026, 8, 22), done: false }, now)).toEqual({
      dateText: "8月22日",
      suffix: "2天后",
      tone: "warning",
    });
    expect(getDueLabel({ dueDate: iso(2026, 8, 23), done: false }, now)).toEqual({
      dateText: "8月23日",
      suffix: "3天后",
      tone: "warning",
    });
  });

  it("超过 3 天 → 无后缀（success）", () => {
    expect(getDueLabel({ dueDate: iso(2026, 8, 24), done: false }, now)).toEqual({
      dateText: "8月24日",
      suffix: null,
      tone: "success",
    });
  });

  it("已完成 → 无后缀（neutral）", () => {
    expect(getDueLabel({ dueDate: iso(2026, 8, 19), done: true }, now)).toEqual({
      dateText: "8月19日",
      suffix: null,
      tone: "neutral",
    });
  });
});
