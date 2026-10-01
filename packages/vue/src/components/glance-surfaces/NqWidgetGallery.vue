<script setup lang="ts">
import { Check, Plus } from "lucide-vue-next";
import { computed, getCurrentInstance, reactive, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqButton } from "../button";
import { STRINGS, type GlanceLabels, type WidgetSize } from "./strings";
import type { WidgetDefinition } from "./types";

interface Props {
  widgets: readonly WidgetDefinition[];
  /** Ids already placed on the screen. */
  added?: readonly string[];
  labels?: GlanceLabels;
  locale?: string;
  class?: HTMLAttributes["class"];
}

const props = withDefaults(defineProps<Props>(), { added: () => [] });
const emit = defineEmits<{ add: [id: string, size: WidgetSize]; remove: [id: string] }>();
defineSlots<{ preview?(props: { widget: WidgetDefinition; size: WidgetSize }): unknown }>();
const instance = getCurrentInstance();
/** Without a `@remove` listener an added widget shows a disabled "Added" button. */
const removable = computed(() => typeof instance?.vnode.props?.onRemove !== "undefined");

const nq = useNasaq();
const ar = computed(() => (props.locale ?? nq.locale.value).startsWith("ar"));
const t = computed(() => ({ ...STRINGS[ar.value ? "ar" : "en"], ...props.labels }));
const sizes = reactive<Record<string, WidgetSize>>({});
const sizeOf = (widget: WidgetDefinition): WidgetSize => sizes[widget.id] ?? widget.sizes[0] ?? "small";
const Preview = (p: { render: () => unknown }) => p.render() as never;
</script>

<template>
  <div data-slot="widget-gallery" role="list" :aria-label="t.gallery" :class="cn('grid gap-6 [grid-template-columns:repeat(auto-fill,minmax(min(100%,20rem),1fr))]', props.class)">
    <article v-for="widget in props.widgets" :key="widget.id" role="listitem" class="flex flex-col items-start gap-3 rounded-xl border border-border bg-secondary/40 p-4">
      <div class="flex w-full min-h-40 items-center justify-center overflow-hidden">
        <slot name="preview" :widget="widget" :size="sizeOf(widget)">
          <Preview v-if="widget.preview" :render="() => widget.preview!(sizeOf(widget))" />
        </slot>
      </div>
      <div class="min-w-0">
        <h3 class="text-label font-semibold text-foreground">{{ widget.title }}</h3>
        <p v-if="widget.description" class="text-caption text-muted-foreground">{{ widget.description }}</p>
      </div>
      <div class="flex w-full flex-wrap items-center justify-between gap-2">
        <div v-if="widget.sizes.length > 1" role="radiogroup" :aria-label="`${t.sizes}: ${widget.title}`" class="flex gap-0.5 rounded-control bg-secondary p-0.5">
          <button
            v-for="option in widget.sizes"
            :key="option"
            type="button"
            role="radio"
            :aria-checked="option === sizeOf(widget)"
            class="h-7 rounded-[calc(var(--radius-control)-2px)] px-2.5 text-caption text-muted-foreground outline-none hover:text-foreground aria-checked:bg-card aria-checked:text-foreground aria-checked:shadow-xs focus-visible:outline-2 focus-visible:outline-nq-focus"
            @click="sizes[widget.id] = option"
          >
            {{ t[option] }}
          </button>
        </div>
        <span v-else />
        <NqButton v-if="props.added.includes(widget.id)" size="sm" variant="secondary" :disabled="!removable" @click="removable && emit('remove', widget.id)">
          <Check aria-hidden="true" />
          {{ removable ? t.remove : t.added }}
        </NqButton>
        <NqButton v-else size="sm" variant="primary" @click="emit('add', widget.id, sizeOf(widget))">
          <Plus aria-hidden="true" />
          {{ t.add }}
        </NqButton>
      </div>
    </article>
  </div>
</template>
