import { isBefore, isSameDay, parseISO, startOfDay } from "date-fns";
import type { Todo } from "../types/todo";

export interface TodoStats {
  total: number;
  done: number;
  undone: number;
  rate: number;
  todayDue: number;
  overdue: number;
}

// 统计面板的派生数据；now 可注入，便于测试固定"今天"
export function computeStats(
  todos: readonly Todo[],
  now: Date = new Date()
): TodoStats {
  const total = todos.length;
  const done = todos.filter((t) => t.done).length;
  const undone = total - done;
  const todayDue = todos.filter(
    (t) => !t.done && t.dueDate !== null && isSameDay(parseISO(t.dueDate), now)
  ).length;
  const overdue = todos.filter(
    (t) =>
      !t.done && t.dueDate !== null && isBefore(parseISO(t.dueDate), startOfDay(now))
  ).length;
  return {
    total,
    done,
    undone,
    rate: total === 0 ? 0 : Math.round((done / total) * 100),
    todayDue,
    overdue,
  };
}
