import { format, parseISO } from "date-fns";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import TodoItem from "./TodoItem";
import { useTodoStore } from "../store/todoStore";
import type { Todo } from "../types/todo";

const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const dueDate = toISO(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000));

const todo: Todo = {
  id: "1",
  title: "买牛奶",
  description: "顺便买鸡蛋",
  dueDate,
  priority: "high",
  category: "生活",
  done: false,
  createdAt: 1,
};

const renderItem = (t: Todo = todo) => {
  useTodoStore.setState({ todos: [t] });
  render(<TodoItem todo={t} />);
};

describe("TodoItem（规格 3/4）", () => {
  it("渲染标题、优先级、分类、描述与截止日期文案", () => {
    renderItem();
    expect(screen.getByText("买牛奶")).toBeInTheDocument();
    expect(screen.getByText("高")).toBeInTheDocument();
    expect(screen.getByText("生活")).toBeInTheDocument();
    expect(screen.getByText("顺便买鸡蛋")).toBeInTheDocument();
    expect(screen.getByText(`📅 ${format(parseISO(dueDate), "M月d日")} · 2天后`)).toBeInTheDocument();
  });

  it("勾选后切换完成状态", async () => {
    const user = userEvent.setup();
    renderItem();
    await user.click(screen.getByRole("checkbox"));
    expect(useTodoStore.getState().todos[0].done).toBe(true);
  });

  it("点击编辑按钮进入编辑模式，再点退出", async () => {
    const user = userEvent.setup();
    renderItem();
    await user.click(screen.getByRole("button", { name: "编辑" }));
    expect(useTodoStore.getState().editingId).toBe("1");
    await user.click(screen.getByRole("button", { name: "编辑" }));
    expect(useTodoStore.getState().editingId).toBeNull();
  });

  it("确认后删除任务", async () => {
    const user = userEvent.setup();
    renderItem();
    await user.click(screen.getByRole("button", { name: "删除" }));
    expect(useTodoStore.getState().todos).toEqual([]);
  });

  it("取消确认则不删除", async () => {
    const user = userEvent.setup();
    vi.mocked(confirm).mockReturnValueOnce(false);
    renderItem();
    await user.click(screen.getByRole("button", { name: "删除" }));
    expect(useTodoStore.getState().todos).toHaveLength(1);
  });
});
