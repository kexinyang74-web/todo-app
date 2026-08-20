import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import StatsPanel from "./StatsPanel";
import { useTodoStore } from "../store/todoStore";
import type { Todo } from "../types/todo";

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

describe("StatsPanel（规格 3）", () => {
  it("渲染总数/未完成/已完成/完成率与进度条", () => {
    useTodoStore.setState({
      todos: [
        { ...base, id: "1", done: true },
        { ...base, id: "2" },
        { ...base, id: "3" },
      ],
    });
    const { container } = render(<StatsPanel />);
    expect(screen.getByText(/共/).textContent).toBe("共 3 项");
    expect(screen.getByText(/未完成/).textContent).toBe("未完成 2");
    expect(screen.getByText(/已完成/).textContent).toBe("已完成 1");
    expect(screen.getByText(/完成率/).textContent).toBe("完成率 33%");
    const bar = container.querySelector("div[style]");
    expect(bar).toHaveStyle("width: 33%");
  });

  it("统计今日到期与已过期（仅未完成）", () => {
    const now = new Date();
    const today = toISO(now);
    const yesterday = toISO(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
    useTodoStore.setState({
      todos: [
        { ...base, id: "1", dueDate: today },
        { ...base, id: "2", dueDate: today, done: true },
        { ...base, id: "3", dueDate: yesterday },
        { ...base, id: "4" },
      ],
    });
    render(<StatsPanel />);
    expect(screen.getByText(/今日到期/).textContent).toBe("今日到期 1");
    expect(screen.getByText(/已过期/).textContent).toBe("已过期 1");
  });

  it("空数据时完成率为 0%", () => {
    render(<StatsPanel />);
    expect(screen.getByText(/共/).textContent).toBe("共 0 项");
    expect(screen.getByText(/完成率/).textContent).toBe("完成率 0%");
  });
});
