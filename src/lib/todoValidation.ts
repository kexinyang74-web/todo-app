import { isValid, parseISO } from "date-fns";
import type { Todo, TodoDraft } from "../types/todo";

// 文本字段长度上限（与规格 2/4 一致）
const MAX_TITLE = 100;
const MAX_DESC = 200;
const MAX_CAT = 20;

const PRIORITIES: readonly Todo["priority"][] = ["high", "mid", "low"];

// 截止日期必须是 "YYYY-MM-DD" 且是真实存在的日期
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDueDate(value: string): boolean {
  return DATE_RE.test(value) && isValid(parseISO(value));
}

// 提交前规范化：文本字段统一去首尾空格，其余字段原样保留
export function normalizeDraft(draft: TodoDraft): TodoDraft {
  return {
    title: draft.title.trim(),
    description: draft.description.trim(),
    dueDate: draft.dueDate,
    priority: draft.priority,
    category: draft.category.trim(),
  };
}

// 校验 draft，返回错误信息列表；空数组 = 合法
export function validateDraft(draft: TodoDraft): string[] {
  const errors: string[] = [];
  const title = draft.title.trim();
  if (!title) {
    errors.push("标题不能为空");
  } else if (title.length > MAX_TITLE) {
    errors.push("标题不能超过 100 字");
  }
  if (draft.description.trim().length > MAX_DESC) {
    errors.push("描述不能超过 200 字");
  }
  if (draft.category.trim().length > MAX_CAT) {
    errors.push("分类不能超过 20 字");
  }
  if (draft.dueDate !== null && !isValidDueDate(draft.dueDate)) {
    errors.push("截止日期格式不正确");
  }
  return errors;
}

// 持久化数据规范化：字段缺失补默认值、类型错误修复、超长截断、
// 标题非法则丢弃整条（返回 null）；数字 id 统一转为字符串
export function sanitizeTodo(raw: unknown, now: number = Date.now()): Todo | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;

  const id =
    typeof r.id === "string" || typeof r.id === "number" ? String(r.id) : null;
  const title = typeof r.title === "string" ? r.title.trim() : "";
  if (!id || !title) return null;

  return {
    id,
    title: title.slice(0, MAX_TITLE),
    description:
      typeof r.description === "string"
        ? r.description.trim().slice(0, MAX_DESC)
        : "",
    dueDate:
      typeof r.dueDate === "string" && isValidDueDate(r.dueDate)
        ? r.dueDate
        : null,
    priority: PRIORITIES.includes(r.priority as Todo["priority"])
      ? (r.priority as Todo["priority"])
      : "mid",
    category:
      typeof r.category === "string" ? r.category.trim().slice(0, MAX_CAT) : "",
    done: typeof r.done === "boolean" ? r.done : false,
    createdAt: typeof r.createdAt === "number" ? r.createdAt : now,
  };
}
