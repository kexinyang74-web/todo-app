import type { Priority, StatusFilter, Todo } from "../types/todo";

export interface TodoFilters {
  keyword: string;
  categoryFilter: string;
  priorityFilter: Priority | "all";
  statusFilter: StatusFilter;
}

// 组合筛选：关键词 + 分类 + 优先级 + 状态，多条件同时满足（AND）
export function filterTodos(todos: readonly Todo[], filters: TodoFilters): Todo[] {
  const kw = filters.keyword.trim().toLowerCase();
  return todos.filter((t) => {
    if (filters.statusFilter === "done" && !t.done) return false;
    if (filters.statusFilter === "undone" && t.done) return false;
    if (filters.priorityFilter !== "all" && t.priority !== filters.priorityFilter) {
      return false;
    }
    if (filters.categoryFilter !== "all" && t.category !== filters.categoryFilter) {
      return false;
    }
    // 关键词匹配标题或描述，忽略大小写；纯空格关键词等于无关键词
    if (
      kw &&
      !t.title.toLowerCase().includes(kw) &&
      !t.description.toLowerCase().includes(kw)
    ) {
      return false;
    }
    return true;
  });
}

// 分类下拉选项：现有任务分类去重（按出现顺序）；
// 当前选中的分类已无任务时仍保留它，避免下拉框显示空白
export function getCategoryOptions(todos: readonly Todo[], selected: string): string[] {
  const seen = new Set<string>();
  for (const t of todos) {
    if (t.category) seen.add(t.category);
  }
  if (selected !== "all" && !seen.has(selected)) seen.add(selected);
  return Array.from(seen);
}
