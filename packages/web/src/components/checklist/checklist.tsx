"use client";

import { ChevronDown, ListChecks, Paperclip, Plus, Trash2, X } from "lucide-react";
import { type ComponentProps, type ReactNode, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Alert } from "../alert";
import { Button } from "../button";
import { Checkbox } from "../checkbox";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "../context-menu";
import { Input } from "../field";
import { Num } from "../numeric";
import { Progress } from "../progress";
import { EmptyState } from "../states";
import { attachmentSize, type ChecklistItem, checklistProgress, isItemDone, subtaskState } from "./checklist-logic";

export {
  attachmentSize,
  type ChecklistAttachment,
  type ChecklistItem,
  type ChecklistProgress,
  checklistProgress,
  isItemDone,
  subtaskState,
  toggleItem,
} from "./checklist-logic";

const STRINGS = {
  en: {
    title: "Checklist",
    progress: (done: number, total: number) => `${done} of ${total} done`,
    empty: "No items yet",
    emptyBody: "Add the first thing that needs doing.",
    add: "Add",
    addPlaceholder: "Add an item",
    addLabel: "New item",
    subtaskPlaceholder: "Add a subtask",
    addSubtask: "Add subtask",
    addSubtaskFor: (n: string) => `Add a subtask to ${n}`,
    expand: (n: string) => `Show subtasks of ${n}`,
    collapse: (n: string) => `Hide subtasks of ${n}`,
    subtasksDone: (done: number, total: number) => `${done}/${total} subtasks`,
    attach: "Attach a file",
    attachFor: (n: string) => `Attach a file to ${n}`,
    removeAttachment: (n: string) => `Remove ${n}`,
    remove: "Delete",
    removeFor: (n: string) => `Delete ${n}`,
    complete: "All done",
    failed: "That did not save. Try again.",
    list: "Items",
    cancel: "Cancel",
  },
  ar: {
    title: "قائمة المهام",
    progress: (done: number, total: number) => `أُنجز ${done} من ${total}`,
    empty: "لا توجد عناصر بعد",
    emptyBody: "أضف أول شيء يحتاج إلى إنجاز.",
    add: "إضافة",
    addPlaceholder: "أضف عنصرًا",
    addLabel: "عنصر جديد",
    subtaskPlaceholder: "أضف مهمة فرعية",
    addSubtask: "إضافة مهمة فرعية",
    addSubtaskFor: (n: string) => `إضافة مهمة فرعية إلى ${n}`,
    expand: (n: string) => `إظهار المهام الفرعية لـ ${n}`,
    collapse: (n: string) => `إخفاء المهام الفرعية لـ ${n}`,
    subtasksDone: (done: number, total: number) => `${done}/${total} مهام فرعية`,
    attach: "إرفاق ملف",
    attachFor: (n: string) => `إرفاق ملف إلى ${n}`,
    removeAttachment: (n: string) => `إزالة ${n}`,
    remove: "حذف",
    removeFor: (n: string) => `حذف ${n}`,
    complete: "اكتمل كل شيء",
    failed: "لم يُحفظ ذلك. حاول مرة أخرى.",
    list: "العناصر",
    cancel: "إلغاء",
  },
};
const strings = (locale: string) => STRINGS[locale.startsWith("ar") ? "ar" : "en"];

export type ChecklistLabels = Partial<typeof STRINGS.en>;
type Result = void | { error?: string };

export interface ChecklistProps extends Omit<ComponentProps<"section">, "title" | "onToggle"> {
  items: ChecklistItem[];
  /** An item or subtask was ticked or unticked. Ticking a parent should apply to its subtasks: see `toggleItem`. */
  onToggle: (id: string, done: boolean) => Promise<Result>;
  /** Add an item, or a subtask when `parentId` is set. Omit to hide the add row. */
  onAdd?: (text: string, parentId?: string) => Promise<Result>;
  /** Delete an item or subtask. Omit to hide the delete buttons. */
  onRemove?: (id: string) => Promise<Result>;
  /** Files chosen for an item. Omit to hide the attach button. */
  onAttach?: (id: string, files: File[]) => Promise<Result>;
  onRemoveAttachment?: (itemId: string, attachmentId: string) => Promise<Result>;
  /** Show the progress bar. Default true. */
  showProgress?: boolean;
  /** Read-only: no ticking, adding or deleting. */
  readOnly?: boolean;
  labels?: ChecklistLabels;
}

interface Ctx {
  t: ReturnType<typeof strings>;
  readOnly: boolean;
  run: (fn: () => Promise<Result>) => Promise<boolean>;
  props: ChecklistProps;
}

function AddRow({ placeholder, label, onSubmit, t, autoFocus, onCancel }: { placeholder: string; label: string; onSubmit: (text: string) => Promise<boolean>; t: ReturnType<typeof strings>; autoFocus?: boolean; onCancel?: () => void }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    const value = text.trim();
    if (!value || busy) return;
    setBusy(true);
    const ok = await onSubmit(value);
    setBusy(false);
    if (ok) setText("");
  };
  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <Input aria-label={label} placeholder={placeholder} value={text} autoFocus={autoFocus} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Escape" && onCancel?.()} />
      <Button type="submit" variant="secondary" loading={busy} disabled={text.trim() === ""}>
        <Plus aria-hidden />
        {t.add}
      </Button>
    </form>
  );
}

/** Right-click, Shift+F10 or the Menu key on an item opens the same actions as its buttons. */
function RowMenu({ enabled, menu, children }: { enabled: boolean; menu: ReactNode; children: ReactNode }) {
  if (!enabled) return <>{children}</>;
  return (
    <ContextMenu>
      <ContextMenuTrigger render={<div />}>{children}</ContextMenuTrigger>
      <ContextMenuContent>{menu}</ContextMenuContent>
    </ContextMenu>
  );
}

function Row({ item, ctx, child = false }: { item: ChecklistItem; ctx: Ctx; child?: boolean }) {
  const { t, readOnly, run, props } = ctx;
  const [open, setOpen] = useState(true);
  const [adding, setAdding] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const subs = item.subtasks ?? [];
  const state = subtaskState(item);
  const done = isItemDone(item);
  const doneSubs = subs.filter((s) => s.done).length;
  const menuEnabled = !readOnly && Boolean((!child && props.onAdd) || props.onAttach || props.onRemove);

  return (
    <li data-slot="checklist-item" data-done={done || undefined} className="flex flex-col gap-1.5">
      <RowMenu
        enabled={menuEnabled}
        menu={
          <>
            {!child && props.onAdd ? (
              <ContextMenuItem onClick={() => setAdding(true)}>
                <Plus aria-hidden />
                {t.addSubtask}
              </ContextMenuItem>
            ) : null}
            {props.onAttach ? (
              <ContextMenuItem onClick={() => fileRef.current?.click()}>
                <Paperclip aria-hidden />
                {t.attach}
              </ContextMenuItem>
            ) : null}
            {props.onRemove ? (
              <ContextMenuItem variant="danger" onClick={() => void run(() => props.onRemove?.(item.id) ?? Promise.resolve())}>
                <Trash2 aria-hidden />
                {t.remove}
              </ContextMenuItem>
            ) : null}
          </>
        }
      >
      <div className="group flex items-start gap-2.5 rounded-control px-1 py-1 hover:bg-nq-hover">
        <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-2.5">
          <Checkbox
            className="mt-0.5"
            checked={done}
            indeterminate={state === "some"}
            disabled={readOnly}
            aria-label={item.text}
            onCheckedChange={(v) => void run(() => props.onToggle(item.id, v === true))}
          />
          <span className="flex min-w-0 flex-col">
            <span className={cn("text-body-sm text-foreground", done && "text-muted-foreground line-through")}>{item.text}</span>
            {item.meta ? <span className="text-caption text-muted-foreground">{item.meta}</span> : null}
          </span>
        </label>
        {subs.length > 0 ? (
          <span dir="ltr" className="mt-0.5 shrink-0 text-caption text-muted-foreground">
            <Num value={doneSubs} />/<Num value={subs.length} />
          </span>
        ) : null}
        <div className="flex shrink-0 items-center">
          {!child && !readOnly && props.onAdd ? (
            <Button variant="ghost" size="icon-sm" aria-label={t.addSubtaskFor(item.text)} onClick={() => setAdding((v) => !v)}>
              <Plus aria-hidden />
            </Button>
          ) : null}
          {!readOnly && props.onAttach ? (
            <>
              <Button variant="ghost" size="icon-sm" aria-label={t.attachFor(item.text)} onClick={() => fileRef.current?.click()}>
                <Paperclip aria-hidden />
              </Button>
              <input
                ref={fileRef}
                type="file"
                multiple
                className="sr-only"
                tabIndex={-1}
                onChange={(e) => {
                  const files = Array.from(e.currentTarget.files ?? []);
                  e.currentTarget.value = "";
                  if (files.length) void run(() => props.onAttach?.(item.id, files) ?? Promise.resolve());
                }}
              />
            </>
          ) : null}
          {!readOnly && props.onRemove ? (
            <Button variant="ghost" size="icon-sm" aria-label={t.removeFor(item.text)} onClick={() => void run(() => props.onRemove?.(item.id) ?? Promise.resolve())}>
              <Trash2 aria-hidden />
            </Button>
          ) : null}
          {subs.length > 0 ? (
            <Button variant="ghost" size="icon-sm" aria-expanded={open} aria-label={(open ? t.collapse : t.expand)(item.text)} onClick={() => setOpen((v) => !v)}>
              <ChevronDown aria-hidden className={cn("transition-transform duration-150", !open && "-rotate-90 rtl:rotate-90")} />
            </Button>
          ) : null}
        </div>
      </div>
      </RowMenu>

      {item.attachments && item.attachments.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5 ps-8" aria-label={t.attach}>
          {item.attachments.map((a) => (
            <li key={a.id} className="inline-flex max-w-full items-center gap-1 rounded-control border border-border bg-secondary px-2 py-0.5 text-caption text-foreground">
              <Paperclip aria-hidden className="size-3 shrink-0 text-muted-foreground" />
              {a.url ? (
                <a href={a.url} dir="auto" className="truncate underline-offset-2 hover:underline">
                  {a.name}
                </a>
              ) : (
                <span dir="auto" className="truncate">
                  {a.name}
                </span>
              )}
              {a.size !== undefined ? <bdi className="text-muted-foreground">{attachmentSize(a.size)}</bdi> : null}
              {!readOnly && props.onRemoveAttachment ? (
                <button
                  type="button"
                  aria-label={t.removeAttachment(a.name)}
                  className="inline-flex size-4 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus"
                  onClick={() => void run(() => props.onRemoveAttachment?.(item.id, a.id) ?? Promise.resolve())}
                >
                  <X aria-hidden className="size-3" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {subs.length > 0 && open ? (
        <ul className="ms-3 flex flex-col gap-1 border-s border-border ps-4">
          {subs.map((s) => (
            <Row key={s.id} item={s} ctx={ctx} child />
          ))}
        </ul>
      ) : null}

      {adding && props.onAdd ? (
        <div className="ms-3 ps-4">
          <AddRow
            autoFocus
            label={t.addSubtask}
            placeholder={t.subtaskPlaceholder}
            t={t}
            onCancel={() => setAdding(false)}
            onSubmit={(text) => run(() => props.onAdd?.(text, item.id) ?? Promise.resolve())}
          />
        </div>
      ) : null}
    </li>
  );
}

/**
 * A list of tickable items with a progress bar, one level of subtasks and file attachments. Progress counts
 * leaf tasks, and a parent is done when all of its subtasks are. Everything is a callback: you own the
 * data and pass the updated `items` back (`toggleItem` does the cascade for you).
 */
export function Checklist({ items, onToggle, onAdd, onRemove, onAttach, onRemoveAttachment, showProgress = true, readOnly = false, labels, className, ...props }: ChecklistProps) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const t = { ...strings(locale), ...labels } as ReturnType<typeof strings>;
  const [error, setError] = useState<string | null>(null);
  const p = checklistProgress(items);

  const run = async (fn: () => Promise<Result>) => {
    setError(null);
    try {
      const r = await fn();
      if (r && typeof r === "object" && r.error) {
        setError(r.error);
        return false;
      }
      return true;
    } catch {
      setError(t.failed);
      return false;
    }
  };
  const ctx: Ctx = { t, readOnly, run, props: { items, onToggle, onAdd, onRemove, onAttach, onRemoveAttachment } };

  return (
    <section data-slot="checklist" aria-label={t.title} className={cn("flex flex-col gap-3", className)} {...props}>
      {showProgress && p.total > 0 ? (
        <Progress value={p.percent} tone={p.percent === 100 ? "success" : "default"} label={p.percent === 100 ? t.complete : t.progress(p.done, p.total)} />
      ) : null}
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {items.length === 0 ? (
        <EmptyState icon={ListChecks} title={t.empty} description={readOnly ? undefined : t.emptyBody} />
      ) : (
        <ul aria-label={t.list} className="flex flex-col gap-1">
          {items.map((item) => (
            <Row key={item.id} item={item} ctx={ctx} />
          ))}
        </ul>
      )}
      {!readOnly && onAdd ? <AddRow label={t.addLabel} placeholder={t.addPlaceholder} t={t} onSubmit={(text) => run(() => onAdd(text))} /> : null}
    </section>
  );
}
