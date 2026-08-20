import type { Priority, Todo } from "../types/todo";
import { isValidDueDate } from "./todoValidation";

export interface ParsedTodo {
  title: string;
  dueDate: string | null;
  priority: Priority;
  category: string;
  done: boolean;
}

// 复选框行：允许前置空白，- 或 * 开头；[ ] / [x] / [X]
const TASK_RE = /^\s*[-*]\s+\[(x|X| )\]\s*(.*)$/;

// Tasks 语法元数据（顺序无关，可出现在行内任意位置）
const DATE_RE = /📅\s*(\d{4}-\d{2}-\d{2})/;
const PRIORITY_MAP: Record<string, Priority> = {
  "⏫": "high",
  "🔼": "mid",
  "🔽": "low",
};
const PRIORITY_RE = /(⏫|🔼|🔽)/;
const TAG_RE = /#([^\s#]+)/g;

const HEADER = "# 待办清单\n\n";

// 把任务数组序列化为 Obsidian Tasks 语法的 Markdown（描述字段不参与同步）
export function serializeTodos(todos: readonly Todo[]): string {
  if (todos.length === 0) return HEADER;
  const lines = todos.map(serializeTodo);
  return HEADER + lines.join("\n") + "\n";
}

function serializeTodo(todo: Todo): string {
  const parts = [todo.done ? "- [x]" : "- [ ]", todo.title.trim()];
  if (todo.dueDate) parts.push(`📅 ${todo.dueDate}`);
  if (todo.priority === "high") parts.push("⏫");
  else if (todo.priority === "low") parts.push("🔽");
  // 分类含空格时按空格拆成多个 #tag，保证解析后能原样还原
  if (todo.category) {
    parts.push(
      todo.category
        .split(/\s+/)
        .filter(Boolean)
        .map((c) => `#${c}`)
        .join(" ")
    );
  }
  return parts.join(" ");
}

// 解析 Markdown：只取复选框行，其余行忽略；多个 #tag 合并为分类
export function parseTodoMarkdown(text: string): ParsedTodo[] {
  const result: ParsedTodo[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const m = TASK_RE.exec(rawLine);
    if (!m) continue;

    const done = m[1].toLowerCase() === "x";
    let rest = m[2];

    // 截止日期：非法日期同样剥离，避免污染标题
    let dueDate: string | null = null;
    const dateMatch = DATE_RE.exec(rest);
    if (dateMatch) {
      if (isValidDueDate(dateMatch[1])) dueDate = dateMatch[1];
      rest = rest.replace(DATE_RE, "");
    }

    // 优先级：缺省 mid
    let priority: Priority = "mid";
    const prioMatch = PRIORITY_RE.exec(rest);
    if (prioMatch) {
      priority = PRIORITY_MAP[prioMatch[1]] ?? "mid";
      rest = rest.replace(PRIORITY_RE, "");
    }

    // 分类：收集所有 #tag 并合并（支持分类含空格的情况）
    const tags: string[] = [];
    rest = rest.replace(TAG_RE, (_all, tag: string) => {
      tags.push(tag);
      return "";
    });
    const category = tags.join(" ");

    const title = rest.replace(/\s+/g, " ").trim();
    if (!title) continue;
    result.push({ title, dueDate, priority, category, done });
  }
  return result;
}
