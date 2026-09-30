"use client";

import {
  type Announcements,
  closestCenter,
  DndContext,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { rectSortingStrategy, SortableContext, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, Check, Ellipsis, Expand, GripVertical, LayoutDashboard, MoveDiagonal, Pencil, Pin, PinOff, Plus, RotateCcw, Settings2, Shrink, Trash2 } from "lucide-react";
import { type ComponentProps, type ReactNode, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Badge } from "../badge";
import { Button } from "../button";
import { Card } from "../card";
import { type ContextMenuAction, ContextMenuActions, openContextMenuAt } from "../context-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../dialog";
import { Field, FieldLabel, Input } from "../field";
import { useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { EmptyState, ErrorState, LoadingState } from "../states";
import { Switch } from "../switch";
import {
  BOARD_MAX_COLS,
  BOARD_MAX_ROWS,
  type BoardItem,
  type BoardSettingValue,
  boardColumns,
  moveItem,
  nextItemId,
  normalizeLayout,
  reorderItems,
  resizeFromDelta,
  resizeItem,
  sameLayout,
  togglePin,
} from "./board-math";

const GAP = 16;

const STRINGS = {
  en: {
    region: "Dashboard",
    customise: "Customise",
    customiseHint: "Drag cards to reorder, resize them, pin the ones you always want first.",
    editing: "Editing the dashboard",
    save: "Save",
    saving: "Saving",
    cancel: "Cancel",
    reset: "Reset to default",
    add: "Add widget",
    addTitle: "Add a widget",
    addBody: "Pick a widget to add to the end of the dashboard.",
    alreadyOnBoard: "Already on the dashboard",
    close: "Close",
    saveFailed: "Could not save the dashboard. Your changes are still here, try again.",
    dragHandle: (t: string) => `Drag ${t} to reorder`,
    sortable: "draggable card",
    more: (t: string) => `Actions for ${t}`,
    pinned: "Pinned",
    pin: "Pin to the front",
    unpin: "Unpin",
    wider: "Wider",
    narrower: "Narrower",
    taller: "Taller",
    shorter: "Shorter",
    earlier: "Move earlier",
    later: "Move later",
    settings: "Settings",
    remove: "Remove",
    size: (c: number, r: number) => `${c} by ${r}`,
    sizeLabel: "Size in columns by rows",
    emptyTitle: "This dashboard is empty",
    emptyBody: "Add widgets to see your numbers here.",
    settingsTitle: (t: string) => `${t} settings`,
    settingsBody: "These are saved with your dashboard.",
    settingsSave: "Save settings",
    settingsFailed: "Could not save the settings. Try again.",
    retry: "Try again",
    unavailable: "This widget is not available any more.",
    announce: {
      pickedUp: (t: string, n: number, total: number) => `Picked up ${t}. Position ${n} of ${total}. Use the arrow keys to move, Space to drop, Escape to cancel.`,
      over: (t: string, n: number, total: number) => `${t} is now at position ${n} of ${total}.`,
      dropped: (t: string, n: number, total: number) => `Dropped ${t} at position ${n} of ${total}.`,
      cancelled: (t: string) => `Cancelled. ${t} went back.`,
      resized: (t: string, c: number, r: number) => `${t} is now ${c} by ${r}.`,
      pinned: (t: string) => `${t} pinned.`,
      unpinned: (t: string) => `${t} unpinned.`,
      removed: (t: string) => `${t} removed.`,
      added: (t: string) => `${t} added.`,
    },
    instructions: "To reorder, focus the drag handle and press Space, then use the arrow keys. Or open the actions menu and choose Move earlier or Move later.",
  },
  ar: {
    region: "لوحة المعلومات",
    customise: "تخصيص",
    customiseHint: "اسحب البطاقات لإعادة ترتيبها، وغيّر أحجامها، وثبّت ما تريده في المقدمة دائمًا.",
    editing: "تعديل لوحة المعلومات",
    save: "حفظ",
    saving: "جارٍ الحفظ",
    cancel: "إلغاء",
    reset: "استعادة الافتراضي",
    add: "إضافة عنصر",
    addTitle: "إضافة عنصر",
    addBody: "اختر عنصرًا لإضافته في نهاية اللوحة.",
    alreadyOnBoard: "موجود في اللوحة",
    close: "إغلاق",
    saveFailed: "تعذّر حفظ اللوحة. تغييراتك ما زالت هنا، حاول مرة أخرى.",
    dragHandle: (t: string) => `اسحب ${t} لإعادة الترتيب`,
    sortable: "بطاقة قابلة للسحب",
    more: (t: string) => `إجراءات ${t}`,
    pinned: "مثبّتة",
    pin: "تثبيت في المقدمة",
    unpin: "إلغاء التثبيت",
    wider: "أعرض",
    narrower: "أضيق",
    taller: "أطول",
    shorter: "أقصر",
    earlier: "تقديم",
    later: "تأخير",
    settings: "الإعدادات",
    remove: "إزالة",
    size: (c: number, r: number) => `${c} في ${r}`,
    sizeLabel: "الحجم بالأعمدة في الصفوف",
    emptyTitle: "اللوحة فارغة",
    emptyBody: "أضف عناصر لعرض أرقامك هنا.",
    settingsTitle: (t: string) => `إعدادات ${t}`,
    settingsBody: "تُحفظ هذه مع لوحتك.",
    settingsSave: "حفظ الإعدادات",
    settingsFailed: "تعذّر حفظ الإعدادات. حاول مرة أخرى.",
    retry: "إعادة المحاولة",
    unavailable: "هذا العنصر لم يعد متاحًا.",
    announce: {
      pickedUp: (t: string, n: number, total: number) => `تم التقاط ${t}. الموضع ${n} من ${total}. استخدم الأسهم للنقل، ومفتاح المسافة للإفلات، وEscape للإلغاء.`,
      over: (t: string, n: number, total: number) => `${t} الآن في الموضع ${n} من ${total}.`,
      dropped: (t: string, n: number, total: number) => `تم إفلات ${t} في الموضع ${n} من ${total}.`,
      cancelled: (t: string) => `أُلغي. عاد ${t} إلى مكانه.`,
      resized: (t: string, c: number, r: number) => `أصبح حجم ${t} ${c} في ${r}.`,
      pinned: (t: string) => `تم تثبيت ${t}.`,
      unpinned: (t: string) => `أُلغي تثبيت ${t}.`,
      removed: (t: string) => `أُزيل ${t}.`,
      added: (t: string) => `أُضيف ${t}.`,
    },
    instructions: "لإعادة الترتيب، ركّز على مقبض السحب واضغط المسافة ثم استخدم الأسهم. أو افتح قائمة الإجراءات واختر تقديم أو تأخير.",
  },
};

export type DashboardBoardLabels = typeof STRINGS.en;

export type { BoardItem, BoardSettingValue };

export type BoardSettingField =
  | { key: string; label: string; type: "select"; options: readonly { value: string; label: string }[] }
  | { key: string; label: string; type: "number"; min?: number; max?: number; step?: number }
  | { key: string; label: string; type: "toggle" }
  | { key: string; label: string; type: "text"; placeholder?: string };

export interface DashboardWidgetContext {
  /** The item's id on the board. */
  id: string;
  settings: Record<string, BoardSettingValue>;
  /** Columns and rows the card spans now (columns are capped by what the screen fits). */
  cols: number;
  rows: number;
  /** True while the board is being edited. Widgets are inert then. */
  editing: boolean;
}

export interface DashboardWidgetDef {
  /** Stable key saved in the layout. */
  type: string;
  title: string;
  description?: string;
  /** Size when added from the catalogue. Defaults to the minimum. */
  defaultCols?: number;
  defaultRows?: number;
  minCols?: number;
  maxCols?: number;
  minRows?: number;
  maxRows?: number;
  /** Only one on the board. */
  unique?: boolean;
  /** Settings the user can change. No fields means no Settings action. */
  fields?: readonly BoardSettingField[];
  defaultSettings?: Record<string, BoardSettingValue>;
  render: (ctx: DashboardWidgetContext) => ReactNode;
}

export interface DashboardBoardProps extends Omit<ComponentProps<"section">, "onChange" | "children" | "title"> {
  widgets: readonly DashboardWidgetDef[];
  /** The saved layout. Unknown widget types and repeated ids are dropped, spans are clamped. */
  layout: readonly BoardItem[];
  /** Saves the layout. Reject to keep the editor open with an error. Update `layout` when it resolves. */
  onSave: (layout: BoardItem[]) => void | Promise<void>;
  /** What Reset to default goes back to. Without it there is no Reset. */
  defaultLayout?: readonly BoardItem[];
  editing?: boolean;
  defaultEditing?: boolean;
  onEditingChange?: (editing: boolean) => void;
  /** Height of one grid row, in pixels. Default 200. */
  rowHeight?: number;
  /** A heading shown above the toolbar. */
  title?: ReactNode;
  loading?: boolean;
  error?: boolean | string;
  onRetry?: () => void;
  labels?: Partial<DashboardBoardLabels>;
}

type Limits = { minCols: number; maxCols: number; minRows: number; maxRows: number };

const limitsOf = (def?: DashboardWidgetDef): Limits => ({
  minCols: def?.minCols ?? 1,
  maxCols: def?.maxCols ?? BOARD_MAX_COLS,
  minRows: def?.minRows ?? 1,
  maxRows: def?.maxRows ?? BOARD_MAX_ROWS,
});

const settingsOf = (def: DashboardWidgetDef | undefined, item: BoardItem): Record<string, BoardSettingValue> => ({ ...def?.defaultSettings, ...item.settings });

export function DashboardBoard({
  widgets,
  layout,
  onSave,
  defaultLayout,
  editing: editingProp,
  defaultEditing = false,
  onEditingChange,
  rowHeight = 200,
  title,
  loading,
  error,
  onRetry,
  labels,
  className,
  ...props
}: DashboardBoardProps) {
  const t = useAnalyticsLabels(STRINGS, labels);
  const isRtl = useOptionalNasaq()?.isRtl ?? false;
  const dndId = useId();
  const [innerEditing, setInnerEditing] = useState(defaultEditing);
  const editing = editingProp ?? innerEditing;
  const setEditing = (next: boolean) => {
    setInnerEditing(next);
    onEditingChange?.(next);
  };

  const defs = useMemo(() => new Map(widgets.map((w) => [w.type, w])), [widgets]);
  const saved = useMemo(() => normalizeLayout(layout, widgets.map((w) => ({ type: w.type, ...limitsOf(w) }))), [layout, widgets]);
  const [draft, setDraft] = useState<BoardItem[] | null>(null);
  const items = editing ? (draft ?? saved) : saved;
  const dirty = editing && draft !== null && !sameLayout(draft, saved);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [adding, setAdding] = useState(false);
  const [settingsFor, setSettingsFor] = useState<string | null>(null);
  const [live, setLive] = useState("");
  const [preview, setPreview] = useState<{ id: string; cols: number; rows: number } | null>(null);

  // The grid decides how many columns fit its own width, not the window.
  const gridRef = useRef<HTMLUListElement>(null);
  const [width, setWidth] = useState(1200);
  useLayoutEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    setWidth(el.clientWidth || 1200);
    const ro = new ResizeObserver(([entry]) => entry && setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [loading, error, items.length === 0]);
  const columns = boardColumns(width);
  const cellWidth = (width - GAP * (columns - 1)) / columns + GAP;
  const cellHeight = rowHeight + GAP;

  useEffect(() => {
    if (!editing) {
      setDraft(null);
      setSaveError(false);
    }
  }, [editing]);

  const startEditing = () => {
    setDraft(saved);
    setEditing(true);
  };
  const change = (next: BoardItem[]) => {
    setDraft(next);
    setSaveError(false);
  };
  const titleOf = (id: string) => {
    const item = items.find((i) => i.id === id);
    return (item && defs.get(item.type)?.title) ?? id;
  };

  const save = async () => {
    if (!draft || saving) return;
    setSaving(true);
    setSaveError(false);
    try {
      await onSave(draft);
      setEditing(false);
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const isResize = (id: unknown) => String(id).startsWith("resize:");
  const realId = (id: unknown) => String(id).replace(/^resize:/, "");

  const onDragMove = (e: DragMoveEvent) => {
    if (!isResize(e.active.id)) return;
    const item = items.find((i) => i.id === realId(e.active.id));
    if (!item) return;
    const next = resizeFromDelta(item, e.delta, { width: cellWidth, height: cellHeight }, limitsOf(defs.get(item.type)), isRtl);
    // Width only changes on a four column board; narrower boards cap the span, so keep the saved one.
    const cols = columns === 4 ? next.cols : item.cols;
    setPreview((p) => (p && p.id === item.id && p.cols === cols && p.rows === next.rows ? p : { id: item.id, cols, rows: next.rows }));
  };
  const onDragEnd = (e: DragEndEvent) => {
    if (isResize(e.active.id)) {
      const p = preview;
      setPreview(null);
      if (p) {
        change(resizeItem(items, p.id, p.cols, p.rows, limitsOf(defs.get(items.find((i) => i.id === p.id)?.type ?? ""))));
        setLive(t.announce.resized(titleOf(p.id), p.cols, p.rows));
      }
      return;
    }
    if (e.over && e.over.id !== e.active.id) change(reorderItems(items, String(e.active.id), String(e.over.id)));
  };
  const onDragStart = (_e: DragStartEvent) => setPreview(null);

  const position = (id: unknown) => items.findIndex((i) => i.id === String(id)) + 1;
  const announcements: Announcements = {
    onDragStart: ({ active }) => (isResize(active.id) ? undefined : t.announce.pickedUp(titleOf(String(active.id)), position(active.id), items.length)),
    onDragOver: ({ active, over }) => (isResize(active.id) || !over ? undefined : t.announce.over(titleOf(String(active.id)), position(over.id), items.length)),
    onDragEnd: ({ active, over }) => (isResize(active.id) ? undefined : t.announce.dropped(titleOf(String(active.id)), over ? position(over.id) : position(active.id), items.length)),
    onDragCancel: ({ active }) => (isResize(active.id) ? undefined : t.announce.cancelled(titleOf(String(active.id)))),
  };

  const resizeBy = (item: BoardItem, dc: number, dr: number) => {
    const next = resizeItem(items, item.id, item.cols + dc, item.rows + dr, limitsOf(defs.get(item.type)));
    change(next);
    const now = next.find((i) => i.id === item.id);
    if (now) setLive(t.announce.resized(titleOf(item.id), now.cols, now.rows));
  };
  const addWidget = (def: DashboardWidgetDef) => {
    const lim = limitsOf(def);
    const item: BoardItem = {
      id: nextItemId(items, def.type),
      type: def.type,
      cols: Math.min(Math.max(def.defaultCols ?? lim.minCols, lim.minCols), lim.maxCols),
      rows: Math.min(Math.max(def.defaultRows ?? lim.minRows, lim.minRows), lim.maxRows),
      ...(def.defaultSettings ? { settings: { ...def.defaultSettings } } : {}),
    };
    change([...items, item]);
    setLive(t.announce.added(def.title));
    setAdding(false);
  };

  const menuFor = (item: BoardItem): ContextMenuAction[] => {
    const def = defs.get(item.type);
    const lim = limitsOf(def);
    const idx = items.findIndex((i) => i.id === item.id);
    const group = items.filter((i) => !!i.pinned === !!item.pinned);
    const gi = group.findIndex((i) => i.id === item.id);
    const out: ContextMenuAction[] = [];
    if (editing) {
      out.push(
        { id: "wider", label: t.wider, icon: <Expand />, disabled: item.cols >= lim.maxCols, group: "size", onSelect: () => resizeBy(item, 1, 0) },
        { id: "narrower", label: t.narrower, icon: <Shrink />, disabled: item.cols <= lim.minCols, group: "size", onSelect: () => resizeBy(item, -1, 0) },
        { id: "taller", label: t.taller, icon: <Expand />, disabled: item.rows >= lim.maxRows, group: "size", onSelect: () => resizeBy(item, 0, 1) },
        { id: "shorter", label: t.shorter, icon: <Shrink />, disabled: item.rows <= lim.minRows, group: "size", onSelect: () => resizeBy(item, 0, -1) },
        { id: "earlier", label: t.earlier, icon: <ArrowUp />, disabled: gi <= 0, group: "order", onSelect: () => change(moveItem(items, item.id, -1)) },
        { id: "later", label: t.later, icon: <ArrowDown />, disabled: gi < 0 || gi >= group.length - 1 || idx < 0, group: "order", onSelect: () => change(moveItem(items, item.id, 1)) },
        {
          id: "pin",
          label: item.pinned ? t.unpin : t.pin,
          icon: item.pinned ? <PinOff /> : <Pin />,
          group: "order",
          onSelect: () => {
            change(togglePin(items, item.id));
            setLive(item.pinned ? t.announce.unpinned(titleOf(item.id)) : t.announce.pinned(titleOf(item.id)));
          },
        },
      );
    }
    if (def?.fields?.length) out.push({ id: "settings", label: t.settings, icon: <Settings2 />, group: "item", onSelect: () => setSettingsFor(item.id) });
    if (editing)
      out.push({
        id: "remove",
        label: t.remove,
        icon: <Trash2 />,
        danger: true,
        group: "danger",
        onSelect: () => {
          setLive(t.announce.removed(titleOf(item.id)));
          change(items.filter((i) => i.id !== item.id));
        },
      });
    return out;
  };

  const settingsItem = settingsFor ? items.find((i) => i.id === settingsFor) : undefined;
  const saveSettings = async (values: Record<string, BoardSettingValue>) => {
    if (!settingsItem) return;
    const next = items.map((i) => (i.id === settingsItem.id ? { ...i, settings: values } : i));
    if (editing) {
      change(next);
    } else {
      await onSave(next);
    }
    setSettingsFor(null);
  };

  const body = error ? (
    <ErrorState title={typeof error === "string" ? error : undefined} actions={onRetry ? <Button onClick={onRetry}>{t.retry}</Button> : undefined} />
  ) : loading ? (
    <LoadingState rows={4} />
  ) : items.length === 0 ? (
    <EmptyState
      icon={LayoutDashboard}
      title={t.emptyTitle}
      description={t.emptyBody}
      actions={
        editing ? (
          <Button onClick={() => setAdding(true)}>
            <Plus aria-hidden /> {t.add}
          </Button>
        ) : (
          <Button onClick={startEditing}>
            <Pencil aria-hidden /> {t.customise}
          </Button>
        )
      }
    />
  ) : (
    <DndContext
      id={dndId}
      sensors={sensors}
      collisionDetection={closestCenter}
      accessibility={{ announcements, screenReaderInstructions: { draggable: t.instructions } }}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      onDragCancel={() => setPreview(null)}
    >
      <SortableContext items={items.map((i) => i.id)} strategy={rectSortingStrategy}>
        <ul
          ref={gridRef}
          aria-label={t.region}
          className="grid w-full list-none p-0"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gridAutoRows: `${rowHeight}px`, gap: GAP }}
        >
          {items.map((item, index) => {
            const def = defs.get(item.type);
            const shown = preview?.id === item.id ? { ...item, cols: preview.cols, rows: preview.rows } : item;
            return (
              <BoardCard
                key={item.id}
                item={shown}
                def={def}
                editing={editing}
                columns={columns}
                index={index}
                t={t}
                menu={menuFor(item)}
                onTogglePin={() => {
                  change(togglePin(items, item.id));
                  setLive(item.pinned ? t.announce.unpinned(titleOf(item.id)) : t.announce.pinned(titleOf(item.id)));
                }}
                onOpenSettings={() => setSettingsFor(item.id)}
              />
            );
          })}
        </ul>
      </SortableContext>
    </DndContext>
  );

  return (
    <section data-slot="dashboard-board" aria-label={t.region} className={cn("flex w-full min-w-0 flex-col gap-4", className)} {...props}>
      <div className="flex flex-wrap items-center gap-3">
        {title ? <h2 className="me-auto text-h3 font-semibold">{title}</h2> : <span className="me-auto" />}
        {editing ? (
          <>
            <Badge variant="brand">{t.editing}</Badge>
            <Button variant="secondary" onClick={() => setAdding(true)} disabled={saving}>
              <Plus aria-hidden /> {t.add}
            </Button>
            {defaultLayout ? (
              <Button variant="ghost" onClick={() => change(normalizeLayout(defaultLayout, widgets.map((w) => ({ type: w.type, ...limitsOf(w) }))))} disabled={saving}>
                <RotateCcw aria-hidden /> {t.reset}
              </Button>
            ) : null}
            <Button
              variant="ghost"
              onClick={() => {
                setEditing(false);
              }}
              disabled={saving}
            >
              {t.cancel}
            </Button>
            <Button onClick={() => void save()} loading={saving} disabled={!dirty}>
              <Check aria-hidden /> {saving ? t.saving : t.save}
            </Button>
          </>
        ) : (
          <Button variant="secondary" onClick={startEditing} disabled={!!loading || !!error}>
            <Pencil aria-hidden /> {t.customise}
          </Button>
        )}
      </div>
      {editing ? <p className="text-body-sm text-muted-foreground">{t.customiseHint}</p> : null}
      {saveError ? (
        <p role="alert" className="text-body-sm text-danger">
          {t.saveFailed}
        </p>
      ) : null}
      {body}
      <p role="status" aria-live="polite" className="sr-only">
        {live}
      </p>

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent closeLabel={t.close}>
          <DialogHeader>
            <DialogTitle>{t.addTitle}</DialogTitle>
            <DialogDescription>{t.addBody}</DialogDescription>
          </DialogHeader>
          <ul className="flex flex-col divide-y divide-border rounded-control border border-border">
            {widgets.map((w) => {
              const taken = !!w.unique && items.some((i) => i.type === w.type);
              return (
                <li key={w.type} className="flex items-center gap-3 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-body font-medium">{w.title}</p>
                    {w.description ? <p className="text-caption text-muted-foreground">{w.description}</p> : null}
                    {taken ? <p className="text-caption text-muted-foreground">{t.alreadyOnBoard}</p> : null}
                  </div>
                  <Button size="sm" variant="secondary" disabled={taken} aria-label={`${t.add}: ${w.title}`} onClick={() => addWidget(w)}>
                    <Plus aria-hidden /> {t.add}
                  </Button>
                </li>
              );
            })}
          </ul>
        </DialogContent>
      </Dialog>

      {settingsItem ? (
        <BoardSettingsDialog
          key={settingsItem.id}
          def={defs.get(settingsItem.type)}
          initial={settingsOf(defs.get(settingsItem.type), settingsItem)}
          t={t}
          onClose={() => setSettingsFor(null)}
          onSave={saveSettings}
        />
      ) : null}
    </section>
  );
}

/* ---------------------------------------------------------------------------------------------- card */

interface BoardCardProps {
  item: BoardItem;
  def?: DashboardWidgetDef;
  editing: boolean;
  columns: number;
  index: number;
  t: DashboardBoardLabels;
  menu: ContextMenuAction[];
  onTogglePin: () => void;
  onOpenSettings: () => void;
}

function BoardCard({ item, def, editing, columns, t, menu, onTogglePin, onOpenSettings }: BoardCardProps) {
  const sortable = useSortable({ id: item.id, disabled: !editing });
  const resize = useDraggable({ id: `resize:${item.id}`, disabled: !editing });
  const title = def?.title ?? item.id;
  const span = Math.min(item.cols, columns);
  const style = {
    gridColumn: `span ${span}`,
    gridRow: `span ${item.rows}`,
    transform: CSS.Translate.toString(sortable.transform),
    transition: sortable.transition,
    zIndex: sortable.isDragging || resize.isDragging ? 20 : undefined,
  };
  const { attributes, listeners } = sortable;

  return (
    <li ref={sortable.setNodeRef} style={style} className={cn("min-w-0", sortable.isDragging && "opacity-80")}>
      <ContextMenuActions actions={menu} render={<div data-slot="dashboard-board-card" className="relative h-full w-full" />} focusTarget={(el) => el.querySelector<HTMLElement>("[data-board-more]")}>
        <Card className={cn("h-full w-full gap-0 overflow-hidden py-0", editing && "border-dashed ring-1 ring-border", resize.isDragging && "ring-2 ring-ring")}>
          <div className="flex min-h-11 items-center gap-2 border-b border-border px-3 py-1.5">
            {editing ? (
              <button
                type="button"
                ref={sortable.setActivatorNodeRef}
                {...attributes}
                {...listeners}
                aria-roledescription={t.sortable}
                aria-label={t.dragHandle(title)}
                className="-ms-1 flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-control text-muted-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
              >
                <GripVertical aria-hidden className="size-4" />
              </button>
            ) : null}
            <h3 className="min-w-0 flex-1 truncate text-body-sm font-medium">{title}</h3>
            {item.pinned ? <Pin role="img" aria-label={t.pinned} className="size-3.5 shrink-0 text-muted-foreground" /> : null}
            {editing ? (
              <span dir="ltr" className="shrink-0 text-caption tabular-nums text-muted-foreground" role="img" aria-label={`${t.sizeLabel}: ${t.size(item.cols, item.rows)}`}>
                {item.cols}×{item.rows}
              </span>
            ) : null}
            {editing ? (
              <Button variant="ghost" size="icon-sm" aria-pressed={!!item.pinned} aria-label={item.pinned ? t.unpin : t.pin} onClick={onTogglePin}>
                {item.pinned ? <PinOff aria-hidden /> : <Pin aria-hidden />}
              </Button>
            ) : null}
            {menu.length > 0 ? (
              <Button
                variant="ghost"
                size="icon-sm"
                data-board-more=""
                aria-label={menu.length === 1 && menu[0]?.id === "settings" ? `${t.settings}: ${title}` : t.more(title)}
                onClick={(e) => (menu.length === 1 && menu[0]?.id === "settings" ? onOpenSettings() : openContextMenuAt(e.currentTarget.closest<HTMLElement>('[data-slot="dashboard-board-card"]') as HTMLElement))}
              >
                {menu.length === 1 && menu[0]?.id === "settings" ? <Settings2 aria-hidden /> : <Ellipsis aria-hidden />}
              </Button>
            ) : null}
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-3" inert={editing}>
            {def ? def.render({ id: item.id, settings: settingsOf(def, item), cols: span, rows: item.rows, editing }) : <p className="text-body-sm text-muted-foreground">{t.unavailable}</p>}
          </div>
        </Card>
        {editing ? (
          <button
            type="button"
            ref={resize.setNodeRef}
            {...resize.listeners}
            tabIndex={-1}
            aria-hidden
            className="absolute bottom-1 end-1 z-10 flex size-6 cursor-nwse-resize touch-none items-center justify-center rounded-control text-muted-foreground hover:bg-muted rtl:cursor-nesw-resize"
          >
            <MoveDiagonal aria-hidden className="size-4 rtl:-scale-x-100" />
          </button>
        ) : null}
      </ContextMenuActions>
    </li>
  );
}

/* -------------------------------------------------------------------------------------- settings */

interface BoardSettingsDialogProps {
  def?: DashboardWidgetDef;
  initial: Record<string, BoardSettingValue>;
  t: DashboardBoardLabels;
  onClose: () => void;
  onSave: (values: Record<string, BoardSettingValue>) => void | Promise<void>;
}

function BoardSettingsDialog({ def, initial, t, onClose, onSave }: BoardSettingsDialogProps) {
  const [values, setValues] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const set = useCallback((key: string, value: BoardSettingValue) => setValues((v) => ({ ...v, [key]: value })), []);
  const base = useId();

  const submit = async () => {
    setBusy(true);
    setFailed(false);
    try {
      await onSave(values);
    } catch {
      setFailed(true);
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent closeLabel={t.close}>
        <DialogHeader>
          <DialogTitle>{t.settingsTitle(def?.title ?? "")}</DialogTitle>
          <DialogDescription>{t.settingsBody}</DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          {def?.fields?.map((f) => {
            const id = `${base}-${f.key}`;
            const value = values[f.key];
            if (f.type === "toggle")
              return (
                <div key={f.key} className="flex items-center justify-between gap-3">
                  <span id={id} className="text-body">
                    {f.label}
                  </span>
                  <Switch checked={value === true} aria-labelledby={id} onCheckedChange={(v) => set(f.key, v)} />
                </div>
              );
            if (f.type === "select")
              return (
                <div key={f.key} className="grid gap-1.5">
                  <span id={id} className="text-label font-medium">
                    {f.label}
                  </span>
                  <Select items={f.options.map((o) => ({ value: o.value, label: o.label }))} value={String(value ?? "")} onValueChange={(v) => v !== null && set(f.key, String(v))}>
                    <SelectTrigger aria-labelledby={id}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {f.options.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            return (
              <Field key={f.key}>
                <FieldLabel>{f.label}</FieldLabel>
                {f.type === "number" ? (
                  <Input type="number" inputMode="numeric" ltr min={f.min} max={f.max} step={f.step} value={String(value ?? "")} onChange={(e) => set(f.key, e.target.value === "" ? "" : Number(e.target.value))} />
                ) : (
                  <Input value={String(value ?? "")} placeholder={f.placeholder} onChange={(e) => set(f.key, e.target.value)} />
                )}
              </Field>
            );
          })}
          {failed ? (
            <p role="alert" className="text-body-sm text-danger">
              {t.settingsFailed}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
              {t.cancel}
            </Button>
            <Button type="submit" loading={busy}>
              {t.settingsSave}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
