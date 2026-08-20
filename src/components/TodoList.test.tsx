import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import TodoList from "./TodoList";
import { useTodoStore } from "../store/todoStore";
import type { Todo } from "../types/todo";

const base: Todo = {
  id: "1",
  title: "买牛奶",
  description: "",
  dueDate: null,
  priority: "mid",
  category: "生活",
  done: false,
  createdAt: 1,
};

const seed = (todos: Todo[]) => useTodoStore.setState({ todos });

describe("TodoList（规格 3/4）", () => {
  it("无任务时显示空状态提示", () => {
    render(<TodoList />);
    expect(screen.getByText("暂无任务，添加第一条试试吧 ✨")).toBeInTheDocument();
  });

  it("渲染任务列表", () => {
    seed([base, { ...base, id: "2", title: "写周报", done: true }]);
    render(<TodoList />);
    expect(screen.getByText("买牛奶")).toBeInTheDocument();
    expect(screen.getByText("写周报")).toBeInTheDocument();
  });

  it("有任务但筛选无结果时显示对应空状态", () => {
    seed([base]);
    useTodoStore.getState().setCategoryFilter("不存在");
    render(<TodoList />);
    expect(screen.getByText("没有符合筛选条件的任务 🔍")).toBeInTheDocument();
  });

  it("关键词筛选只显示匹配任务", () => {
    seed([base, { ...base, id: "2", title: "写周报", category: "工作" }]);
    useTodoStore.getState().setKeyword("周报");
    render(<TodoList />);
    expect(screen.queryByText("买牛奶")).not.toBeInTheDocument();
    expect(screen.getByText("写周报")).toBeInTheDocument();
  });

  it("清空已完成：只删除已完成任务", async () => {
    const user = userEvent.setup();
    seed([base, { ...base, id: "2", title: "写周报", done: true }]);
    render(<TodoList />);
    await user.click(screen.getByRole("button", { name: /清空已完成（1）/ }));
    expect(useTodoStore.getState().todos.map((t) => t.id)).toEqual(["1"]);
  });

  it("没有已完成任务时不显示清空按钮", () => {
    seed([base]);
    render(<TodoList />);
    expect(screen.queryByRole("button", { name: /清空已完成/ })).not.toBeInTheDocument();
  });
});
