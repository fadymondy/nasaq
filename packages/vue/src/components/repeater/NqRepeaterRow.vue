<script setup lang="ts">
import { ChevronRight, Copy, GripVertical, Trash2 } from "lucide-vue-next";
import { useId, type CSSProperties } from "vue";
import { cn } from "../../lib/cn";
import { NqButton } from "../button";
import { NqIcon } from "../icon";
import { NqTooltip } from "../tooltip";

// One row of NqRepeater: the header (drag handle, collapse toggle, duplicate, remove) and the body slot.
interface Props {
  rowKey: string;
  position: string;
  collapsed: boolean;
  collapsible: boolean;
  reorderable: boolean;
  duplicable: boolean;
  disabled: boolean;
  canDuplicate: boolean;
  canRemove: boolean;
  dragging: boolean;
  hintId: string;
  labels: { remove: string; duplicate: string; reorder: string; toggle: string };
  style?: CSSProperties;
}
const props = defineProps<Props>();
const emit = defineEmits<{
  toggle: [];
  duplicate: [];
  remove: [];
  moveKey: [key: string, handle: HTMLElement];
  dragStart: [event: PointerEvent];
}>();
defineSlots<{ default(): unknown; title(): unknown; summary(): unknown; meta(): unknown }>();
const bodyId = useId();

function onHandleKeydown(event: KeyboardEvent) {
  if (["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) {
    event.preventDefault();
    emit("moveKey", event.key, event.currentTarget as HTMLElement);
  }
}
</script>

<template>
  <li
    data-slot="repeater-row"
    :data-row-key="props.rowKey"
    :data-collapsed="props.collapsed || undefined"
    :data-dragging="props.dragging || undefined"
    :style="props.style"
    class="relative rounded-card border border-border bg-card data-dragging:z-10 data-dragging:border-nq-focus data-dragging:shadow-floating"
  >
    <div data-slot="repeater-row-header" class="flex min-h-control items-center gap-1 p-1.5">
      <NqTooltip v-if="props.reorderable" :content="props.labels.reorder">
        <button
          type="button"
          data-repeater-focus=""
          :aria-label="props.labels.reorder"
          :aria-describedby="props.hintId"
          aria-keyshortcuts="ArrowUp ArrowDown Home End"
          :disabled="props.disabled"
          class="inline-flex size-control-sm shrink-0 cursor-grab touch-none items-center justify-center rounded-control text-muted-foreground outline-none hover:bg-nq-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:size-4"
          @keydown="onHandleKeydown"
          @pointerdown="emit('dragStart', $event)"
        >
          <GripVertical aria-hidden="true" />
        </button>
      </NqTooltip>
      <button
        v-if="props.collapsible"
        type="button"
        :data-repeater-focus="props.reorderable ? undefined : ''"
        :aria-expanded="!props.collapsed"
        :aria-controls="bodyId"
        :aria-label="props.labels.toggle"
        class="flex min-h-control-sm min-w-0 flex-1 items-center gap-2 rounded-control px-1.5 text-start outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus"
        @click="emit('toggle')"
      >
        <NqIcon :icon="ChevronRight" directional :class="cn('size-4 shrink-0 text-muted-foreground transition-[rotate] duration-200 ease-nq', !props.collapsed && 'rotate-90 rtl:-rotate-90')" />
        <span class="min-w-0 truncate text-label text-foreground"><slot name="title" /></span>
        <span v-if="props.collapsed && $slots.summary" class="min-w-0 flex-1 truncate text-body-sm text-muted-foreground"><slot name="summary" /></span>
      </button>
      <div v-else class="flex min-w-0 flex-1 items-center gap-2 px-1.5">
        <span :data-repeater-focus="props.reorderable ? undefined : ''" :tabindex="props.reorderable ? undefined : -1" class="min-w-0 truncate text-label text-foreground outline-none"><slot name="title" /></span>
      </div>
      <span class="sr-only">{{ props.position }}</span>
      <div v-if="$slots.meta" class="flex shrink-0 items-center gap-1.5"><slot name="meta" /></div>
      <NqTooltip v-if="props.duplicable" :content="props.labels.duplicate">
        <NqButton type="button" variant="ghost" size="icon-sm" :aria-label="props.labels.duplicate" :disabled="props.disabled || !props.canDuplicate" @click="emit('duplicate')">
          <Copy aria-hidden="true" />
        </NqButton>
      </NqTooltip>
      <NqTooltip :content="props.labels.remove">
        <NqButton
          type="button"
          variant="ghost"
          size="icon-sm"
          :aria-label="props.labels.remove"
          :disabled="props.disabled || !props.canRemove"
          class="text-muted-foreground hover:text-nq-danger-text"
          @click="emit('remove')"
        >
          <Trash2 aria-hidden="true" />
        </NqButton>
      </NqTooltip>
    </div>
    <div :id="bodyId" data-slot="repeater-body" :hidden="props.collapsed" class="border-t border-border p-3 sm:p-4"><slot /></div>
  </li>
</template>
