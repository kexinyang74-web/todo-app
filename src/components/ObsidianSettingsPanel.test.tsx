import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ObsidianSettingsPanel from "./ObsidianSettingsPanel";
import { useTodoStore } from "../store/todoStore";

const httpRes = (status: number, body = "") =>
  ({ ok: status >= 200 && status < 300, status, text: async () => body }) as Response;

const mockFetch = (impl: (url: string, init?: RequestInit) => Promise<Response>) => {
  const fn = vi.fn(impl);
  vi.stubGlobal("fetch", fn);
  return fn;
};

describe("ObsidianSettingsPanel（规格 3/4）", () => {
  it("渲染默认设置", () => {
    render(<ObsidianSettingsPanel />);
    expect(screen.getByRole("heading", { name: "Obsidian 同步" })).toBeInTheDocument();
    expect(screen.getByLabelText("启用 Obsidian 同步")).not.toBeChecked();
    expect(screen.getByLabelText("Obsidian API Key")).toHaveValue("");
    expect(screen.getByLabelText("Obsidian 端口")).toHaveValue(27123);
    expect(screen.getByLabelText("Obsidian 文件路径")).toHaveValue("todo.md");
    expect(screen.getByLabelText("自动同步到 Obsidian")).not.toBeChecked();
  });

  it("修改设置写入 store", async () => {
    const user = userEvent.setup();
    render(<ObsidianSettingsPanel />);
    await user.click(screen.getByLabelText("启用 Obsidian 同步"));
    await user.type(screen.getByLabelText("Obsidian API Key"), "my-key");
    fireEvent.change(screen.getByLabelText("Obsidian 端口"), { target: { value: "27124" } });
    await user.clear(screen.getByLabelText("Obsidian 文件路径"));
    await user.type(screen.getByLabelText("Obsidian 文件路径"), "Inbox/todo.md");
    expect(useTodoStore.getState().obsidian).toMatchObject({
      enabled: true,
      apiKey: "my-key",
      port: 27124,
      filePath: "Inbox/todo.md",
    });
  });

  it("未启用或未填 key 时同步按钮禁用", async () => {
    const user = userEvent.setup();
    render(<ObsidianSettingsPanel />);
    expect(screen.getByRole("button", { name: "测试连接" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "导出到 Obsidian" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "从 Obsidian 导入" })).toBeDisabled();
    await user.click(screen.getByLabelText("启用 Obsidian 同步"));
    await user.type(screen.getByLabelText("Obsidian API Key"), "key");
    expect(screen.getByRole("button", { name: "测试连接" })).toBeEnabled();
  });

  it("测试连接成功显示提示", async () => {
    const user = userEvent.setup();
    mockFetch(async () => httpRes(200, "[]"));
    useTodoStore.getState().setObsidianSettings({ enabled: true, apiKey: "key" });
    render(<ObsidianSettingsPanel />);
    await user.click(screen.getByRole("button", { name: "测试连接" }));
    expect(await screen.findByText(/连接成功/)).toBeInTheDocument();
  });

  it("测试连接失败显示排查引导", async () => {
    const user = userEvent.setup();
    mockFetch(async () => {
      throw new TypeError("fetch failed");
    });
    useTodoStore.getState().setObsidianSettings({ enabled: true, apiKey: "key" });
    render(<ObsidianSettingsPanel />);
    await user.click(screen.getByRole("button", { name: "测试连接" }));
    expect(await screen.findByText(/无法连接/)).toBeInTheDocument();
    expect(screen.getByText(/排查提示/)).toBeInTheDocument();
  });

  it("导出成功显示条数", async () => {
    const user = userEvent.setup();
    mockFetch(async () => httpRes(204));
    useTodoStore.getState().setObsidianSettings({ enabled: true, apiKey: "key" });
    useTodoStore.getState().addTodo({ title: "买牛奶", description: "", dueDate: null, priority: "mid", category: "" });
    render(<ObsidianSettingsPanel />);
    await user.click(screen.getByRole("button", { name: "导出到 Obsidian" }));
    expect(await screen.findByText(/已导出 1 条/)).toBeInTheDocument();
  });

  it("导入需确认：确认后整表替换，取消则不变", async () => {
    const user = userEvent.setup();
    mockFetch(async () => httpRes(200, "- [ ] 来自 Obsidian 的任务"));
    useTodoStore.getState().setObsidianSettings({ enabled: true, apiKey: "key" });
    useTodoStore.getState().addTodo({ title: "本地任务", description: "", dueDate: null, priority: "mid", category: "" });
    render(<ObsidianSettingsPanel />);

    // 取消
    vi.mocked(confirm).mockReturnValueOnce(false);
    await user.click(screen.getByRole("button", { name: "从 Obsidian 导入" }));
    expect(useTodoStore.getState().todos.map((t) => t.title)).toEqual(["本地任务"]);

    // 确认
    vi.mocked(confirm).mockReturnValueOnce(true);
    await user.click(screen.getByRole("button", { name: "从 Obsidian 导入" }));
    expect(useTodoStore.getState().todos.map((t) => t.title)).toEqual(["来自 Obsidian 的任务"]);
  });
});
