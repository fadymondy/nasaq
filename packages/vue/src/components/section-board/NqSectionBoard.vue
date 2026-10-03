<script setup lang="ts">
import { GripVertical, LayoutList, Plus, Settings2, Sparkles, Trash2 } from "lucide-vue-next";
import { computed, nextTick, onBeforeUnmount, ref, useId, type CSSProperties, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqIcon } from "../icon";
import { formatNumber } from "../numeric";
import { keyTarget, moveItem } from "../repeater/repeater-math";
import { NqEmptyState } from "../states";
import { NqTooltip } from "../tooltip";
import NqSectionEditor from "./NqSectionEditor.vue";
import { sectionDropIndex, type BoardSection, type BoardSectionModel } from "./section-board-logic";
import { sectionBoardStrings, type SectionBoardLabels } from "./section-board-strings";

/**
 * An ordered set of sections, each produced by a prompt, a model and a few settings. View mode shows only the
 * content; edit mode lets people reorder (drag with native pointer events, or the arrow keys), edit each section
 * in a dialog and remove it.
 */
const props = withDefaults(
  defineProps<{
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
    /** Heading level of each section title. Default `h3`. */
    headingAs?: string;
    labels?: Partial<SectionBoardLabels>;
    class?: HTMLAttributes["class"];
  }>(),
  { onChange: undefined, editing: false, models: () => [], columns: 1, onAdd: undefined, headingAs: "h3", labels: undefined },
);
defineSlots<{
  /** What a section shows. Default `section.content`. */
  content?(ctx: { section: BoardSection }): unknown;
}>();

const SETTING_ICON_BUTTON = "text-muted-foreground hover:text-nq-danger-text";

const { locale } = useNasaq();
const t = computed<SectionBoardLabels>(() => ({ ...sectionBoardStrings(locale.value), ...props.labels }));
const n = (value: number) => formatNumber(value, locale.value);
const uid = useId();
const hintId = `${uid}-hint`;
const canEdit = computed(() => props.editing && !!props.onChange);
const reorderable = computed(() => canEdit.value && props.sections.length > 1);
const announcement = ref("");
const editingId = ref<string | null>(null);
const open = computed(() => props.sections.find((s) => s.id === editingId.value) ?? null);
const root = ref<HTMLElement | null>(null);
const modelName = (value?: string) => (value ? (props.models.find((m) => m.value === value)?.label ?? value) : null);

function move(from: number, to: number) {
  const item = props.sections[from];
  const target = Math.max(0, Math.min(props.sections.length - 1, to));
  if (!props.onChange || !item || target === from) return;
  props.onChange(moveItem(props.sections, from, target));
  announcement.value = t.value.moved(item.title, n(target + 1), n(props.sections.length));
}

function remove(section: BoardSection) {
  if (!props.onChange) return;
  props.onChange(props.sections.filter((s) => s.id !== section.id));
  announcement.value = t.value.removed(section.title);
}

function save(next: BoardSection) {
  if (!props.onChange) return;
  props.onChange(props.sections.map((s) => (s.id === next.id ? next : s)));
  editingId.value = null;
  announcement.value = t.value.saved(next.title);
}

function onHandleKeydown(event: KeyboardEvent, index: number) {
  if (!["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  const handle = event.currentTarget as HTMLElement;
  const target = keyTarget(event.key, index, props.sections.length);
  if (target !== null) move(index, target);
  // The section re-renders in a new place: bring focus back to its handle.
  void nextTick(() => handle.isConnected && handle.focus());
}

/* ----------------------------------------------------------- pointer drag */

const DRAG_DISTANCE = 4;
const drag = ref<{ from: number; over: number; dx: number; dy: number } | null>(null);
let session: { from: number; startX: number; startY: number; centers: { x: number; y: number }[]; id: number; active: boolean } | null = null;

function onDragStart(index: number, event: PointerEvent) {
  if (!reorderable.value || (event.pointerType === "mouse" && event.button !== 0)) return;
  const items = [...(root.value?.querySelectorAll<HTMLElement>('[data-slot="section-board-section"]') ?? [])];
  session = {
    from: index,
    startX: event.clientX,
    startY: event.clientY,
    centers: items.map((el) => {
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }),
    id: event.pointerId,
    active: false,
  };
  window.addEventListener("pointermove", onDragMove);
  window.addEventListener("pointerup", onDragEnd);
  window.addEventListener("pointercancel", stopDrag);
}

function onDragMove(event: PointerEvent) {
  if (!session || event.pointerId !== session.id) return;
  const dx = event.clientX - session.startX;
  const dy = event.clientY - session.startY;
  if (!session.active) {
    if (Math.hypot(dx, dy) < DRAG_DISTANCE) return;
    session.active = true;
  }
  event.preventDefault();
  drag.value = { from: session.from, over: sectionDropIndex(session.centers, session.from, dx, dy), dx, dy };
}

function stopDrag() {
  window.removeEventListener("pointermove", onDragMove);
  window.removeEventListener("pointerup", onDragEnd);
  window.removeEventListener("pointercancel", stopDrag);
  session = null;
  drag.value = null;
}

function onDragEnd(event: PointerEvent) {
  if (!session || event.pointerId !== session.id) return;
  const result = drag.value;
  stopDrag();
  if (result && result.over !== result.from) move(result.from, result.over);
}
onBeforeUnmount(stopDrag);

function sectionStyle(index: number): CSSProperties | undefined {
  const d = drag.value;
  if (!d || index !== d.from) return undefined;
  return { transform: `translate(${d.dx}px, ${d.dy}px)`, transition: "none" };
}
</script>

<template>
  <div ref="root" data-slot="section-board" :data-editing="canEdit || undefined" :class="cn('flex min-w-0 flex-col gap-3', props.class)">
    <p v-if="canEdit" :id="hintId" class="sr-only">{{ t.reorderHint }}</p>

    <NqEmptyState v-if="!sections.length" :icon="LayoutList" :title="t.emptyTitle" :description="t.empty" />
    <ol v-else :aria-label="t.list" :class="cn('grid gap-3', props.columns === 2 && 'sm:grid-cols-2')">
      <li
        v-for="(section, index) in sections"
        :key="section.id"
        data-slot="section-board-section"
        :data-section="section.id"
        :data-dragging="drag?.from === index || undefined"
        :data-over="drag && drag.over === index && drag.from !== index ? '' : undefined"
        :aria-labelledby="`${uid}-${section.id}`"
        :style="canEdit ? sectionStyle(index) : undefined"
        class="relative flex min-w-0 flex-col rounded-card border border-border bg-card data-dragging:z-10 data-dragging:border-nq-focus data-dragging:shadow-floating data-over:border-nq-focus"
      >
        <div class="flex min-h-control items-center gap-1 px-2 pt-2">
          <NqTooltip v-if="reorderable" :content="t.reorder(section.title)">
            <button
              type="button"
              :aria-label="t.reorder(section.title)"
              :aria-describedby="hintId"
              aria-keyshortcuts="ArrowUp ArrowDown Home End"
              class="inline-flex size-control-sm shrink-0 cursor-grab touch-none items-center justify-center rounded-control text-muted-foreground outline-none hover:bg-nq-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus active:cursor-grabbing [&_svg]:size-4"
              @keydown="onHandleKeydown($event, index)"
              @pointerdown="onDragStart(index, $event)"
            >
              <GripVertical aria-hidden="true" />
            </button>
          </NqTooltip>
          <component :is="props.headingAs" :id="`${uid}-${section.id}`" dir="auto" :class="cn('min-w-0 flex-1 truncate text-label text-foreground', !reorderable && 'ps-2')">{{ section.title }}</component>
          <span v-if="canEdit" class="sr-only">{{ n(index + 1) }}</span>
          <NqBadge v-if="section.badge" variant="neutral">{{ section.badge }}</NqBadge>
          <template v-if="canEdit">
            <NqTooltip :content="t.edit(section.title)">
              <NqButton type="button" variant="ghost" size="icon-sm" :aria-label="t.edit(section.title)" aria-haspopup="dialog" @click="editingId = section.id">
                <Settings2 aria-hidden="true" />
              </NqButton>
            </NqTooltip>
            <NqTooltip :content="t.remove(section.title)">
              <NqButton type="button" variant="ghost" size="icon-sm" :aria-label="t.remove(section.title)" :class="SETTING_ICON_BUTTON" @click="remove(section)">
                <Trash2 aria-hidden="true" />
              </NqButton>
            </NqTooltip>
          </template>
        </div>

        <div data-slot="section-board-content" :inert="canEdit || undefined" class="min-w-0 flex-1 px-4 pt-2 pb-4 text-body-sm text-muted-foreground">
          <slot name="content" :section="section">
            <template v-if="section.content">{{ section.content }}</template>
            <span v-else class="italic">{{ t.emptyContent }}</span>
          </slot>
        </div>

        <div v-if="canEdit && (modelName(section.model) || section.prompt)" data-slot="section-board-prompt" class="flex min-w-0 items-center gap-2 border-t border-border px-4 py-2 text-caption text-muted-foreground">
          <Sparkles aria-hidden="true" class="size-3.5 shrink-0" />
          <NqBadge v-if="modelName(section.model)" variant="outline" class="shrink-0">{{ modelName(section.model) }}</NqBadge>
          <span v-if="section.prompt" dir="auto" class="min-w-0 flex-1 truncate font-mono">{{ section.prompt }}</span>
        </div>
      </li>
    </ol>

    <NqButton v-if="canEdit && props.onAdd" type="button" variant="secondary" class="w-full border-dashed" @click="props.onAdd()">
      <NqIcon :icon="Plus" />
      {{ t.add }}
    </NqButton>

    <NqSectionEditor :section="open" :models="props.models" :t="t" @close="editingId = null" @save="save" />

    <div aria-live="polite" role="status" class="sr-only">{{ announcement }}</div>
  </div>
</template>
