"use client";

import { closestCenter, DndContext, type DragEndEvent, MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { rectSortingStrategy, SortableContext, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowLeft, ArrowRight, Bookmark, Columns2, Copy, Heading1, Image as ImageIcon, List, type LucideIcon, Play, Plus, Presentation, Quote, Square, Trash2 } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { Badge } from "../badge";
import { Button } from "../button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../dropdown-menu";
import { Field, FieldLabel, Input, Textarea } from "../field";
import { Icon } from "../icon";
import { formatNumber } from "../numeric";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { EmptyState } from "../states";
import { Toggle, ToggleGroup } from "../toggle-group";
import { Tooltip } from "../tooltip";
import { DeckPlayer } from "./deck-player";
import {
  type Deck,
  duplicateSlide,
  insertSlide,
  moveSlide,
  newSlide,
  notesCount,
  removeSlide,
  SLIDE_LAYOUTS,
  SLIDE_THEMES,
  type Slide,
  type SlideLayout,
  type SlideTheme,
  slideTitle,
} from "./presentation-math";
import { type PresentationLabels, type PresentationText, usePresentationStrings } from "./presentation-strings";
import { SlideView } from "./slide-view";

export type { Deck, Slide, SlideLayout, SlideTheme } from "./presentation-math";
export type { PresentationLabels } from "./presentation-strings";
export { DeckPlayer, type DeckPlayerProps } from "./deck-player";
export { SlideView, type SlideViewProps } from "./slide-view";

export interface PresentationEditorProps {
  /** Controlled deck. */
  value?: Deck;
  defaultValue?: Deck;
  onValueChange?: (deck: Deck) => void;
  /** Persist the deck. Return `{ error }` to show why it failed. Adds a Save button and the unsaved-changes state. */
  onSave?: (deck: Deck) => Promise<void | { error?: string }>;
  /** Called by Present. Without it the editor opens its own `DeckPlayer`. */
  onPresent?: (deck: Deck, startIndex: number) => void;
  /** Look at slides and play them, but change nothing. */
  readOnly?: boolean;
  labels?: PresentationLabels;
  className?: string;
}

const LAYOUT_ICON: Record<SlideLayout, LucideIcon> = {
  title: Heading1,
  section: Bookmark,
  content: List,
  "two-column": Columns2,
  quote: Quote,
  image: ImageIcon,
  blank: Square,
};

const layoutKey = (layout: SlideLayout, t: PresentationText) =>
  ({ title: t.layoutTitle, section: t.layoutSection, content: t.layoutContent, "two-column": t.layoutTwoColumn, quote: t.layoutQuote, image: t.layoutImage, blank: t.layoutBlank })[layout];
const themeLabel = (theme: SlideTheme, t: PresentationText) => ({ light: t.themeLight, dark: t.themeDark, brand: t.themeBrand })[theme];

function Thumb({ slide, index, active, name, position, onSelect }: { slide: Slide; index: number; active: boolean; name: string; position: string; onSelect: () => void }) {
  const { setNodeRef, listeners, attributes, transform, transition, isDragging } = useSortable({ id: slide.id });
  // dnd-kit adds role/tabindex for its own keyboard sensor, which is not enabled here: keep the button as the one tab stop.
  const { role: _role, tabIndex: _tab, ...rest } = attributes;
  void _role;
  void _tab;
  return (
    <li
      ref={setNodeRef}
      data-slide-id={slide.id}
      data-dragging={isDragging || undefined}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className="relative w-36 shrink-0 data-dragging:z-10 lg:w-full"
      {...rest}
      {...listeners}
    >
      <button
        type="button"
        aria-current={active ? "true" : undefined}
        aria-label={`${position}. ${name}`}
        data-index={index}
        onClick={onSelect}
        className={cn(
          "group flex w-full items-start gap-2 rounded-control p-1.5 text-start outline-none",
          "focus-visible:outline-2 focus-visible:outline-nq-focus",
          active ? "bg-nq-selected" : "hover:bg-nq-hover",
        )}
      >
        <span className="w-4 shrink-0 pt-0.5 text-caption text-muted-foreground tabular-nums">{position}</span>
        <span className={cn("block min-w-0 flex-1 overflow-hidden rounded-[6px] border", active ? "border-primary" : "border-border")}>
          <SlideView slide={slide} decorative className="pointer-events-none" />
        </span>
      </button>
    </li>
  );
}

/**
 * A slide deck editor: a rail of thumbnails you can drag to reorder, an in-place editing canvas, a layout and theme
 * inspector, presenter notes, and Present, which plays the deck in a full-screen `DeckPlayer`. Nine layouts cover
 * titles, sections, bullets, two columns, quotes and images. Text is edited right on the slide.
 */
export function PresentationEditor({ value: valueProp, defaultValue, onValueChange, onSave, onPresent, readOnly = false, labels, className }: PresentationEditorProps) {
  const { locale, t } = usePresentationStrings(labels);
  const n = (v: number) => formatNumber(v, locale);
  const uid = useId();

  const [inner, setInner] = useState<Deck>(defaultValue ?? valueProp ?? { title: "", slides: [] });
  const deck = valueProp ?? inner;
  const [saved, setSaved] = useState(deck);
  const dirty = saved !== deck;
  const [saveState, setSaveState] = useState<{ status: "idle" | "saving" | "error"; message?: string }>({ status: "idle" });
  const [selectedId, setSelectedId] = useState<string | undefined>(deck.slides[0]?.id);
  const [playing, setPlaying] = useState(false);
  const [announce, setAnnounce] = useState("");
  const focusSlide = useRef<string | null>(null);
  const root = useRef<HTMLDivElement>(null);

  const index = Math.max(0, deck.slides.findIndex((s) => s.id === selectedId));
  const slide = deck.slides[index];
  const editable = !readOnly;

  const commit = (next: Deck) => {
    if (valueProp === undefined) setInner(next);
    onValueChange?.(next);
    if (saveState.status === "error") setSaveState({ status: "idle" });
  };
  const patchSlide = (patch: Partial<Slide>) => {
    if (!slide) return;
    commit({ ...deck, slides: deck.slides.map((s) => (s.id === slide.id ? { ...s, ...patch } : s)) });
  };

  useEffect(() => {
    if (!slide && deck.slides[0]) setSelectedId(deck.slides[0].id);
  }, [slide, deck.slides]);

  // After adding or duplicating, scroll the new thumbnail into view.
  useEffect(() => {
    const id = focusSlide.current;
    if (!id) return;
    focusSlide.current = null;
    root.current?.querySelector<HTMLElement>(`[data-slide-id="${globalThis.CSS.escape(id)}"]`)?.scrollIntoView({ block: "nearest", inline: "nearest" });
  });

  const addSlide = (layout: SlideLayout) => {
    const s = newSlide(layout);
    commit({ ...deck, slides: insertSlide(deck.slides, slide ? index + 1 : 0, s) });
    setSelectedId(s.id);
    focusSlide.current = s.id;
    setAnnounce(t.added);
  };
  const duplicate = () => {
    if (!slide) return;
    const s = duplicateSlide(slide);
    commit({ ...deck, slides: insertSlide(deck.slides, index + 1, s) });
    setSelectedId(s.id);
    focusSlide.current = s.id;
  };
  const remove = () => {
    if (!slide) return;
    const next = removeSlide(deck.slides, index);
    commit({ ...deck, slides: next });
    setSelectedId(next[Math.min(index, next.length - 1)]?.id);
    setAnnounce(t.deleted);
  };
  const move = (from: number, to: number) => {
    const target = Math.max(0, Math.min(deck.slides.length - 1, to));
    if (target === from) return;
    commit({ ...deck, slides: moveSlide(deck.slides, from, target) });
    setAnnounce(t.moved(n(target + 1)));
  };

  const sensors = useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 5 } }), useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }));
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = deck.slides.findIndex((s) => s.id === active.id);
    const to = deck.slides.findIndex((s) => s.id === over.id);
    if (from >= 0 && to >= 0) move(from, to);
  };

  const save = async () => {
    if (!onSave) return;
    setSaveState({ status: "saving" });
    try {
      const result = await onSave(deck);
      if (result && result.error) return setSaveState({ status: "error", message: result.error });
      setSaved(deck);
      setSaveState({ status: "idle" });
    } catch (error) {
      setSaveState({ status: "error", message: error instanceof Error ? error.message : t.saveFailed });
    }
  };

  const present = () => (onPresent ? onPresent(deck, index) : setPlaying(true));
  const ids = useMemo(() => deck.slides.map((s) => s.id), [deck.slides]);
  const withNotes = notesCount(deck);

  const status = !onSave ? null : saveState.status === "saving" ? (
    <Badge variant="info">{t.saving}</Badge>
  ) : saveState.status === "error" ? (
    <Badge variant="danger" role="alert">{saveState.message ?? t.saveFailed}</Badge>
  ) : dirty ? (
    <Badge variant="warning">{t.unsaved}</Badge>
  ) : (
    <Badge variant="success">{t.saved}</Badge>
  );

  const rail = (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={rectSortingStrategy}>
        <ol aria-label={t.slides} aria-describedby={`${uid}-hint`} className="flex gap-1 lg:flex-col">
          {deck.slides.map((s, i) => (
            <Thumb key={s.id} slide={s} index={i} active={s.id === slide?.id} name={slideTitle(s, t.untitled)} position={n(i + 1)} onSelect={() => setSelectedId(s.id)} />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );

  return (
    <div ref={root} data-slot="presentation-editor" role="group" aria-label={t.editor} className={cn("flex min-w-0 flex-col gap-3", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          aria-label={t.deckTitle}
          placeholder={t.deckTitlePlaceholder}
          value={deck.title}
          readOnly={!editable}
          dir="auto"
          onChange={(e) => commit({ ...deck, title: e.currentTarget.value })}
          className="min-w-40 flex-1 text-label sm:max-w-sm"
        />
        <span className="text-caption text-muted-foreground">
          {t.slideCount(n(deck.slides.length))}
          {withNotes ? ` · ${t.notesCount(n(withNotes))}` : ""}
        </span>
        <div className="ms-auto flex flex-wrap items-center gap-2">
          {status}
          {editable ? (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button size="sm" />}>
                  <Plus aria-hidden />
                  {t.addSlide}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-44">
                  {SLIDE_LAYOUTS.map((layout) => (
                    <DropdownMenuItem key={layout} onClick={() => addSlide(layout)}>
                      <Icon icon={LAYOUT_ICON[layout]} />
                      {layoutKey(layout, t)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Tooltip content={t.duplicate}>
                <Button size="icon-sm" variant="ghost" aria-label={t.duplicate} disabled={!slide} onClick={duplicate}>
                  <Copy aria-hidden />
                </Button>
              </Tooltip>
              <Tooltip content={t.moveEarlier}>
                <Button size="icon-sm" variant="ghost" aria-label={t.moveEarlier} disabled={!slide || index === 0} onClick={() => move(index, index - 1)}>
                  <Icon icon={ArrowLeft} directional />
                </Button>
              </Tooltip>
              <Tooltip content={t.moveLater}>
                <Button size="icon-sm" variant="ghost" aria-label={t.moveLater} disabled={!slide || index === deck.slides.length - 1} onClick={() => move(index, index + 1)}>
                  <Icon icon={ArrowRight} directional />
                </Button>
              </Tooltip>
              <Tooltip content={t.delete}>
                <Button size="icon-sm" variant="ghost" aria-label={t.delete} disabled={!slide} onClick={remove}>
                  <Trash2 aria-hidden />
                </Button>
              </Tooltip>
            </>
          ) : null}
          {onSave && editable ? (
            <Button size="sm" loading={saveState.status === "saving"} disabled={!dirty} onClick={save}>
              {t.save}
            </Button>
          ) : null}
          <Button size="sm" variant="primary" disabled={deck.slides.length === 0} onClick={present}>
            <Play aria-hidden />
            {t.present}
          </Button>
        </div>
      </div>

      {deck.slides.length === 0 || !slide ? (
        <EmptyState
          icon={Presentation}
          title={t.empty}
          description={t.emptyHint}
          actions={
            editable ? (
              <Button variant="primary" onClick={() => addSlide("title")}>
                <Plus aria-hidden />
                {t.addSlide}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid min-w-0 gap-3 lg:grid-cols-[11rem_minmax(0,1fr)_16rem]">
          <nav aria-label={t.slides} className="min-w-0 overflow-x-auto pb-1 lg:max-h-[38rem] lg:overflow-y-auto lg:overflow-x-hidden lg:pb-0">
            {rail}
            <p id={`${uid}-hint`} className="sr-only">
              {t.reorderHint}
            </p>
          </nav>

          <div className="flex min-w-0 flex-col gap-3">
            <div className="rounded-card border border-border bg-secondary/40 p-2 sm:p-4">
              <SlideView key={slide.id} slide={slide} t={t} onChange={editable ? patchSlide : undefined} className="rounded-control shadow-xs" />
            </div>
            <Field>
              <FieldLabel>{t.notes}</FieldLabel>
              <Textarea rows={3} dir="auto" readOnly={!editable} placeholder={t.notesPlaceholder} value={slide.notes ?? ""} onChange={(e) => patchSlide({ notes: e.currentTarget.value })} />
            </Field>
          </div>

          <div className="flex min-w-0 flex-col gap-4 rounded-card border border-border bg-card p-3">
            <p className="text-label text-foreground">{t.slide(n(index + 1))}</p>
            <Field>
              <FieldLabel>{t.layout}</FieldLabel>
              <Select
                disabled={!editable}
                items={SLIDE_LAYOUTS.map((l) => ({ value: l, label: layoutKey(l, t) }))}
                value={slide.layout}
                onValueChange={(v) => v && patchSlide({ layout: v as SlideLayout })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SLIDE_LAYOUTS.map((l) => (
                    <SelectItem key={l} value={l}>
                      {layoutKey(l, t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <div className="flex flex-col gap-1.5">
              <span id={`${uid}-theme`} className="text-label text-foreground">
                {t.theme}
              </span>
              <ToggleGroup aria-labelledby={`${uid}-theme`} disabled={!editable} value={[slide.theme ?? "light"]} onValueChange={(v) => v[0] && patchSlide({ theme: v[0] as SlideTheme })}>
                {SLIDE_THEMES.map((theme) => (
                  <Toggle key={theme} value={theme}>
                    {themeLabel(theme, t)}
                  </Toggle>
                ))}
              </ToggleGroup>
            </div>
            {slide.layout === "image" ? (
              <>
                <Field>
                  <FieldLabel>{t.imageUrl}</FieldLabel>
                  <Input ltr readOnly={!editable} placeholder="https://" value={slide.image ?? ""} onChange={(e) => patchSlide({ image: e.currentTarget.value })} />
                  <p className="mt-1 text-caption text-muted-foreground">{t.imageHint}</p>
                </Field>
                <Field>
                  <FieldLabel>{t.imageAlt}</FieldLabel>
                  <Input dir="auto" readOnly={!editable} value={slide.imageAlt ?? ""} onChange={(e) => patchSlide({ imageAlt: e.currentTarget.value })} />
                </Field>
              </>
            ) : null}
          </div>
        </div>
      )}

      <div className="sr-only" role="status" aria-live="polite">
        {announce}
      </div>
      {!onPresent ? <DeckPlayer deck={deck} open={playing} onOpenChange={setPlaying} defaultIndex={index} key={playing ? "open" : "closed"} labels={labels} /> : null}
    </div>
  );
}
