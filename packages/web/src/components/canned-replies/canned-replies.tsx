"use client";

import { Copy, MessageSquareText, Pencil, Plus, Trash2 } from "lucide-react";
import { type ComponentProps, type ReactNode, useId, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Alert } from "../alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../alert-dialog";
import { Button } from "../button";
import type { DataTableColumn } from "../data-table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../dialog";
import { fillVariables } from "../email-templates";
import { ActivityCell, CardMeta, EntityList, type EntityListProps } from "../entity-list";
import { Field, FieldDescription, FieldLabel, Input, Textarea } from "../field";
import { Num } from "../numeric";
import { EmptyState } from "../states";
import {
  type CannedReplyIssue,
  cannedReplyVariables,
  nextFreeCannedShortcut,
  normalizeCannedShortcut,
  validateCannedReply,
} from "./canned-replies-logic";

/* ------------------------------------------------------------------ strings */

const STRINGS = {
  en: {
    label: "Canned replies",
    search: "Search replies…",
    shortcut: "Shortcut",
    title: "Title",
    body: "Reply",
    uses: "Uses",
    updated: "Updated",
    add: "New reply",
    edit: "Edit",
    duplicate: "Duplicate",
    remove: "Delete",
    empty: "No canned replies yet",
    emptyHint: "Save the answers you type again and again, and insert them with a slash.",
    dialogNew: "New canned reply",
    dialogEdit: "Edit canned reply",
    dialogHint: "Type the shortcut after a slash in any composer to insert the reply.",
    shortcutHint: "Letters, digits, hyphen. Typed after /.",
    titleHint: "Only your team sees this.",
    bodyHint: "Insert a variable and it is filled in for each conversation.",
    variables: "Variables",
    insertVariable: (label: string) => `Insert ${label}`,
    preview: "Preview",
    previewHint: "With sample values",
    save: "Save reply",
    cancel: "Cancel",
    removeTitle: (title: string) => `Delete “${title}”?`,
    removeBody: "It disappears for everyone on your team. Messages already sent are not changed.",
    failed: "That did not work. Try again.",
    issues: {
      "title-empty": "Give the reply a title.",
      "shortcut-empty": "Add a shortcut.",
      "shortcut-duplicate": "Another reply already uses this shortcut.",
      "body-empty": "Write the reply.",
      "variable-unknown": "The reply uses a variable that does not exist.",
    } as Record<CannedReplyIssue, string>,
    variableNames: { name: "Name", agent: "Agent", company: "Company" } as Record<string, string>,
  },
  ar: {
    label: "الردود الجاهزة",
    search: "ابحث في الردود…",
    shortcut: "الاختصار",
    title: "العنوان",
    body: "الرد",
    uses: "مرات الاستخدام",
    updated: "آخر تعديل",
    add: "رد جديد",
    edit: "تعديل",
    duplicate: "تكرار",
    remove: "حذف",
    empty: "لا توجد ردود جاهزة بعد",
    emptyHint: "احفظ الإجابات التي تكتبها مرارًا، وأدرجها بشرطة مائلة.",
    dialogNew: "رد جاهز جديد",
    dialogEdit: "تعديل الرد الجاهز",
    dialogHint: "اكتب الاختصار بعد شرطة مائلة في أي مربع كتابة لإدراج الرد.",
    shortcutHint: "حروف وأرقام وشرطة. يُكتب بعد /.",
    titleHint: "يراه فريقك فقط.",
    bodyHint: "أدرج متغيرًا ليُملأ تلقائيًا في كل محادثة.",
    variables: "المتغيرات",
    insertVariable: (label: string) => `إدراج ${label}`,
    preview: "معاينة",
    previewHint: "بقيم تجريبية",
    save: "حفظ الرد",
    cancel: "إلغاء",
    removeTitle: (title: string) => `حذف «${title}»؟`,
    removeBody: "يختفي عن كل أعضاء فريقك. الرسائل المرسلة لا تتغير.",
    failed: "لم تنجح العملية. حاول مرة أخرى.",
    issues: {
      "title-empty": "أعطِ الرد عنوانًا.",
      "shortcut-empty": "أضف اختصارًا.",
      "shortcut-duplicate": "يستخدم رد آخر هذا الاختصار.",
      "body-empty": "اكتب الرد.",
      "variable-unknown": "يستخدم الرد متغيرًا غير موجود.",
    } as Record<CannedReplyIssue, string>,
    variableNames: { name: "الاسم", agent: "الموظف", company: "الشركة" } as Record<string, string>,
  },
};
export type CannedRepliesLabels = Omit<typeof STRINGS.en, "issues" | "variableNames"> & { issues: Record<CannedReplyIssue, string>; variableNames: Record<string, string> };
export type CannedRepliesLabelOverrides = Partial<Omit<CannedRepliesLabels, "issues" | "variableNames">> & { issues?: Partial<CannedRepliesLabels["issues"]> };

/* ------------------------------------------------------------------ types */

/** A saved reply. Structurally a `CannedSnippet`, so the same list feeds the Inbox composer's `/` menu. */
export interface CannedReply {
  id: string;
  /** Typed after `/`, e.g. "refund". */
  shortcut: string;
  title: string;
  /** May contain `{{name}}`-style variables. */
  body: string;
  uses?: number;
  updatedAt?: Date | string | number | null;
}

export interface CannedReplyVariable {
  /** The name inside `{{ }}`. */
  key: string;
  label: string;
  /** Used in the preview. */
  sample: string;
}

export type CannedReplyResult = void | { error?: string };

export interface CannedRepliesManagerProps
  extends Omit<EntityListProps<CannedReply>, "data" | "columns" | "getRowId" | "renderCard" | "label" | "labels" | "facets" | "rowActions" | "actions" | "onRowClick" | "selectable" | "bulkActions"> {
  replies: CannedReply[];
  /** Variables people can insert. Default name, agent and company. */
  variables?: CannedReplyVariable[];
  /** Create or update. A new reply has an id that starts with `new-`. */
  onSave?: (reply: CannedReply) => Promise<CannedReplyResult>;
  onDelete?: (reply: CannedReply) => Promise<CannedReplyResult>;
  label?: string;
  labels?: CannedRepliesLabelOverrides;
}

/* ------------------------------------------------------------------ editor */

interface EditorProps {
  reply: CannedReply;
  isNew: boolean;
  others: CannedReply[];
  variables: CannedReplyVariable[];
  t: CannedRepliesLabels;
  onClose: () => void;
  onSave: (reply: CannedReply) => Promise<CannedReplyResult>;
}

function CannedReplyEditor({ reply, isNew, others, variables, t, onClose, onSave }: EditorProps) {
  const id = useId();
  const [draft, setDraft] = useState(reply);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const issues = validateCannedReply(draft, others, variables.map((v) => v.key));
  const show = (issue: CannedReplyIssue) => touched && issues.includes(issue);

  const insert = (key: string) => {
    const el = bodyRef.current;
    const token = `{{${key}}}`;
    const start = el?.selectionStart ?? draft.body.length;
    const end = el?.selectionEnd ?? draft.body.length;
    setDraft((d) => ({ ...d, body: d.body.slice(0, start) + token + d.body.slice(end) }));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const submit = async () => {
    setTouched(true);
    if (issues.length) return;
    setSaving(true);
    setError(null);
    try {
      const result = await onSave({ ...draft, shortcut: normalizeCannedShortcut(draft.shortcut), title: draft.title.trim(), updatedAt: new Date() });
      if (result && result.error) setError(result.error);
      else onClose();
    } catch {
      setError(t.failed);
    } finally {
      setSaving(false);
    }
  };

  const preview = fillVariables(draft.body, variables);
  const fieldError = (issue: CannedReplyIssue): ReactNode =>
    show(issue) ? (
      <p role="alert" className="text-caption text-destructive">
        {t.issues[issue]}
      </p>
    ) : null;

  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isNew ? t.dialogNew : t.dialogEdit}</DialogTitle>
          <DialogDescription>{t.dialogHint}</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          {error ? <Alert tone="danger">{error}</Alert> : null}
          <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
            <Field invalid={show("title-empty")}>
              <FieldLabel>{t.title}</FieldLabel>
              <Input value={draft.title} autoFocus onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
              {fieldError("title-empty") ?? <FieldDescription>{t.titleHint}</FieldDescription>}
            </Field>
            <Field invalid={show("shortcut-empty") || show("shortcut-duplicate")}>
              <FieldLabel>{t.shortcut}</FieldLabel>
              <div className="flex items-center gap-1">
                <span aria-hidden className="text-muted-foreground">
                  /
                </span>
                <Input ltr value={draft.shortcut} onChange={(e) => setDraft({ ...draft, shortcut: normalizeCannedShortcut(e.target.value) })} />
              </div>
              {fieldError("shortcut-empty") ?? fieldError("shortcut-duplicate") ?? <FieldDescription>{t.shortcutHint}</FieldDescription>}
            </Field>
          </div>
          <Field invalid={show("body-empty") || show("variable-unknown")}>
            <FieldLabel htmlFor={`${id}-body`}>{t.body}</FieldLabel>
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t.variables}>
              <span className="text-caption text-muted-foreground">{t.variables}</span>
              {variables.map((v) => (
                <Button key={v.key} type="button" size="sm" variant="secondary" aria-label={t.insertVariable(v.label)} onClick={() => insert(v.key)}>
                  {v.label}
                </Button>
              ))}
            </div>
            <Textarea id={`${id}-body`} ref={bodyRef} rows={5} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
            {fieldError("body-empty") ?? fieldError("variable-unknown") ?? <FieldDescription>{t.bodyHint}</FieldDescription>}
          </Field>
          <div className="flex flex-col gap-1.5" aria-live="polite">
            <span className="text-label text-foreground">
              {t.preview} <span className="text-caption font-normal text-muted-foreground">{t.previewHint}</span>
            </span>
            <p dir="auto" className="min-h-12 whitespace-pre-wrap rounded-card border border-border bg-nq-surface-soft p-3 text-body-sm text-foreground">
              {preview || "—"}
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" disabled={saving} onClick={onClose}>
              {t.cancel}
            </Button>
            <Button type="submit" variant="primary" loading={saving}>
              {t.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ manager */

/**
 * The library behind a reply composer's `/` menu: search, add, edit, duplicate and delete canned replies, with
 * variable buttons and a live preview. Built on `EntityList`, so row actions also open as a context menu.
 */
export function CannedRepliesManager({ replies, variables, onSave, onDelete, label, labels, empty, ...props }: CannedRepliesManagerProps) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const base = STRINGS[locale.startsWith("ar") ? "ar" : "en"];
  const t: CannedRepliesLabels = { ...base, ...labels, issues: { ...base.issues, ...labels?.issues }, variableNames: base.variableNames };
  const vars = useMemo<CannedReplyVariable[]>(
    () =>
      variables ?? [
        { key: "name", label: t.variableNames.name ?? "name", sample: locale.startsWith("ar") ? "سارة" : "Sara" },
        { key: "agent", label: t.variableNames.agent ?? "agent", sample: locale.startsWith("ar") ? "عمر" : "Omar" },
        { key: "company", label: t.variableNames.company ?? "company", sample: locale.startsWith("ar") ? "نسق" : "Nasaq" },
      ],
    [variables, locale], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const [editing, setEditing] = useState<{ reply: CannedReply; isNew: boolean } | null>(null);
  const [removing, setRemoving] = useState<CannedReply | null>(null);

  const startNew = () => setEditing({ reply: { id: `new-${Date.now()}`, shortcut: "", title: "", body: "" }, isNew: true });
  const duplicate = async (r: CannedReply) => {
    if (!onSave) return;
    await onSave({ ...r, id: `new-${Date.now()}`, title: `${r.title} (${t.duplicate.toLowerCase()})`, shortcut: nextFreeCannedShortcut(r.shortcut, replies), uses: 0, updatedAt: new Date() });
  };

  const columns = useMemo<DataTableColumn<CannedReply>[]>(
    () => [
      {
        id: "shortcut",
        header: t.shortcut,
        hideable: false,
        cell: (r) => (
          <bdi dir="ltr" className="rounded-[4px] bg-secondary px-1.5 py-0.5 font-mono text-caption text-foreground">
            /{r.shortcut}
          </bdi>
        ),
        sortValue: (r) => r.shortcut,
        searchValue: (r) => `${r.shortcut} ${r.title} ${r.body}`,
      },
      { id: "title", header: t.title, cell: (r) => <span dir="auto" className="font-medium">{r.title}</span>, sortValue: (r) => r.title, className: "min-w-40" },
      { id: "body", header: t.body, cell: (r) => <span dir="auto" className="line-clamp-2 max-w-xl text-muted-foreground">{r.body}</span>, className: "min-w-64" },
      { id: "uses", header: t.uses, cell: (r) => (r.uses == null ? "—" : <Num value={r.uses} />), sortValue: (r) => r.uses, align: "end" },
      { id: "updated", header: t.updated, cell: (r) => <ActivityCell value={r.updatedAt} />, sortValue: (r) => (r.updatedAt == null ? null : new Date(r.updatedAt)), align: "end" },
    ],
    [locale, JSON.stringify(labels)], // eslint-disable-line react-hooks/exhaustive-deps
  );

  return (
    <div data-slot="canned-replies" className="flex min-w-0 flex-col gap-3">
      <EntityList<CannedReply>
        data={replies}
        columns={columns}
        getRowId={(r) => r.id}
        rowLabel={(r) => r.title}
        label={label ?? t.label}
        searchPlaceholder={t.search}
        selectable={false}
        defaultSort={{ id: "shortcut", direction: "asc" }}
        onRowClick={onSave ? (r) => setEditing({ reply: r, isNew: false }) : undefined}
        actions={onSave ? [{ id: "new", label: t.add, icon: Plus, primary: true, onSelect: startNew }] : undefined}
        rowActions={(r) => [
          ...(onSave ? [{ id: "edit", label: t.edit, icon: Pencil, onSelect: () => setEditing({ reply: r, isNew: false }) }, { id: "duplicate", label: t.duplicate, icon: Copy, onSelect: () => void duplicate(r) }] : []),
          ...(onDelete ? [{ id: "delete", label: t.remove, icon: Trash2, danger: true, group: "danger", onSelect: () => setRemoving(r) }] : []),
        ]}
        empty={empty ?? <EmptyState icon={MessageSquareText} title={t.empty} description={t.emptyHint} className="border-0" />}
        renderCard={(r) => (
          <div className="flex min-w-0 flex-col gap-2">
            <bdi dir="ltr" className="w-fit rounded-[4px] bg-secondary px-1.5 py-0.5 font-mono text-caption text-foreground">
              /{r.shortcut}
            </bdi>
            <span dir="auto" className="text-label text-foreground">
              {r.title}
            </span>
            <span dir="auto" className="line-clamp-3 text-body-sm text-muted-foreground">
              {r.body}
            </span>
            {r.uses != null ? (
              <CardMeta label={t.uses}>
                <Num value={r.uses} />
              </CardMeta>
            ) : null}
          </div>
        )}
        {...props}
      />

      {editing && onSave ? (
        <CannedReplyEditor
          key={editing.reply.id}
          reply={editing.reply}
          isNew={editing.isNew}
          others={replies}
          variables={vars}
          t={t}
          onClose={() => setEditing(null)}
          onSave={onSave}
        />
      ) : null}

      <AlertDialog open={!!removing} onOpenChange={(open) => !open && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.removeTitle(removing?.title ?? "")}</AlertDialogTitle>
            <AlertDialogDescription>{t.removeBody}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const target = removing;
                if (!target || !onDelete) return;
                void Promise.resolve(onDelete(target));
              }}
            >
              {t.remove}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
