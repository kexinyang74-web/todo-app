import { differenceInCalendarDays, format, parseISO } from "date-fns";
import type { Todo } from "../types/todo";

export type DueTone = "neutral" | "danger" | "warning" | "success";

export interface DueLabel {
  dateText: string;
  suffix: string | null;
  tone: DueTone;
}

// 截止日期徽标的文案与配色；now 可注入便于测试
export function getDueLabel(
  todo: Pick<Todo, "dueDate" | "done">,
  now: Date = new Date()
): DueLabel | null {
  if (!todo.dueDate) return null;
  const date = parseISO(todo.dueDate);
  if (Number.isNaN(date.getTime())) return null;

  const dateText = format(date, "M月d日");
  if (todo.done) return { dateText, suffix: null, tone: "neutral" };

  const days = differenceInCalendarDays(date, now);
  if (days < 0) return { dateText, suffix: "已过期", tone: "danger" };
  if (days === 0) return { dateText, suffix: "今天", tone: "warning" };
  if (days <= 3) return { dateText, suffix: `${days}天后`, tone: "warning" };
  return { dateText, suffix: null, tone: "success" };
}
