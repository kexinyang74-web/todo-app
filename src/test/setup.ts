import { beforeEach, afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { useTodoStore } from "../store/todoStore";

// 每个用例之间：清空 localStorage、重置全局 store，互不污染
beforeEach(() => {
  localStorage.clear();
  useTodoStore.setState({
    todos: [],
    editingId: null,
    keyword: "",
    categoryFilter: "all",
    priorityFilter: "all",
    statusFilter: "all",
  });
});

// 每个用例之后：卸载组件，避免 DOM 残留影响下一个用例
afterEach(() => {
  cleanup();
});

// jsdom 没有实现 confirm，默认让确认框返回"确定"
vi.stubGlobal("confirm", vi.fn(() => true));
