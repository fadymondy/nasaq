<script setup lang="ts">
import { computed, getCurrentInstance, type Component, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { toneText, type GlanceTone } from "./strings";

defineOptions({ inheritAttrs: false });

interface Props {
  /** A lucide icon component. */
  icon?: Component;
  label: string;
  /** The figure or state at the inline end. Numbers keep their own direction. Or use the `value` slot. */
  value?: string | number;
  /** A second line under the label. */
  detail?: string;
  tone?: GlanceTone;
  /** Makes the row a button. Also on when a `@select` listener is set. */
  selectable?: boolean;
  /** Smaller type and tighter padding, for a watch. */
  dense?: boolean;
  class?: HTMLAttributes["class"];
}

const props = withDefaults(defineProps<Props>(), { tone: "neutral", selectable: false, dense: false, value: undefined });
const emit = defineEmits<{ select: [] }>();
const instance = getCurrentInstance();
const isButton = computed(() => props.selectable || typeof instance?.vnode.props?.onSelect !== "undefined");
const iconTone = computed(() => (props.tone === "neutral" ? "text-muted-foreground" : toneText[props.tone]));
const base = computed(() => cn("flex w-full items-center gap-2.5 rounded-control", props.dense ? "px-2 py-1" : "px-3 py-2"));
</script>

<template>
  <div v-if="isButton" data-slot="glance-row" :class="props.class" v-bind="$attrs">
    <button type="button" :class="cn(base, 'outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus')" @click="emit('select')">
      <component :is="props.icon" v-if="props.icon" aria-hidden="true" :class="cn('shrink-0', props.dense ? 'size-4' : 'size-[18px]', iconTone)" />
      <span class="min-w-0 flex-1 text-start">
        <span :class="cn('block truncate text-foreground', props.dense ? 'text-caption' : 'text-label')">{{ props.label }}</span>
        <span v-if="props.detail" class="block truncate text-caption text-muted-foreground">{{ props.detail }}</span>
      </span>
      <span v-if="props.value !== undefined || $slots.value" :class="cn('shrink-0 tabular-nums', props.dense ? 'text-caption font-medium' : 'text-label font-medium', toneText[props.tone])"><slot name="value">{{ props.value }}</slot></span>
    </button>
  </div>
  <div v-else data-slot="glance-row" :class="cn(base, props.class)" v-bind="$attrs">
    <component :is="props.icon" v-if="props.icon" aria-hidden="true" :class="cn('shrink-0', props.dense ? 'size-4' : 'size-[18px]', iconTone)" />
    <span class="min-w-0 flex-1 text-start">
      <span :class="cn('block truncate text-foreground', props.dense ? 'text-caption' : 'text-label')">{{ props.label }}</span>
      <span v-if="props.detail" class="block truncate text-caption text-muted-foreground">{{ props.detail }}</span>
    </span>
    <span v-if="props.value !== undefined || $slots.value" :class="cn('shrink-0 tabular-nums', props.dense ? 'text-caption font-medium' : 'text-label font-medium', toneText[props.tone])"><slot name="value">{{ props.value }}</slot></span>
  </div>
</template>
