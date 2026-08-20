import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "./App";
import { useTodoStore } from "./store/todoStore";

describe("App 主流程（规格 1/6）", () => {
  it("添加 → 勾选完成 → 统计与删除线联动", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText("任务标题"), "买牛奶");
    await user.click(screen.getByRole("button", { name: /添加任务/ }));
    expect(screen.getByText("买牛奶")).toBeInTheDocument();
    expect(screen.getByText(/共/).textContent).toBe("共 1 项");

    await user.click(screen.getByRole("checkbox"));
    expect(useTodoStore.getState().todos[0].done).toBe(true);
    expect(screen.getByText("买牛奶").className).toContain("line-through");
    expect(screen.getByText(/完成率/).textContent).toBe("完成率 100%");
  });

  it("搜索过滤与清空已完成", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText("任务标题"), "买牛奶");
    await user.click(screen.getByRole("button", { name: /添加任务/ }));
    await user.type(screen.getByLabelText("任务标题"), "写周报");
    await user.click(screen.getByRole("button", { name: /添加任务/ }));

    await user.type(screen.getByLabelText("搜索"), "周报");
    expect(screen.queryByText("买牛奶")).not.toBeInTheDocument();
    expect(screen.getByText("写周报")).toBeInTheDocument();

    await user.clear(screen.getByLabelText("搜索"));
    await user.click(screen.getAllByRole("checkbox")[0]); // 勾选"买牛奶"
    await user.click(screen.getByRole("button", { name: /清空已完成（1）/ }));
    expect(useTodoStore.getState().todos.map((t) => t.title)).toEqual(["写周报"]);
  });

  it("全部清空：无任务时按钮禁用，点击确认后清空", async () => {
    const user = userEvent.setup();
    render(<App />);
    const clearAllBtn = screen.getByRole("button", { name: /全部清空/ });
    expect(clearAllBtn).toBeDisabled();

    await user.type(screen.getByLabelText("任务标题"), "买牛奶");
    await user.click(screen.getByRole("button", { name: /添加任务/ }));
    await user.click(clearAllBtn);
    expect(useTodoStore.getState().todos).toEqual([]);
    expect(clearAllBtn).toBeDisabled();
  });

  it("数据写入 localStorage，重载后可恢复", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText("任务标题"), "买牛奶");
    await user.click(screen.getByRole("button", { name: /添加任务/ }));

    const raw = JSON.parse(localStorage.getItem("todo-app-storage")!);
    expect(raw.state.todos[0].title).toBe("买牛奶");

    // 模拟刷新：清空内存态，再从 localStorage 恢复。
    // 注意 setState 会触发 persist 覆写 storage，所以先把"磁盘"内容存下来再还原。
    const persisted = localStorage.getItem("todo-app-storage")!;
    useTodoStore.setState({ todos: [], editingId: null });
    localStorage.setItem("todo-app-storage", persisted);
    await useTodoStore.persist.rehydrate();
    expect(useTodoStore.getState().todos[0].title).toBe("买牛奶");
    expect(screen.getByText("买牛奶")).toBeInTheDocument();
  });

  it("页头提供 Obsidian 设置按钮，点击打开设置面板", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Obsidian 同步设置" }));
    expect(screen.getByRole("heading", { name: "Obsidian 同步" })).toBeInTheDocument();
  });
});
