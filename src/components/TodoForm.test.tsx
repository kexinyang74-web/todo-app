import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import TodoForm from "./TodoForm";
import { useTodoStore } from "../store/todoStore";

const draft = {
  title: "买牛奶",
  description: "",
  dueDate: null,
  priority: "mid" as const,
  category: "",
};

describe("TodoForm（规格 3/4）", () => {
  it("输入标题添加任务：trim 后入库，表单清空", async () => {
    const user = userEvent.setup();
    render(<TodoForm />);
    await user.type(screen.getByLabelText("任务标题"), "  买牛奶  ");
    await user.click(screen.getByRole("button", { name: /添加任务/ }));
    expect(useTodoStore.getState().todos[0].title).toBe("买牛奶");
    expect(screen.getByLabelText("任务标题")).toHaveValue("");
  });

  it("填写全部字段后正确入库", async () => {
    const user = userEvent.setup();
    render(<TodoForm />);
    await user.type(screen.getByLabelText("任务标题"), "写周报");
    await user.type(screen.getByLabelText("任务描述"), "总结本周进展");
    await user.type(screen.getByLabelText("截止日期"), "2026-08-25");
    await user.selectOptions(screen.getByLabelText("优先级"), "high");
    await user.type(screen.getByLabelText("分类"), "工作");
    await user.click(screen.getByRole("button", { name: /添加任务/ }));
    expect(useTodoStore.getState().todos[0]).toMatchObject({
      title: "写周报",
      description: "总结本周进展",
      dueDate: "2026-08-25",
      priority: "high",
      category: "工作",
    });
  });

  it("空标题提交：显示错误提示，不添加任务", async () => {
    const user = userEvent.setup();
    render(<TodoForm />);
    await user.click(screen.getByRole("button", { name: /添加任务/ }));
    expect(screen.getByRole("alert")).toHaveTextContent("标题不能为空");
    expect(useTodoStore.getState().todos).toEqual([]);
  });

  it("编辑模式：表单预填任务数据，保存后更新并退出编辑", async () => {
    const user = userEvent.setup();
    useTodoStore
      .getState()
      .addTodo({ ...draft, title: "买牛奶", description: "两盒", category: "生活", priority: "high", dueDate: "2026-08-25" });
    const id = useTodoStore.getState().todos[0].id;
    useTodoStore.getState().setEditing(id);
    render(<TodoForm />);
    expect(screen.getByLabelText("任务标题")).toHaveValue("买牛奶");
    expect(screen.getByLabelText("任务描述")).toHaveValue("两盒");
    expect(screen.getByLabelText("分类")).toHaveValue("生活");
    expect(screen.getByLabelText("优先级")).toHaveValue("high");
    await user.clear(screen.getByLabelText("任务标题"));
    await user.type(screen.getByLabelText("任务标题"), "买牛奶两盒");
    await user.click(screen.getByRole("button", { name: /保存修改/ }));
    expect(useTodoStore.getState().todos[0].title).toBe("买牛奶两盒");
    expect(useTodoStore.getState().editingId).toBeNull();
  });

  it("取消编辑：退出编辑模式并清空表单", async () => {
    const user = userEvent.setup();
    useTodoStore.getState().addTodo(draft);
    const id = useTodoStore.getState().todos[0].id;
    useTodoStore.getState().setEditing(id);
    render(<TodoForm />);
    await user.click(screen.getByRole("button", { name: /取消编辑/ }));
    expect(useTodoStore.getState().editingId).toBeNull();
    expect(screen.getByLabelText("任务标题")).toHaveValue("");
  });
});
