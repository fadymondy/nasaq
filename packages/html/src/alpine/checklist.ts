// nqChecklist: tickable items with a progress bar, one level of subtasks and attachments. The markup is the React Checklist's
// (see the Blade component); the state lives here. There is no backend: each action dispatches a bubbling event and, unless
// `optimistic: false`, updates the local list so the change shows at once.
//
//   <section data-slot="checklist" x-data="nqChecklist([{ id: '1', text: 'Write', done: false }], { canAdd: true })" x-modelable="items">…</section>
//
// Events: "toggle" { id, done }, "add" { text, parentId? }, "remove" { id }, "attach" { id, files }, "remove-attachment" { itemId, attachmentId }.
// Options: canAdd, canRemove, canAttach, readOnly, optimistic.

import { attachmentSize, checklistProgress, isItemDone, subtaskState, toggleItem, type ChecklistItem } from "./checklist-logic";
import type { Magics, Register } from "./types";

export interface ChecklistOptions {
  canAdd?: boolean;
  canRemove?: boolean;
  canAttach?: boolean;
  readOnly?: boolean;
  optimistic?: boolean;
}

interface ChecklistState extends Magics {
  $nq: { t(en: string, ar: string): string; locale: string };
  items: ChecklistItem[];
  collapsed: Record<string, boolean>;
  adding: string | null;
  text: string;
  subText: string;
  root: HTMLElement;
  optimistic: boolean;
  readOnly: boolean;
  isOpen(id: string): boolean;
  fire(name: string, detail: unknown): void;
}

let seq = 0;

export const checklist: Register = (Alpine) => {
  Alpine.data("nqChecklist", (initial: ChecklistItem[] = [], options: ChecklistOptions = {}) => ({
    items: initial,
    collapsed: {} as Record<string, boolean>,
    adding: null as string | null,
    text: "",
    subText: "",
    root: null as unknown as HTMLElement,
    canAdd: options.canAdd ?? false,
    canRemove: options.canRemove ?? false,
    canAttach: options.canAttach ?? false,
    readOnly: options.readOnly ?? false,
    optimistic: options.optimistic !== false,
    init(this: ChecklistState) {
      this.root = this.$el;
    },
    fire(this: ChecklistState, name: string, detail: unknown) {
      this.root.dispatchEvent(new CustomEvent(name, { bubbles: true, detail }));
    },
    progress(this: ChecklistState) {
      return checklistProgress(this.items);
    },
    progressLabel(this: ChecklistState) {
      const p = checklistProgress(this.items);
      if (p.percent === 100) return this.$nq.t("All done", "اكتمل كل شيء");
      return this.$nq.t(`${p.done} of ${p.total} done`, `أُنجز ${p.done} من ${p.total}`);
    },
    done: (item: ChecklistItem) => isItemDone(item),
    state: (item: ChecklistItem) => subtaskState(item),
    size: (bytes: number) => attachmentSize(bytes),
    doneSubs: (item: ChecklistItem) => (item.subtasks ?? []).filter((s) => s.done).length,
    isOpen(this: ChecklistState, id: string) {
      return this.collapsed[id] !== true;
    },
    toggleOpen(this: ChecklistState, id: string) {
      this.collapsed = { ...this.collapsed, [id]: this.isOpen(id) };
    },
    toggle(this: ChecklistState, item: ChecklistItem) {
      if (this.readOnly) return;
      const done = !isItemDone(item);
      this.fire("toggle", { id: item.id, done });
      if (this.optimistic) this.items = toggleItem(this.items, item.id, done);
    },
    startAdd(this: ChecklistState, id: string) {
      this.adding = this.adding === id ? null : id;
      this.subText = "";
    },
    add(this: ChecklistState, parentId?: string) {
      const value = (parentId ? this.subText : this.text).trim();
      if (!value) return;
      this.fire("add", parentId ? { text: value, parentId } : { text: value });
      if (this.optimistic) {
        const item: ChecklistItem = { id: `nq-new-${++seq}`, text: value, done: false };
        this.items = parentId ? this.items.map((i) => (i.id === parentId ? { ...i, done: false, subtasks: [...(i.subtasks ?? []), item] } : i)) : [...this.items, item];
      }
      if (parentId) {
        this.subText = "";
        this.adding = null;
      } else this.text = "";
    },
    remove(this: ChecklistState, id: string) {
      this.fire("remove", { id });
      if (this.optimistic) this.items = this.items.filter((i) => i.id !== id).map((i) => (i.subtasks ? { ...i, subtasks: i.subtasks.filter((s) => s.id !== id) } : i));
    },
    attach(this: ChecklistState, id: string, event: Event) {
      const input = event.currentTarget as HTMLInputElement;
      const files = Array.from(input.files ?? []);
      input.value = "";
      if (files.length) this.fire("attach", { id, files });
    },
    removeAttachment(this: ChecklistState, itemId: string, attachmentId: string) {
      this.fire("remove-attachment", { itemId, attachmentId });
      if (this.optimistic) this.items = this.items.map((i) => (i.id === itemId ? { ...i, attachments: (i.attachments ?? []).filter((a) => a.id !== attachmentId) } : i));
    },
  }));
};
