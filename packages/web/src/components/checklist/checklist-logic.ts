/** Pure helpers for Checklist: derived state of parents, progress, and a cascading toggle. */

export interface ChecklistAttachment {
  id: string;
  name: string;
  /** Bytes, when known. */
  size?: number;
  url?: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
  /** One level of subtasks. A parent with subtasks is done when all of them are. */
  subtasks?: ChecklistItem[];
  attachments?: ChecklistAttachment[];
  /** Free text shown small under the item, such as an assignee or a due date. */
  meta?: string;
}

export interface ChecklistProgress {
  done: number;
  total: number;
  /** 0 to 100, rounded. An empty list is 0. */
  percent: number;
}

/** Done state shown for an item: derived from its subtasks when it has any. */
export function isItemDone(item: ChecklistItem): boolean {
  return item.subtasks && item.subtasks.length > 0 ? item.subtasks.every((s) => s.done) : item.done;
}

/** "none", "some" or "all" of the subtasks are done; "self" for an item without subtasks. */
export function subtaskState(item: ChecklistItem): "self" | "none" | "some" | "all" {
  const subs = item.subtasks ?? [];
  if (subs.length === 0) return "self";
  const n = subs.filter((s) => s.done).length;
  return n === 0 ? "none" : n === subs.length ? "all" : "some";
}

/** Counts leaf tasks: an item with subtasks counts its subtasks, not itself. */
export function checklistProgress(items: readonly ChecklistItem[]): ChecklistProgress {
  let done = 0;
  let total = 0;
  for (const item of items) {
    const leaves = item.subtasks && item.subtasks.length > 0 ? item.subtasks : [item];
    for (const leaf of leaves) {
      total++;
      if (leaf.done) done++;
    }
  }
  return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
}

/** Returns a new list with `id` set to `done`. Toggling a parent sets all of its subtasks. */
export function toggleItem(items: readonly ChecklistItem[], id: string, done: boolean): ChecklistItem[] {
  return items.map((item) => {
    if (item.id === id) {
      return item.subtasks && item.subtasks.length > 0 ? { ...item, done, subtasks: item.subtasks.map((s) => ({ ...s, done })) } : { ...item, done };
    }
    if (item.subtasks?.some((s) => s.id === id)) {
      const subtasks = item.subtasks.map((s) => (s.id === id ? { ...s, done } : s));
      return { ...item, subtasks, done: subtasks.every((s) => s.done) };
    }
    return item;
  });
}

/** Human size, for example "1.4 MB". Numbers stay Latin; units are the caller's business. */
export function attachmentSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
