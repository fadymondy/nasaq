<script setup lang="ts">
import { ref } from "vue";
import { NqTooltip } from "../tooltip";
import type { RailSection } from "./types";

// The narrow icon rail of NqIconRailSidebar. Internal.
const props = defineProps<{
  sections: readonly RailSection[];
  activeId?: string;
  label: string;
  subId: string;
  subOpen: boolean;
}>();
const emit = defineEmits<{ pick: [section: RailSection, event: MouseEvent] }>();

const railButton = [
  "relative flex size-10 min-h-[var(--nq-touch-min,0px)] min-w-[var(--nq-touch-min,0px)] items-center justify-center rounded-control text-muted-foreground outline-none",
  "transition-colors duration-150 ease-nq hover:bg-nq-hover hover:text-foreground",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus",
  "data-[active=true]:bg-nq-selected data-[active=true]:text-foreground",
  "data-[active=true]:before:absolute data-[active=true]:before:inset-y-2 data-[active=true]:before:-start-1.5 data-[active=true]:before:w-0.5 data-[active=true]:before:rounded-full data-[active=true]:before:bg-nq-accent",
  "[&_svg]:size-5 [&_svg]:shrink-0",
].join(" ");

const list = ref<HTMLUListElement | null>(null);
function onKeyDown(event: KeyboardEvent) {
  if (!["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
  const buttons = [...(list.value?.querySelectorAll<HTMLElement>("[data-rail-button]") ?? [])];
  const at = buttons.indexOf(document.activeElement as HTMLElement);
  if (at < 0) return;
  event.preventDefault();
  const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : Math.min(buttons.length - 1, Math.max(0, at + (event.key === "ArrowDown" ? 1 : -1)));
  buttons[next]?.focus();
}
</script>

<template>
  <nav :aria-label="props.label" data-slot="icon-rail" class="flex w-14 shrink-0 flex-col items-center gap-3 border-e border-border bg-card py-3">
    <div v-if="$slots.brand" data-slot="icon-rail-brand" class="flex size-10 shrink-0 items-center justify-center"><slot name="brand" /></div>
    <ul ref="list" class="flex min-h-0 flex-1 flex-col items-center gap-1 overflow-y-auto px-2 [scrollbar-width:none]" @keydown="onKeyDown">
      <li v-for="s in props.sections" :key="s.id">
        <NqTooltip :content="s.label" side="inline-end">
          <a
            data-rail-button
            :data-active="s.id === props.activeId"
            :href="s.href ?? '#'"
            :aria-label="s.label"
            :aria-current="s.id === props.activeId ? 'page' : undefined"
            :aria-controls="s.groups?.length ? props.subId : undefined"
            :aria-expanded="s.groups?.length && s.id === props.activeId ? props.subOpen : undefined"
            :class="railButton"
            @click="emit('pick', s, $event)"
          >
            <component :is="s.icon" />
            <span
              v-if="s.badge"
              class="absolute -end-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-nq-accent px-1 text-caption leading-4 font-medium text-foreground"
            >
              {{ s.badge }}
            </span>
          </a>
        </NqTooltip>
      </li>
    </ul>
    <div v-if="$slots.footer" data-slot="icon-rail-footer" class="flex shrink-0 flex-col items-center gap-2"><slot name="footer" /></div>
  </nav>
</template>
