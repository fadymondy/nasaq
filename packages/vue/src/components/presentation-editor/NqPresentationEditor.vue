<script setup lang="ts">
import {
  ArrowLeft, ArrowRight, Bookmark, Columns2, Copy, Heading1, Image as ImageIcon, List, Play, Plus, Presentation, Quote, Square, Trash2,
} from "lucide-vue-next";
import { computed, nextTick, onBeforeUnmount, ref, useId, watch, type Component, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqDropdownMenu, NqDropdownMenuContent, NqDropdownMenuItem, NqDropdownMenuTrigger } from "../dropdown-menu";
import { NqField, NqFieldLabel, NqInput, NqTextarea } from "../field";
import { NqIcon } from "../icon";
import { formatNumber } from "../numeric";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import { NqEmptyState } from "../states";
import { NqToggle, NqToggleGroup } from "../toggle-group";
import { NqTooltip } from "../tooltip";
import NqDeckPlayer from "./NqDeckPlayer.vue";
import NqSlideView from "./NqSlideView.vue";
import {
  duplicateSlide, insertSlide, moveSlide, newSlide, notesCount, removeSlide, SLIDE_LAYOUTS, SLIDE_THEMES, slideTitle,
  type Deck, type Slide, type SlideLayout, type SlideTheme,
} from "./presentation-math";
import { usePresentationStrings, type PresentationLabels, type PresentationText } from "./presentation-strings";
import { closestThumb, DRAG_DISTANCE } from "./rail-drag";

/**
 * A slide deck editor: a rail of thumbnails you can drag to reorder (native pointer events), an in-place editing
 * canvas, a layout and theme inspector, presenter notes, and Present, which plays the deck in a full-screen player.
 * Nine layouts cover titles, sections, bullets, two columns, quotes and images. Text is edited right on the slide.
 */
interface Props {
  /** Controlled deck (`v-model`). */
  modelValue?: Deck;
  defaultValue?: Deck;
  /** Persist the deck. Return `{ error }` to show why it failed. Adds a Save button and the unsaved-changes state. */
  onSave?: (deck: Deck) => Promise<void | { error?: string }>;
  /** Called by Present. Without it the editor opens its own player. */
  onPresent?: (deck: Deck, startIndex: number) => void;
  /** Look at slides and play them, but change nothing. */
  readOnly?: boolean;
  labels?: PresentationLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { modelValue: undefined, defaultValue: undefined, onSave: undefined, onPresent: undefined, readOnly: false, labels: undefined });
const emit = defineEmits<{ "update:modelValue": [deck: Deck] }>();

const { locale, t } = usePresentationStrings(() => props.labels);
const n = (v: number) => formatNumber(v, locale.value);
const uid = useId();

const inner = ref<Deck>(props.defaultValue ?? props.modelValue ?? { title: "", slides: [] });
const deck = computed(() => props.modelValue ?? inner.value);
const saved = ref<Deck>(deck.value);
const dirty = computed(() => saved.value !== deck.value);
const saveState = ref<{ status: "idle" | "saving" | "error"; message?: string }>({ status: "idle" });
const selectedId = ref<string | undefined>(deck.value.slides[0]?.id);
const playing = ref(false);
const announce = ref("");
const root = ref<HTMLElement | null>(null);
let focusSlide: string | null = null;

const index = computed(() => Math.max(0, deck.value.slides.findIndex((s) => s.id === selectedId.value)));
const slide = computed<Slide | undefined>(() => deck.value.slides[index.value]);
const editable = computed(() => !props.readOnly);
const withNotes = computed(() => notesCount(deck.value));

const LAYOUT_ICON: Record<SlideLayout, Component> = {
  title: Heading1, section: Bookmark, content: List, "two-column": Columns2, quote: Quote, image: ImageIcon, blank: Square,
};
const layoutLabel = (layout: SlideLayout, text: PresentationText) =>
  ({ title: text.layoutTitle, section: text.layoutSection, content: text.layoutContent, "two-column": text.layoutTwoColumn, quote: text.layoutQuote, image: text.layoutImage, blank: text.layoutBlank })[layout];
const themeLabel = (theme: SlideTheme, text: PresentationText) => ({ light: text.themeLight, dark: text.themeDark, brand: text.themeBrand })[theme];

function commit(next: Deck) {
  if (props.modelValue === undefined) inner.value = next;
  emit("update:modelValue", next);
  if (saveState.value.status === "error") saveState.value = { status: "idle" };
}
function patchSlide(patch: Partial<Slide>) {
  const s = slide.value;
  if (!s) return;
  commit({ ...deck.value, slides: deck.value.slides.map((x) => (x.id === s.id ? { ...x, ...patch } : x)) });
}

watch([slide, () => deck.value.slides], () => {
  if (!slide.value && deck.value.slides[0]) selectedId.value = deck.value.slides[0].id;
});

// After adding or duplicating, scroll the new thumbnail into view.
async function revealNew() {
  const id = focusSlide;
  if (!id) return;
  focusSlide = null;
  await nextTick();
  root.value?.querySelector<HTMLElement>(`[data-slide-id="${globalThis.CSS?.escape ? globalThis.CSS.escape(id) : id}"]`)?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
}

function addSlide(layout: SlideLayout) {
  const s = newSlide(layout);
  commit({ ...deck.value, slides: insertSlide(deck.value.slides, slide.value ? index.value + 1 : 0, s) });
  selectedId.value = s.id;
  focusSlide = s.id;
  announce.value = t.value.added;
  void revealNew();
}
function duplicate() {
  if (!slide.value) return;
  const s = duplicateSlide(slide.value);
  commit({ ...deck.value, slides: insertSlide(deck.value.slides, index.value + 1, s) });
  selectedId.value = s.id;
  focusSlide = s.id;
  void revealNew();
}
function remove() {
  if (!slide.value) return;
  const next = removeSlide(deck.value.slides, index.value);
  commit({ ...deck.value, slides: next });
  selectedId.value = next[Math.min(index.value, next.length - 1)]?.id;
  announce.value = t.value.deleted;
}
function move(from: number, to: number) {
  const target = Math.max(0, Math.min(deck.value.slides.length - 1, to));
  if (target === from) return;
  commit({ ...deck.value, slides: moveSlide(deck.value.slides, from, target) });
  announce.value = t.value.moved(n(target + 1));
}

// Native pointer reorder of the rail: press a thumbnail and drag past 5px; the thumbnail follows the pointer and the
// one under it is marked; releasing moves the slide there. A drag never selects (the click is swallowed).
const drag = ref<{ id: string; dx: number; dy: number; over: number } | null>(null);
let session: { id: string; from: number; x: number; y: number; centers: { x: number; y: number }[]; active: boolean } | null = null;
let swallowClick = false;

function onThumbDown(e: PointerEvent, i: number, id: string) {
  if (!editable.value || e.button > 0 || deck.value.slides.length < 2) return;
  const items = [...(root.value?.querySelectorAll<HTMLElement>("[data-slide-id]") ?? [])];
  session = {
    id, from: i, x: e.clientX, y: e.clientY, active: false,
    centers: items.map((el) => {
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }),
  };
  window.addEventListener("pointermove", onDragMove);
  window.addEventListener("pointerup", onDragEnd);
  window.addEventListener("pointercancel", onDragCancel);
}
function onDragMove(e: PointerEvent) {
  const s = session;
  if (!s) return;
  const dx = e.clientX - s.x;
  const dy = e.clientY - s.y;
  if (!s.active) {
    if (Math.hypot(dx, dy) < DRAG_DISTANCE) return;
    s.active = true;
  }
  drag.value = { id: s.id, dx, dy, over: closestThumb(s.centers, s.centers[s.from]!.x + dx, s.centers[s.from]!.y + dy) };
}
function stopDrag() {
  window.removeEventListener("pointermove", onDragMove);
  window.removeEventListener("pointerup", onDragEnd);
  window.removeEventListener("pointercancel", onDragCancel);
  session = null;
  drag.value = null;
}
function onDragEnd() {
  const s = session;
  const d = drag.value;
  stopDrag();
  if (!s || !s.active || !d) return;
  swallowClick = true;
  setTimeout(() => (swallowClick = false), 0);
  move(s.from, d.over);
}
const onDragCancel = () => stopDrag();
onBeforeUnmount(stopDrag);
function select(id: string) {
  if (swallowClick) return;
  selectedId.value = id;
}

async function save() {
  if (!props.onSave) return;
  saveState.value = { status: "saving" };
  try {
    const result = await props.onSave(deck.value);
    if (result && result.error) {
      saveState.value = { status: "error", message: result.error };
      return;
    }
    saved.value = deck.value;
    saveState.value = { status: "idle" };
  } catch (error) {
    saveState.value = { status: "error", message: error instanceof Error ? error.message : t.value.saveFailed };
  }
}
function present() {
  if (props.onPresent) props.onPresent(deck.value, index.value);
  else playing.value = true;
}
</script>

<template>
  <div ref="root" data-slot="presentation-editor" role="group" :aria-label="t.editor" :class="cn('flex min-w-0 flex-col gap-3', props.class)">
    <div class="flex flex-wrap items-center gap-2">
      <NqInput
        :aria-label="t.deckTitle"
        :placeholder="t.deckTitlePlaceholder"
        :model-value="deck.title"
        :readonly="!editable"
        dir="auto"
        class="min-w-40 flex-1 text-label sm:max-w-sm"
        @update:model-value="(v: string | number | undefined) => commit({ ...deck, title: String(v ?? '') })"
      />
      <span class="text-caption text-muted-foreground">{{ t.slideCount(n(deck.slides.length)) }}{{ withNotes ? ` · ${t.notesCount(n(withNotes))}` : "" }}</span>
      <div class="ms-auto flex flex-wrap items-center gap-2">
        <template v-if="props.onSave">
          <NqBadge v-if="saveState.status === 'saving'" variant="info">{{ t.saving }}</NqBadge>
          <NqBadge v-else-if="saveState.status === 'error'" variant="danger" role="alert">{{ saveState.message ?? t.saveFailed }}</NqBadge>
          <NqBadge v-else-if="dirty" variant="warning">{{ t.unsaved }}</NqBadge>
          <NqBadge v-else variant="success">{{ t.saved }}</NqBadge>
        </template>
        <template v-if="editable">
          <NqDropdownMenu>
            <NqDropdownMenuTrigger as-child>
              <NqButton size="sm"><Plus aria-hidden="true" />{{ t.addSlide }}</NqButton>
            </NqDropdownMenuTrigger>
            <NqDropdownMenuContent align="end" class="min-w-44">
              <NqDropdownMenuItem v-for="layout in SLIDE_LAYOUTS" :key="layout" @select="addSlide(layout)">
                <NqIcon :icon="LAYOUT_ICON[layout]" />
                {{ layoutLabel(layout, t) }}
              </NqDropdownMenuItem>
            </NqDropdownMenuContent>
          </NqDropdownMenu>
          <NqTooltip :content="t.duplicate">
            <NqButton size="icon-sm" variant="ghost" :aria-label="t.duplicate" :disabled="!slide" @click="duplicate"><Copy aria-hidden="true" /></NqButton>
          </NqTooltip>
          <NqTooltip :content="t.moveEarlier">
            <NqButton size="icon-sm" variant="ghost" :aria-label="t.moveEarlier" :disabled="!slide || index === 0" @click="move(index, index - 1)"><NqIcon :icon="ArrowLeft" directional /></NqButton>
          </NqTooltip>
          <NqTooltip :content="t.moveLater">
            <NqButton size="icon-sm" variant="ghost" :aria-label="t.moveLater" :disabled="!slide || index === deck.slides.length - 1" @click="move(index, index + 1)"><NqIcon :icon="ArrowRight" directional /></NqButton>
          </NqTooltip>
          <NqTooltip :content="t.delete">
            <NqButton size="icon-sm" variant="ghost" :aria-label="t.delete" :disabled="!slide" @click="remove"><Trash2 aria-hidden="true" /></NqButton>
          </NqTooltip>
        </template>
        <NqButton v-if="props.onSave && editable" size="sm" :loading="saveState.status === 'saving'" :disabled="!dirty" @click="save">{{ t.save }}</NqButton>
        <NqButton size="sm" variant="primary" :disabled="deck.slides.length === 0" @click="present"><Play aria-hidden="true" />{{ t.present }}</NqButton>
      </div>
    </div>

    <NqEmptyState v-if="deck.slides.length === 0 || !slide" :icon="Presentation" :title="t.empty" :description="t.emptyHint">
      <template v-if="editable" #actions>
        <NqButton variant="primary" @click="addSlide('title')"><Plus aria-hidden="true" />{{ t.addSlide }}</NqButton>
      </template>
    </NqEmptyState>
    <div v-else class="grid min-w-0 gap-3 lg:grid-cols-[11rem_minmax(0,1fr)_16rem]">
      <nav :aria-label="t.slides" class="min-w-0 overflow-x-auto pb-1 lg:max-h-[38rem] lg:overflow-y-auto lg:overflow-x-hidden lg:pb-0">
        <ol :aria-label="t.slides" :aria-describedby="`${uid}-hint`" class="flex gap-1 lg:flex-col">
          <li
            v-for="(s, i) in deck.slides"
            :key="s.id"
            :data-slide-id="s.id"
            :data-dragging="drag?.id === s.id ? '' : undefined"
            :data-over="drag && drag.id !== s.id && drag.over === i ? '' : undefined"
            :style="drag?.id === s.id ? { transform: `translate(${drag.dx}px, ${drag.dy}px)`, touchAction: 'none' } : undefined"
            class="relative w-36 shrink-0 data-dragging:z-10 data-over:rounded-control data-over:outline-2 data-over:outline-nq-focus lg:w-full"
            @pointerdown="onThumbDown($event, i, s.id)"
          >
            <button
              type="button"
              :aria-current="s.id === slide.id ? 'true' : undefined"
              :aria-label="`${n(i + 1)}. ${slideTitle(s, t.untitled)}`"
              :data-index="i"
              :class="cn('group flex w-full items-start gap-2 rounded-control p-1.5 text-start outline-none focus-visible:outline-2 focus-visible:outline-nq-focus', s.id === slide.id ? 'bg-nq-selected' : 'hover:bg-nq-hover')"
              @click="select(s.id)"
            >
              <span class="w-4 shrink-0 pt-0.5 text-caption text-muted-foreground tabular-nums">{{ n(i + 1) }}</span>
              <span :class="cn('block min-w-0 flex-1 overflow-hidden rounded-[6px] border', s.id === slide.id ? 'border-primary' : 'border-border')">
                <NqSlideView :slide="s" decorative class="pointer-events-none" />
              </span>
            </button>
          </li>
        </ol>
        <p :id="`${uid}-hint`" class="sr-only">{{ t.reorderHint }}</p>
      </nav>

      <div class="flex min-w-0 flex-col gap-3">
        <div class="rounded-card border border-border bg-secondary/40 p-2 sm:p-4">
          <NqSlideView :key="slide.id" :slide="slide" :t="t" :editable="editable" class="rounded-control shadow-xs" @change="patchSlide" />
        </div>
        <NqField>
          <NqFieldLabel>{{ t.notes }}</NqFieldLabel>
          <NqTextarea rows="3" dir="auto" :readonly="!editable" :placeholder="t.notesPlaceholder" :model-value="slide.notes ?? ''" @update:model-value="(v: string | number | undefined) => patchSlide({ notes: String(v ?? '') })" />
        </NqField>
      </div>

      <div class="flex min-w-0 flex-col gap-4 rounded-card border border-border bg-card p-3">
        <p class="text-label text-foreground">{{ t.slide(n(index + 1)) }}</p>
        <NqField>
          <NqFieldLabel>{{ t.layout }}</NqFieldLabel>
          <NqSelect :disabled="!editable" :model-value="slide.layout" @update:model-value="(v) => v && patchSlide({ layout: v as SlideLayout })">
            <NqSelectTrigger><NqSelectValue /></NqSelectTrigger>
            <NqSelectContent>
              <NqSelectItem v-for="l in SLIDE_LAYOUTS" :key="l" :value="l">{{ layoutLabel(l, t) }}</NqSelectItem>
            </NqSelectContent>
          </NqSelect>
        </NqField>
        <div class="flex flex-col gap-1.5">
          <span :id="`${uid}-theme`" class="text-label text-foreground">{{ t.theme }}</span>
          <NqToggleGroup :aria-labelledby="`${uid}-theme`" :disabled="!editable" :model-value="[slide.theme ?? 'light']" @update:model-value="(v) => v[0] && patchSlide({ theme: v[0] as SlideTheme })">
            <NqToggle v-for="theme in SLIDE_THEMES" :key="theme" :value="theme">{{ themeLabel(theme, t) }}</NqToggle>
          </NqToggleGroup>
        </div>
        <template v-if="slide.layout === 'image'">
          <NqField>
            <NqFieldLabel>{{ t.imageUrl }}</NqFieldLabel>
            <NqInput ltr :readonly="!editable" placeholder="https://" :model-value="slide.image ?? ''" @update:model-value="(v: string | number | undefined) => patchSlide({ image: String(v ?? '') })" />
            <p class="mt-1 text-caption text-muted-foreground">{{ t.imageHint }}</p>
          </NqField>
          <NqField>
            <NqFieldLabel>{{ t.imageAlt }}</NqFieldLabel>
            <NqInput dir="auto" :readonly="!editable" :model-value="slide.imageAlt ?? ''" @update:model-value="(v: string | number | undefined) => patchSlide({ imageAlt: String(v ?? '') })" />
          </NqField>
        </template>
      </div>
    </div>

    <div class="sr-only" role="status" aria-live="polite">{{ announce }}</div>
    <NqDeckPlayer v-if="!props.onPresent" :deck="deck" :open="playing" :default-index="index" :labels="props.labels" @update:open="(v: boolean) => (playing = v)" />
  </div>
</template>
