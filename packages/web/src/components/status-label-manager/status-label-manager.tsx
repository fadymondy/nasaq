"use client";

import { ArrowDown, ArrowUp, Pencil, Plus, Tag, Trash2 } from "lucide-react";
import { type ComponentProps, type ReactNode, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Alert } from "../alert";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../alert-dialog";
import { Badge } from "../badge";
import { Button } from "../button";
import { Card } from "../card";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "../context-menu";
import { ColorPicker, type ColorSwatch } from "../color-picker";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../dialog";
import { Field, FieldDescription, FieldError, FieldLabel, Input } from "../field";
import { Num } from "../numeric";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { EmptyState } from "../states";
import { Tabs, TabsIndicator, TabsList, TabsPanel, TabsTab } from "../tabs";
import {
  groupByStage,
  moveWithinStage,
  NAME_MAX,
  type NameError,
  STATUS_HUES,
  STATUS_STAGES,
  type StatusHue,
  type StatusStage,
  validateName,
  type WorkStatus,
  type WorkLabel,
} from "./status-label-logic";

export {
  groupByStage,
  hasDoneStage,
  moveWithinStage,
  NAME_MAX,
  type NameError,
  STATUS_HUES,
  STATUS_STAGES,
  type StatusHue,
  type StatusStage,
  sortByStage,
  validateName,
  type WorkStatus,
  type WorkLabel,
} from "./status-label-logic";

const STRINGS = {
  en: {
    statuses: "Statuses",
    labels: "Labels",
    statusesBody: "The steps work moves through. Each status belongs to a stage, so reports know what is open and what is done.",
    labelsBody: "Free-form tags you can put on any item.",
    stage: { backlog: "Backlog", todo: "To do", active: "In progress", review: "In review", done: "Done", canceled: "Canceled" } satisfies Record<StatusStage, string>,
    stageEmpty: "No statuses in this stage",
    addStatus: "New status",
    addLabel: "New label",
    editStatus: "Edit status",
    editLabel: "Edit label",
    edit: (n: string) => `Edit ${n}`,
    remove: (n: string) => `Delete ${n}`,
    moveUp: (n: string) => `Move ${n} up`,
    moveDown: (n: string) => `Move ${n} down`,
    name: "Name",
    nameHint: (n: number) => `Up to ${n} characters.`,
    colour: "Colour",
    stageField: "Stage",
    preview: "Preview",
    errors: { empty: "Give it a name.", tooLong: (n: number) => `Use ${n} characters or fewer.`, duplicate: "That name is already used." },
    save: "Save",
    create: "Create",
    cancel: "Cancel",
    usedBy: (n: number) => (n === 0 ? "Not used" : n === 1 ? "Used by 1 item" : `Used by ${n} items`),
    deleteStatusTitle: (n: string) => `Delete status ${n}?`,
    deleteLabelTitle: (n: string) => `Delete label ${n}?`,
    deleteBody: (n: number) => (n === 0 ? "Nothing uses it, so nothing else changes." : n === 1 ? "1 item uses it. It loses this value." : `${n} items use it. They lose this value.`),
    deleteConfirm: "Delete",
    emptyLabels: "No labels yet",
    emptyLabelsBody: "Labels help you find and group items.",
    noDone: "Add a status in the Done stage so finished work can be counted.",
    failed: "Could not save. Try again.",
    colours: { gray: "Gray", red: "Red", orange: "Orange", amber: "Amber", green: "Green", teal: "Teal", blue: "Blue", violet: "Violet", pink: "Pink" } satisfies Record<StatusHue, string>,
    list: (kind: string) => kind,
  },
  ar: {
    statuses: "الحالات",
    labels: "التصنيفات",
    statusesBody: "الخطوات التي يمر بها العمل. تنتمي كل حالة إلى مرحلة، لتعرف التقارير ما هو مفتوح وما هو منجز.",
    labelsBody: "وسوم حرة يمكنك وضعها على أي عنصر.",
    stage: { backlog: "قائمة الانتظار", todo: "للتنفيذ", active: "قيد التنفيذ", review: "قيد المراجعة", done: "منجز", canceled: "ملغى" } satisfies Record<StatusStage, string>,
    stageEmpty: "لا توجد حالات في هذه المرحلة",
    addStatus: "حالة جديدة",
    addLabel: "تصنيف جديد",
    editStatus: "تعديل الحالة",
    editLabel: "تعديل التصنيف",
    edit: (n: string) => `تعديل ${n}`,
    remove: (n: string) => `حذف ${n}`,
    moveUp: (n: string) => `نقل ${n} لأعلى`,
    moveDown: (n: string) => `نقل ${n} لأسفل`,
    name: "الاسم",
    nameHint: (n: number) => `حتى ${n} حرفًا.`,
    colour: "اللون",
    stageField: "المرحلة",
    preview: "معاينة",
    errors: { empty: "اكتب اسمًا.", tooLong: (n: number) => `استخدم ${n} حرفًا أو أقل.`, duplicate: "هذا الاسم مستخدم بالفعل." },
    save: "حفظ",
    create: "إنشاء",
    cancel: "إلغاء",
    usedBy: (n: number) => (n === 0 ? "غير مستخدم" : n === 1 ? "يستخدمه عنصر واحد" : n === 2 ? "يستخدمه عنصران" : n <= 10 ? `يستخدمه ${n} عناصر` : `يستخدمه ${n} عنصرًا`),
    deleteStatusTitle: (n: string) => `حذف الحالة ${n}؟`,
    deleteLabelTitle: (n: string) => `حذف التصنيف ${n}؟`,
    deleteBody: (n: number) => (n === 0 ? "لا شيء يستخدمه، فلن يتغير أي شيء آخر." : n === 1 ? "يستخدمه عنصر واحد وسيفقد هذه القيمة." : `يستخدمه ${n} عنصرًا وسيفقدون هذه القيمة.`),
    deleteConfirm: "حذف",
    emptyLabels: "لا توجد تصنيفات بعد",
    emptyLabelsBody: "تساعدك التصنيفات على إيجاد العناصر وتجميعها.",
    noDone: "أضف حالة في مرحلة «منجز» ليمكن احتساب العمل المنتهي.",
    failed: "تعذّر الحفظ. حاول مرة أخرى.",
    colours: { gray: "رمادي", red: "أحمر", orange: "برتقالي", amber: "كهرماني", green: "أخضر", teal: "تركوازي", blue: "أزرق", violet: "بنفسجي", pink: "وردي" } satisfies Record<StatusHue, string>,
    list: (kind: string) => kind,
  },
};
const strings = (locale: string) => STRINGS[locale.startsWith("ar") ? "ar" : "en"];

export type StatusLabelManagerLabels = Partial<typeof STRINGS.en>;
type Result = void | { error?: string };

export interface StatusDraft {
  /** Set when editing; absent when creating. */
  id?: string;
  name: string;
  hue: StatusHue;
  stage: StatusStage;
}
export interface LabelDraft {
  id?: string;
  name: string;
  hue: StatusHue;
}

export interface StatusLabelManagerProps extends ComponentProps<"section"> {
  statuses: WorkStatus[];
  labels: WorkLabel[];
  /** Create (no `id`) or update a status. */
  onSaveStatus: (draft: StatusDraft) => Promise<Result>;
  onDeleteStatus: (id: string) => Promise<Result>;
  /** The full new order of status ids, after a move within a stage. */
  onReorderStatuses: (ids: string[]) => Promise<Result>;
  onSaveLabel: (draft: LabelDraft) => Promise<Result>;
  onDeleteLabel: (id: string) => Promise<Result>;
  /** Which tab opens first. Default `statuses`. */
  defaultTab?: "statuses" | "labels";
  copy?: StatusLabelManagerLabels;
}

type EditState = { kind: "status"; item: WorkStatus | null } | { kind: "label"; item: WorkLabel | null } | null;

const toHue = (v: string): StatusHue => (STATUS_HUES.find((h) => v === `--nq-tag-${h}`) ?? "gray") as StatusHue;

/** A list row that also opens its actions from a context menu (pointer, Shift+F10 or the Menu key). */
function RowMenu({ menu, children }: { menu: ReactNode; children: ReactNode }) {
  return (
    <ContextMenu>
      <ContextMenuTrigger render={<li className="flex flex-wrap items-center gap-3 px-4 py-2.5" />}>{children}</ContextMenuTrigger>
      <ContextMenuContent>{menu}</ContextMenuContent>
    </ContextMenu>
  );
}

function EditDialog({
  edit,
  statuses,
  labels,
  t,
  onClose,
  onSaveStatus,
  onSaveLabel,
}: {
  edit: EditState;
  statuses: WorkStatus[];
  labels: WorkLabel[];
  t: ReturnType<typeof strings>;
  onClose: () => void;
  onSaveStatus: StatusLabelManagerProps["onSaveStatus"];
  onSaveLabel: StatusLabelManagerProps["onSaveLabel"];
}) {
  // The dialog body is keyed by what is edited, so its draft resets whenever a different item opens.
  return (
    <Dialog open={edit !== null} onOpenChange={(o) => !o && onClose()}>
      {edit ? <EditBody key={`${edit.kind}-${edit.item?.id ?? "new"}`} edit={edit} statuses={statuses} labels={labels} t={t} onClose={onClose} onSaveStatus={onSaveStatus} onSaveLabel={onSaveLabel} /> : null}
    </Dialog>
  );
}

function EditBody({ edit, statuses, labels, t, onClose, onSaveStatus, onSaveLabel }: { edit: NonNullable<EditState>; statuses: WorkStatus[]; labels: WorkLabel[]; t: ReturnType<typeof strings>; onClose: () => void; onSaveStatus: StatusLabelManagerProps["onSaveStatus"]; onSaveLabel: StatusLabelManagerProps["onSaveLabel"] }) {
  const isStatus = edit.kind === "status";
  const [name, setName] = useState(edit.item?.name ?? "");
  const [hue, setHue] = useState<StatusHue>(edit.item?.hue ?? "blue");
  const [stage, setStage] = useState<StatusStage>(edit.kind === "status" ? (edit.item?.stage ?? "todo") : "todo");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameError: NameError | null = validateName(name, isStatus ? statuses : labels, edit.item?.id);
  const swatches: ColorSwatch[] = STATUS_HUES.map((h) => ({ value: `--nq-tag-${h}`, label: t.colours[h] }));
  const stageItems = STATUS_STAGES.map((s) => ({ value: s, label: t.stage[s] }));
  const message = nameError ? (nameError === "tooLong" ? t.errors.tooLong(NAME_MAX) : t.errors[nameError]) : null;

  const submit = async () => {
    setTouched(true);
    if (nameError) return;
    setBusy(true);
    setError(null);
    let failure: string | null = null;
    try {
      const id = edit.item?.id;
      const r = isStatus ? await onSaveStatus({ id, name: name.trim(), hue, stage }) : await onSaveLabel({ id, name: name.trim(), hue });
      if (r && typeof r === "object" && r.error) failure = r.error;
    } catch {
      failure = t.failed;
    }
    setBusy(false);
    if (failure) setError(failure);
    else onClose();
  };

  return (
    <DialogContent data-slot="status-label-edit">
      <DialogHeader>
        <DialogTitle>{isStatus ? t.editStatus : t.editLabel}</DialogTitle>
        <DialogDescription>{isStatus ? t.statusesBody : t.labelsBody}</DialogDescription>
      </DialogHeader>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <Field invalid={touched && nameError !== null}>
          <FieldLabel>{t.name}</FieldLabel>
          <Input value={name} autoFocus onChange={(e) => setName(e.target.value)} />
          {touched && message ? <FieldError match>{message}</FieldError> : <FieldDescription>{t.nameHint(NAME_MAX)}</FieldDescription>}
        </Field>
        <div className="flex flex-col gap-1.5">
          <span className="text-label text-foreground">{t.colour}</span>
          <ColorPicker value={`--nq-tag-${hue}`} swatches={swatches} allowHex={false} allowNative={false} onValueChange={(v) => setHue(toHue(v))} aria-label={t.colour} />
        </div>
        {isStatus ? (
          <Field>
            <FieldLabel>{t.stageField}</FieldLabel>
            <Select items={stageItems} value={stage} onValueChange={(v) => v && setStage(v as StatusStage)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {stageItems.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        ) : null}
        <div className="flex items-center gap-2 text-caption text-muted-foreground">
          {t.preview}
          <Badge variant="tag" hue={hue}>
            {name.trim() || "…"}
          </Badge>
        </div>
        {error ? <Alert tone="danger">{error}</Alert> : null}
        <DialogFooter>
          <Button type="button" variant="ghost" disabled={busy} onClick={onClose}>
            {t.cancel}
          </Button>
          <Button type="submit" variant="primary" loading={busy}>
            {edit.item ? t.save : t.create}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

/**
 * Manage the two vocabularies of a work tracker: workflow statuses (a name, a colour and a stage, ordered
 * inside their stage) and free labels (a name and a colour). Create and edit go through a dialog with
 * validation; delete asks first and says how many items lose the value. No backend: your callbacks save,
 * then you pass the updated lists back.
 */
export function StatusLabelManager({ statuses, labels, onSaveStatus, onDeleteStatus, onReorderStatuses, onSaveLabel, onDeleteLabel, defaultTab = "statuses", copy, className, ...props }: StatusLabelManagerProps) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const t = { ...strings(locale), ...copy } as ReturnType<typeof strings>;
  const [edit, setEdit] = useState<EditState>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<{ kind: "status" | "label"; id: string; name: string; usage: number } | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const groups = groupByStage(statuses);

  const run = async (fn: () => Promise<Result>) => {
    setError(null);
    try {
      const r = await fn();
      if (r && typeof r === "object" && r.error) setError(r.error);
    } catch {
      setError(t.failed);
    }
  };
  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    setError(null);
    try {
      const r = deleting.kind === "status" ? await onDeleteStatus(deleting.id) : await onDeleteLabel(deleting.id);
      if (r && typeof r === "object" && r.error) setError(r.error);
      else setDeleting(null);
    } catch {
      setError(t.failed);
    }
    setDeleteBusy(false);
  };

  return (
    <section data-slot="status-label-manager" className={cn("flex flex-col gap-4", className)} {...props}>
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <Tabs defaultValue={defaultTab}>
        <TabsList variant="underline">
          <TabsTab value="statuses">{t.statuses}</TabsTab>
          <TabsTab value="labels">{t.labels}</TabsTab>
          <TabsIndicator />
        </TabsList>

        <TabsPanel value="statuses" className="mt-4 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-prose text-body-sm text-muted-foreground">{t.statusesBody}</p>
            <Button variant="primary" onClick={() => setEdit({ kind: "status", item: null })}>
              <Plus aria-hidden />
              {t.addStatus}
            </Button>
          </div>
          {!statuses.some((s) => s.stage === "done") ? <Alert tone="warning">{t.noDone}</Alert> : null}
          <div className="flex flex-col gap-3">
            {groups.map((g) => (
              <Card key={g.stage} data-stage={g.stage} className="gap-0 py-0">
                <div className="flex items-center justify-between border-b border-border px-4 py-2">
                  <h3 className="text-label text-foreground">{t.stage[g.stage]}</h3>
                  <Num value={g.items.length} className="text-caption text-muted-foreground" />
                </div>
                {g.items.length === 0 ? (
                  <p className="px-4 py-3 text-body-sm text-muted-foreground">{t.stageEmpty}</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {g.items.map((s, i) => (
                      <RowMenu
                        key={s.id}
                        menu={
                          <>
                            <ContextMenuItem onClick={() => setEdit({ kind: "status", item: s })}>
                              <Pencil aria-hidden />
                              {t.editStatus}
                            </ContextMenuItem>
                            <ContextMenuItem disabled={i === 0} onClick={() => void run(() => onReorderStatuses(moveWithinStage(statuses, s.id, -1)))}>
                              <ArrowUp aria-hidden />
                              {t.moveUp(s.name)}
                            </ContextMenuItem>
                            <ContextMenuItem disabled={i === g.items.length - 1} onClick={() => void run(() => onReorderStatuses(moveWithinStage(statuses, s.id, 1)))}>
                              <ArrowDown aria-hidden />
                              {t.moveDown(s.name)}
                            </ContextMenuItem>
                            <ContextMenuSeparator />
                            <ContextMenuItem variant="danger" onClick={() => setDeleting({ kind: "status", id: s.id, name: s.name, usage: s.usage ?? 0 })}>
                              <Trash2 aria-hidden />
                              {t.remove(s.name)}
                            </ContextMenuItem>
                          </>
                        }
                      >
                        <Badge variant="tag" hue={s.hue}>
                          {s.name}
                        </Badge>
                        <span className="min-w-0 flex-1 text-caption text-muted-foreground">{s.usage !== undefined ? t.usedBy(s.usage) : null}</span>
                        <div className="flex items-center">
                          <Button variant="ghost" size="icon-sm" disabled={i === 0} aria-label={t.moveUp(s.name)} onClick={() => void run(() => onReorderStatuses(moveWithinStage(statuses, s.id, -1)))}>
                            <ArrowUp aria-hidden />
                          </Button>
                          <Button variant="ghost" size="icon-sm" disabled={i === g.items.length - 1} aria-label={t.moveDown(s.name)} onClick={() => void run(() => onReorderStatuses(moveWithinStage(statuses, s.id, 1)))}>
                            <ArrowDown aria-hidden />
                          </Button>
                          <Button variant="ghost" size="icon-sm" aria-label={t.edit(s.name)} onClick={() => setEdit({ kind: "status", item: s })}>
                            <Pencil aria-hidden />
                          </Button>
                          <Button variant="ghost" size="icon-sm" aria-label={t.remove(s.name)} onClick={() => setDeleting({ kind: "status", id: s.id, name: s.name, usage: s.usage ?? 0 })}>
                            <Trash2 aria-hidden />
                          </Button>
                        </div>
                      </RowMenu>
                    ))}
                  </ul>
                )}
              </Card>
            ))}
          </div>
        </TabsPanel>

        <TabsPanel value="labels" className="mt-4 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-prose text-body-sm text-muted-foreground">{t.labelsBody}</p>
            <Button variant="primary" onClick={() => setEdit({ kind: "label", item: null })}>
              <Plus aria-hidden />
              {t.addLabel}
            </Button>
          </div>
          {labels.length === 0 ? (
            <EmptyState icon={Tag} title={t.emptyLabels} description={t.emptyLabelsBody} />
          ) : (
            <Card className="gap-0 py-0">
              <ul className="divide-y divide-border">
                {labels.map((l) => (
                  <RowMenu
                    key={l.id}
                    menu={
                      <>
                        <ContextMenuItem onClick={() => setEdit({ kind: "label", item: l })}>
                          <Pencil aria-hidden />
                          {t.editLabel}
                        </ContextMenuItem>
                        <ContextMenuSeparator />
                        <ContextMenuItem variant="danger" onClick={() => setDeleting({ kind: "label", id: l.id, name: l.name, usage: l.usage ?? 0 })}>
                          <Trash2 aria-hidden />
                          {t.remove(l.name)}
                        </ContextMenuItem>
                      </>
                    }
                  >
                    <Badge variant="tag" hue={l.hue}>
                      {l.name}
                    </Badge>
                    <span className="min-w-0 flex-1 text-caption text-muted-foreground">{l.usage !== undefined ? t.usedBy(l.usage) : null}</span>
                    <div className="flex items-center">
                      <Button variant="ghost" size="icon-sm" aria-label={t.edit(l.name)} onClick={() => setEdit({ kind: "label", item: l })}>
                        <Pencil aria-hidden />
                      </Button>
                      <Button variant="ghost" size="icon-sm" aria-label={t.remove(l.name)} onClick={() => setDeleting({ kind: "label", id: l.id, name: l.name, usage: l.usage ?? 0 })}>
                        <Trash2 aria-hidden />
                      </Button>
                    </div>
                  </RowMenu>
                ))}
              </ul>
            </Card>
          )}
        </TabsPanel>
      </Tabs>

      <AlertDialog open={deleting !== null} onOpenChange={(o) => !o && !deleteBusy && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{deleting ? (deleting.kind === "status" ? t.deleteStatusTitle(deleting.name) : t.deleteLabelTitle(deleting.name)) : ""}</AlertDialogTitle>
            <AlertDialogDescription>{deleting ? t.deleteBody(deleting.usage) : ""}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteBusy}>{t.cancel}</AlertDialogCancel>
            <Button variant="danger" loading={deleteBusy} onClick={() => void confirmDelete()}>
              {t.deleteConfirm}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <EditDialog edit={edit} statuses={statuses} labels={labels} t={t} onClose={() => setEdit(null)} onSaveStatus={onSaveStatus} onSaveLabel={onSaveLabel} />
    </section>
  );
}
