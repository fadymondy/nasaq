<script setup lang="ts">
import { Check, RotateCw, Search } from "lucide-vue-next";
import { nextTick, ref, useId, watch } from "vue";
import { cn } from "../../lib/cn";
import { NqButton } from "../button";
import { NqInput } from "../field";
import { NqSkeleton } from "../states";
import { moveIndex } from "./format";
import type { RepositoryPickerLabels } from "./strings";

// Search box plus a listbox, driven from the keyboard (arrows, Enter) with focus staying in the box.
interface Item {
  key: string;
  selected: boolean;
}
interface Props {
  items: Item[];
  placeholder: string;
  status: "loading" | "ready" | "error";
  emptyTitle: string;
  emptyHint?: string;
  t: RepositoryPickerLabels;
  num: (n: number) => string;
}
const props = withDefaults(defineProps<Props>(), { emptyHint: undefined });
const search = defineModel<string>("search", { default: "" });
const emit = defineEmits<{ pick: [index: number]; retry: [] }>();

const id = useId();
const active = ref(-1);
const list = ref<HTMLUListElement | null>(null);
watch(
  () => [search.value, props.items.length] as const,
  () => (active.value = props.items.length && search.value ? 0 : -1),
);
watch(active, async (a) => {
  if (a < 0) return;
  await nextTick();
  (list.value?.children[a] as HTMLElement | undefined)?.scrollIntoView?.({ block: "nearest" });
});

function onKeyDown(e: KeyboardEvent) {
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    active.value = moveIndex(active.value, e.key === "ArrowDown" ? 1 : -1, props.items.length);
  } else if (e.key === "Enter" && active.value >= 0) {
    e.preventDefault();
    emit("pick", active.value);
  }
}
</script>

<template>
  <div class="flex min-w-0 flex-col">
    <div class="relative p-2">
      <Search aria-hidden="true" class="pointer-events-none absolute start-4.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <NqInput
        v-model="search"
        autofocus
        type="search"
        role="combobox"
        aria-expanded="true"
        :aria-controls="`${id}-list`"
        :aria-activedescendant="active >= 0 ? `${id}-${active}` : undefined"
        :aria-label="props.placeholder"
        :placeholder="props.placeholder"
        class="ps-8"
        @keydown="onKeyDown"
      />
    </div>
    <p class="sr-only" role="status">{{ props.status === "loading" ? props.t.loading : props.status === "ready" ? props.t.results(props.num(props.items.length)) : props.t.failed }}</p>
    <div class="max-h-72 overflow-y-auto border-t border-border">
      <div v-if="props.status === 'loading' && props.items.length === 0" class="flex flex-col gap-2 p-3" aria-hidden="true">
        <NqSkeleton v-for="i in 3" :key="i" class="h-9 w-full" />
      </div>
      <div v-else-if="props.status === 'error'" class="flex flex-col items-start gap-2 p-4 text-body-sm text-muted-foreground">
        <p>{{ props.t.failed }}</p>
        <NqButton size="sm" variant="secondary" @click="emit('retry')">
          <RotateCw aria-hidden="true" />
          {{ props.t.retry }}
        </NqButton>
      </div>
      <div v-else-if="props.items.length === 0" class="p-4 text-body-sm">
        <p class="text-label text-foreground">{{ props.emptyTitle }}</p>
        <p v-if="props.emptyHint" class="mt-1 text-muted-foreground">{{ props.emptyHint }}</p>
      </div>
      <ul v-else :id="`${id}-list`" ref="list" role="listbox" :aria-label="props.placeholder" :class="cn('flex flex-col p-1', props.status === 'loading' && 'opacity-60')">
        <li
          v-for="(o, i) in props.items"
          :id="`${id}-${i}`"
          :key="o.key"
          role="option"
          :aria-selected="o.selected"
          :data-active="i === active ? 'true' : undefined"
          :class="cn('flex cursor-pointer items-start gap-2 rounded-control px-2 py-1.5', i === active && 'bg-nq-hover')"
          @click="emit('pick', i)"
          @mousemove="active = i"
        >
          <span class="min-w-0 flex-1"><slot name="option" :item="o" :index="i" /></span>
          <Check v-if="o.selected" aria-hidden="true" class="mt-0.5 size-4 shrink-0 text-primary" />
        </li>
      </ul>
    </div>
    <slot name="footer" />
  </div>
</template>
