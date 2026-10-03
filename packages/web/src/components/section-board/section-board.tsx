"use client";

import { closestCenter, DndContext, type DragEndEvent, MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { rectSortingStrategy, SortableContext, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, LayoutList, Plus, Settings2, Sparkles, Trash2, X } from "lucide-react";
import { type ComponentProps, type ElementType, type ReactNode, useEffect, useId, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Badge } from "../badge";
import { Button } from "../button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../dialog";
import { Field, FieldLabel, Input, Textarea } from "../field";
import { Icon } from "../icon";
import { formatNumber } from "../numeric";
import { keyTarget, moveItem } from "../repeater/repeater-math";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { EmptyState } from "../states";
import { Tooltip } from "../tooltip";
import {
  type BoardSection,
  type BoardSectionModel,
  type BoardSettingRow,
  boardSectionChanged,
  duplicateSectionSettingKeys,
  sectionSettingRows,
  sectionSettingsFromRows,
} from "./section-board-logic";

export * from "./section-board-logic";

const STRINGS = {
  en: {
    list: "Sections",
    add: "Add section",
    edit: (title: string) => `Edit ${title}`,
    remove: (title: string) => `Remove ${title}`,
    reorder: (title: string) => `Move ${title}`,
    reorderHint: "Drag, or press the arrow keys, Home or End, to move a section.",
    moved: (title: string, at: string, of: string) => `${title} is now at position ${at} of ${of}`,
    removed: (title: string) => `${title} removed`,
    saved: (title: string) => `${title} saved`,
    editTitle: "Edit section",
    editDescription: "The prompt and model that generate this section, and any settings it needs.",
    name: "Title",
    badge: "Tag",
    prompt: "Prompt",
    promptHint: "What should this section show? Write it as an instruction.",
    model: "Model",
    defaultModel: "Default model",
    settings: "Settings",
    key: "Key",
    value: "Value",
    removeSetting: (key: string) => (key ? `Remove setting ${key}` : "Remove setting"),
    addSetting: "Add setting",
    duplicateKey: (key: string) => `"${key}" is used more than once. Keys must be unique.`,
    needTitle: "Give the section a title.",
    cancel: "Cancel",
    save: "Save",
    emptyContent: "Nothing to show yet.",
    emptyTitle: "No sections",
    empty: "Add a section to start building this page.",
  },
  ar: {
    list: "الأقسام",
    add: "إضافة قسم",
    edit: (title: string) => `تعديل ${title}`,
    remove: (title: string) => `حذف ${title}`,
    reorder: (title: string) => `نقل ${title}`,
    reorderHint: "اسحب، أو استخدم مفاتيح الأسهم أو Home أو End، لنقل القسم.",
    moved: (title: string, at: string, of: string) => `${title} الآن في الموضع ${at} من ${of}`,
    removed: (title: string) => `تم حذف ${title}`,
    saved: (title: string) => `تم حفظ ${title}`,
    editTitle: "تعديل القسم",
    editDescription: "التوجيه والنموذج اللذان ينتجان هذا القسم، وأي إعدادات يحتاجها.",
    name: "العنوان",
    badge: "الوسم",
    prompt: "التوجيه",
    promptHint: "ماذا يعرض هذا القسم؟ اكتبه كتعليمات.",
    model: "النموذج",
    defaultModel: "النموذج الافتراضي",
    settings: "الإعدادات",
    key: "المفتاح",
    value: "القيمة",
    removeSetting: (key: string) => (key ? `حذف الإعداد ${key}` : "حذف الإعداد"),
    addSetting: "إضافة إعداد",
    duplicateKey: (key: string) => `"${key}" مستخدم أكثر من مرة. يجب أن تكون المفاتيح فريدة.`,
    needTitle: "أعطِ القسم عنوانًا.",
    cancel: "إلغاء",
    save: "حفظ",
    emptyContent: "لا شيء لعرضه بعد.",
    emptyTitle: "لا توجد أقسام",
    empty: "أضف قسمًا لبدء بناء هذه الصفحة.",
  },
};

export type SectionBoardLabels = (typeof STRINGS)["en"];

export interface SectionBoardProps extends Omit<ComponentProps<"div">, "onChange" | "children"> {
  sections: readonly BoardSection[];
  /** Called with the whole list after a reorder, an edit or a removal. Without it the board is read only. */
  onChange?: (sections: BoardSection[]) => void;
  /** Edit mode: drag handles, Edit and Remove on every section, the footer with prompt and model. */
  editing?: boolean;
  /** The models offered in the editor. */
  models?: readonly BoardSectionModel[];
  /** Default `1`. Two columns from the `sm` breakpoint. */
  columns?: 1 | 2;
  /** Shows an Add section button in edit mode. */
  onAdd?: () => void;
  /** What a section shows. Default `section.content`. */
  renderContent?: (section: BoardSection) => ReactNode;
  /** Heading level of each section title. Default `h3`. */
  headingAs?: ElementType;
  labels?: Partial<SectionBoardLabels>;
}

const SETTING_ICON_BUTTON = "text-muted-foreground hover:text-nq-danger-text";

/**
 * An ordered set of sections, each produced by a prompt, a model and a few settings. View mode shows only the
 * content; edit mode lets people reorder (drag or arrow keys), edit each section in a dialog and remove it.
 */
export function SectionBoard({
  sections,
  onChange,
  editing = false,
  models = [],
  columns = 1,
  onAdd,
  renderContent,
  headingAs = "h3",
  labels,
  className,
  ...props
}: SectionBoardProps) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const t: SectionBoardLabels = { ...STRINGS[locale.startsWith("ar") ? "ar" : "en"], ...labels };
  const n = (value: number) => formatNumber(value, locale);
  const uid = useId();
  const canEdit = editing && !!onChange;
  const [announcement, setAnnouncement] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const open = sections.find((s) => s.id === editingId) ?? null;
  const modelName = (value?: string) => (value ? (models.find((m) => m.value === value)?.label ?? value) : null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
  );

  const move = (from: number, to: number) => {
    const item = sections[from];
    const target = Math.max(0, Math.min(sections.length - 1, to));
    if (!onChange || !item || target === from) return;
    onChange(moveItem(sections, from, target));
    setAnnouncement(t.moved(item.title, n(target + 1), n(sections.length)));
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = sections.findIndex((s) => s.id === active.id);
    const to = sections.findIndex((s) => s.id === over.id);
    if (from >= 0 && to >= 0) move(from, to);
  };

  const remove = (section: BoardSection) => {
    if (!onChange) return;
    onChange(sections.filter((s) => s.id !== section.id));
    setAnnouncement(t.removed(section.title));
  };

  const save = (next: BoardSection) => {
    if (!onChange) return;
    onChange(sections.map((s) => (s.id === next.id ? next : s)));
    setEditingId(null);
    setAnnouncement(t.saved(next.title));
  };

  const grid = cn("grid gap-3", columns === 2 && "sm:grid-cols-2");

  const cards = sections.map((section, index) => (
    <SectionCard
      key={section.id}
      section={section}
      editing={canEdit}
      reorderable={canEdit && sections.length > 1}
      headingAs={headingAs}
      hintId={`${uid}-hint`}
      modelName={modelName(section.model)}
      content={renderContent ? renderContent(section) : section.content}
      t={t}
      position={n(index + 1)}
      onEdit={() => setEditingId(section.id)}
      onRemove={() => remove(section)}
      onMoveKey={(key) => {
        const target = keyTarget(key, index, sections.length);
        if (target !== null) move(index, target);
      }}
    />
  ));

  return (
    <div data-slot="section-board" data-editing={canEdit || undefined} className={cn("flex min-w-0 flex-col gap-3", className)} {...props}>
      {canEdit ? (
        <p id={`${uid}-hint`} className="sr-only">
          {t.reorderHint}
        </p>
      ) : null}

      {!sections.length ? (
        <EmptyState icon={LayoutList} title={t.emptyTitle} description={t.empty} />
      ) : canEdit ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={sections.map((s) => s.id)} strategy={rectSortingStrategy}>
            <ol aria-label={t.list} className={grid}>
              {cards}
            </ol>
          </SortableContext>
        </DndContext>
      ) : (
        <ol aria-label={t.list} className={grid}>
          {cards}
        </ol>
      )}

      {canEdit && onAdd ? (
        <Button type="button" variant="secondary" className="w-full border-dashed" onClick={onAdd}>
          <Icon icon={Plus} />
          {t.add}
        </Button>
      ) : null}

      <SectionEditor section={open} models={models} t={t} onClose={() => setEditingId(null)} onSave={save} />

      <div aria-live="polite" role="status" className="sr-only">
        {announcement}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ card */

interface SectionCardProps {
  section: BoardSection;
  editing: boolean;
  reorderable: boolean;
  headingAs: ElementType;
  hintId: string;
  modelName: string | null;
  content: ReactNode;
  t: SectionBoardLabels;
  position: string;
  onEdit: () => void;
  onRemove: () => void;
  onMoveKey: (key: string) => void;
}

function SectionCard({ section, editing, reorderable, headingAs: Heading, hintId, modelName, content, t, position, onEdit, onRemove, onMoveKey }: SectionCardProps) {
  const { setNodeRef, setActivatorNodeRef, listeners, transform, transition, isDragging } = useSortable({ id: section.id, disabled: !reorderable });
  const titleId = useId();
  return (
    <li
      ref={editing ? setNodeRef : undefined}
      data-slot="section-board-section"
      data-section={section.id}
      data-dragging={isDragging || undefined}
      aria-labelledby={titleId}
      style={editing ? { transform: CSS.Translate.toString(transform), transition } : undefined}
      className="relative flex min-w-0 flex-col rounded-card border border-border bg-card data-dragging:z-10 data-dragging:border-nq-focus data-dragging:shadow-floating"
    >
      <div className="flex min-h-control items-center gap-1 px-2 pt-2">
        {reorderable ? (
          <Tooltip content={t.reorder(section.title)}>
            <button
              ref={setActivatorNodeRef}
              type="button"
              aria-label={t.reorder(section.title)}
              aria-describedby={hintId}
              aria-keyshortcuts="ArrowUp ArrowDown Home End"
              onKeyDown={(event) => {
                if (["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) {
                  event.preventDefault();
                  const handle = event.currentTarget;
                  onMoveKey(event.key);
                  requestAnimationFrame(() => handle.isConnected && handle.focus());
                }
              }}
              className="inline-flex size-control-sm shrink-0 cursor-grab touch-none items-center justify-center rounded-control text-muted-foreground outline-none hover:bg-nq-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus active:cursor-grabbing [&_svg]:size-4"
              {...listeners}
            >
              <GripVertical aria-hidden />
            </button>
          </Tooltip>
        ) : null}
        <Heading id={titleId} dir="auto" className={cn("min-w-0 flex-1 truncate text-label text-foreground", !reorderable && "ps-2")}>
          {section.title}
        </Heading>
        {editing ? <span className="sr-only">{position}</span> : null}
        {section.badge ? <Badge variant="neutral">{section.badge}</Badge> : null}
        {editing ? (
          <>
            <Tooltip content={t.edit(section.title)}>
              <Button type="button" variant="ghost" size="icon-sm" aria-label={t.edit(section.title)} aria-haspopup="dialog" onClick={onEdit}>
                <Settings2 aria-hidden />
              </Button>
            </Tooltip>
            <Tooltip content={t.remove(section.title)}>
              <Button type="button" variant="ghost" size="icon-sm" aria-label={t.remove(section.title)} onClick={onRemove} className={SETTING_ICON_BUTTON}>
                <Trash2 aria-hidden />
              </Button>
            </Tooltip>
          </>
        ) : null}
      </div>

      <div data-slot="section-board-content" inert={editing || undefined} className="min-w-0 flex-1 px-4 pt-2 pb-4 text-body-sm text-muted-foreground">
        {content ?? <span className="italic">{t.emptyContent}</span>}
      </div>

      {editing && (modelName || section.prompt) ? (
        <div data-slot="section-board-prompt" className="flex min-w-0 items-center gap-2 border-t border-border px-4 py-2 text-caption text-muted-foreground">
          <Sparkles aria-hidden className="size-3.5 shrink-0" />
          {modelName ? (
            <Badge variant="outline" className="shrink-0">
              {modelName}
            </Badge>
          ) : null}
          {section.prompt ? (
            <span dir="auto" className="min-w-0 flex-1 truncate font-mono">
              {section.prompt}
            </span>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

/* ------------------------------------------------------------------ editor */

const DEFAULT_MODEL = "__default__";

interface SectionEditorProps {
  section: BoardSection | null;
  models: readonly BoardSectionModel[];
  t: SectionBoardLabels;
  onClose: () => void;
  onSave: (section: BoardSection) => void;
}

function SectionEditor({ section, models, t, onClose, onSave }: SectionEditorProps) {
  const [draft, setDraft] = useState<BoardSection | null>(section);
  const [rows, setRows] = useState<BoardSettingRow[]>(() => sectionSettingRows(section?.settings));
  const [tried, setTried] = useState(false);
  const formId = useId();

  // A fresh draft each time the dialog opens for a section.
  useEffect(() => {
    setDraft(section);
    setRows(sectionSettingRows(section?.settings));
    setTried(false);
  }, [section]);

  const dupes = duplicateSectionSettingKeys(rows);
  const next: BoardSection | null = draft ? { ...draft, title: draft.title.trim(), settings: sectionSettingsFromRows(rows) } : null;
  const missingTitle = !next?.title;
  const changed = !!(section && next && boardSectionChanged(section, next));
  const items = [{ value: DEFAULT_MODEL, label: t.defaultModel }, ...models.map((m) => ({ value: m.value, label: m.label ?? m.value }))];

  const submit = () => {
    setTried(true);
    if (!next || missingTitle || dupes.size) return;
    onSave(next);
  };

  return (
    <Dialog open={!!section} onOpenChange={(o) => (!o ? onClose() : null)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{section?.title || t.editTitle}</DialogTitle>
          <DialogDescription>{t.editDescription}</DialogDescription>
        </DialogHeader>
        {draft ? (
          <form
            id={formId}
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <div className="grid gap-3 sm:grid-cols-[1fr_10rem]">
              <Field invalid={tried && missingTitle}>
                <FieldLabel>{t.name}</FieldLabel>
                <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.currentTarget.value })} />
                {tried && missingTitle ? (
                  <p role="alert" className="text-caption text-nq-danger-text">
                    {t.needTitle}
                  </p>
                ) : null}
              </Field>
              <Field>
                <FieldLabel>{t.badge}</FieldLabel>
                <Input value={draft.badge ?? ""} onChange={(e) => setDraft({ ...draft, badge: e.currentTarget.value || undefined })} />
              </Field>
            </div>
            <Field>
              <FieldLabel>{t.prompt}</FieldLabel>
              <Textarea dir="auto" rows={4} placeholder={t.promptHint} value={draft.prompt ?? ""} onChange={(e) => setDraft({ ...draft, prompt: e.currentTarget.value || undefined })} />
            </Field>
            <Field>
              <FieldLabel>{t.model}</FieldLabel>
              <Select items={items} value={draft.model ?? DEFAULT_MODEL} onValueChange={(v) => setDraft({ ...draft, model: !v || v === DEFAULT_MODEL ? undefined : String(v) })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {items.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1.5 text-label text-foreground">{t.settings}</legend>
              {rows.map((row, i) => {
                const dupe = dupes.has(row.key.trim());
                return (
                  <div key={i} data-slot="section-board-setting" className="flex items-center gap-2">
                    <Input
                      ltr
                      aria-label={t.key}
                      aria-invalid={dupe || undefined}
                      placeholder={t.key}
                      value={row.key}
                      onChange={(e) => setRows(rows.map((r, j) => (j === i ? { ...r, key: e.currentTarget.value } : r)))}
                    />
                    <Input
                      aria-label={t.value}
                      placeholder={t.value}
                      value={row.value}
                      onChange={(e) => setRows(rows.map((r, j) => (j === i ? { ...r, value: e.currentTarget.value } : r)))}
                    />
                    <Button type="button" variant="ghost" size="icon-sm" aria-label={t.removeSetting(row.key.trim())} className={SETTING_ICON_BUTTON} onClick={() => setRows(rows.filter((_, j) => j !== i))}>
                      <X aria-hidden />
                    </Button>
                  </div>
                );
              })}
              {[...dupes].map((key) => (
                <p key={key} role="alert" className="text-caption text-nq-danger-text">
                  {t.duplicateKey(key)}
                </p>
              ))}
              <Button type="button" variant="ghost" size="sm" className="w-fit" onClick={() => setRows([...rows, { key: "", value: "" }])}>
                <Icon icon={Plus} />
                {t.addSetting}
              </Button>
            </fieldset>
          </form>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            {t.cancel}
          </Button>
          <Button type="submit" form={formId} variant="primary" disabled={!changed || dupes.size > 0}>
            {t.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
