// 优先级：high 高 / mid 中 / low 低
export type Priority = "high" | "mid" | "low";

// 状态筛选：all 全部 / undone 未完成 / done 已完成
export type StatusFilter = "all" | "undone" | "done";

// 单条任务的数据结构
export interface Todo {
  id: string;             // 唯一编号（UUID；旧数据的数字 id 加载时转为字符串）
  title: string;          // 标题（必填）
  description: string;    // 描述（可选）
  dueDate: string | null; // 截止日期 "YYYY-MM-DD"，null = 未设置
  priority: Priority;     // 优先级
  category: string;       // 分类（自由文本，空字符串 = 未分类）
  done: boolean;          // 是否完成
  createdAt: number;      // 创建时间戳
}

// 新建 / 编辑任务时表单要填的字段
// （id、done、createdAt 由 store 自动生成，不需要外面传）
export type TodoDraft = Omit<Todo, "id" | "done" | "createdAt">;
