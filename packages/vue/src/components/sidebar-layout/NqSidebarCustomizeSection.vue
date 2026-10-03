<script setup lang="ts">
import { GripVertical } from "lucide-vue-next";
import { computed } from "vue";
import { cn } from "../../lib/cn";
import { NqSwitch } from "../switch";
import { beginPress } from "./drag";
import type { SidebarCustomizeSection } from "./types";

// One list inside NqSidebarCustomize: a drag handle (pointer or keyboard), icon, label and a show/hide switch per item.
interface Props {
  section: SidebarCustomizeSection;
  reorderLabel: (label: string) => string;
}
const props = defineProps<Props>();
const emit = defineEmits<{ moved: [label: string, position: number, total: number] }>();

const layout = computed(() => props.section.layout);
const byId = computed(() => new Map(props.section.items.map((item) => [item.id, item])));
const rows = computed(() => layout.value.order.map((id) => byId.value.get(id)).filter((i) => i !== undefined));

function moveTo(id: string, index: number) {
  const order = layout.value.order;
  const target = Math.max(0, Math.min(order.length - 1, index));
  const overId = order[target];
  if (overId === undefined || overId === id) return;
  layout.value.move(id, overId);
  emit("moved", byId.value.get(id)?.label ?? id, target + 1, order.length);
}

function onHandleKeydown(event: KeyboardEvent, id: string) {
  const key = event.key;
  if (key !== "ArrowUp" && key !== "ArrowDown" && key !== "Home" && key !== "End") return;
  event.preventDefault();
  const handle = event.currentTarget as HTMLElement;
  const order = layout.value.order;
  const index = order.indexOf(id);
  if (key === "ArrowUp") moveTo(id, index - 1);
  else if (key === "ArrowDown") moveTo(id, index + 1);
  else if (key === "Home") moveTo(id, 0);
  else moveTo(id, order.length - 1);
  // Reordering can re-insert this row, which drops focus; keep it on the handle.
  requestAnimationFrame(() => handle.focus());
}

function onHandlePointerDown(event: PointerEvent, id: string) {
  const row = (event.currentTarget as HTMLElement).closest<HTMLElement>("li[data-sortable-id]");
  if (!row) return;
  beginPress(event, row, id, { distance: 2, delay: 150, tolerance: 6, onMove: (a, o) => layout.value.move(a, o) });
}
</script>

<template>
  <section class="flex flex-col gap-1" :aria-label="props.section.label">
    <h3 v-if="props.section.label" class="px-2 text-caption font-medium text-muted-foreground">{{ props.section.label }}</h3>
    <ul class="flex flex-col gap-0.5">
      <li
        v-for="item in rows"
        :key="item.id"
        :data-sortable-id="item.id"
        class="relative flex h-10 items-center gap-2 rounded-control bg-popover px-1 data-dragging:z-10 data-dragging:shadow-floating"
      >
        <button
          type="button"
          :aria-label="props.reorderLabel(item.label)"
          aria-keyshortcuts="ArrowUp ArrowDown Home End"
          class="inline-flex size-7 cursor-grab touch-none items-center justify-center rounded-control text-muted-foreground outline-none hover:bg-nq-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus active:cursor-grabbing [&_svg]:size-4"
          @keydown="onHandleKeydown($event, item.id)"
          @pointerdown="onHandlePointerDown($event, item.id)"
        >
          <GripVertical />
        </button>
        <span
          v-if="item.icon"
          :class="cn('text-muted-foreground [&_svg]:size-4', !!layout.hidden.includes(item.id) && 'opacity-50')"
        >
          <component :is="item.icon" />
        </span>
        <span :class="cn('min-w-0 flex-1 truncate text-body-sm', layout.hidden.includes(item.id) ? 'text-muted-foreground' : 'text-foreground')">{{ item.label }}</span>
        <NqSwitch
          :model-value="!layout.hidden.includes(item.id)"
          :disabled="item.required"
          :aria-label="item.label"
          class="me-1"
          @update:model-value="layout.setVisible(item.id, $event)"
        />
      </li>
    </ul>
  </section>
</template>
