<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { bulletText, lines } from "./presentation-math";

// One text block of a slide: a borderless auto-growing textarea while editing, plain text or a bullet list when presenting.
interface Props {
  value?: string;
  editable?: boolean;
  placeholder?: string;
  bullets?: boolean;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { value: undefined, editable: false, placeholder: undefined, bullets: false });
const emit = defineEmits<{ change: [value: string] }>();
const items = computed(() => lines(props.value));
</script>

<template>
  <textarea
    v-if="props.editable"
    rows="1"
    dir="auto"
    :value="props.value ?? ''"
    :placeholder="props.placeholder"
    :aria-label="props.placeholder"
    :class="
      cn(
        'block w-full min-w-0 resize-none rounded-[0.6cqw] border-0 bg-transparent p-0 text-start text-[length:inherit] leading-[inherit] [field-sizing:content]',
        'placeholder:text-current placeholder:opacity-40 outline-none focus-visible:outline-2 focus-visible:outline-offset-[0.6cqw] focus-visible:outline-nq-focus',
        props.class,
      )
    "
    @input="emit('change', ($event.target as HTMLTextAreaElement).value)"
  />
  <template v-else-if="items.length > 0">
    <ul v-if="props.bullets" dir="auto" :class="cn('list-disc space-y-[1cqw] ps-[3cqw] text-start marker:opacity-60', props.class)">
      <li v-for="(l, i) in items" :key="`${i}-${l}`">{{ bulletText(l) }}</li>
    </ul>
    <p v-else dir="auto" :class="cn('whitespace-pre-line text-start', props.class)">{{ props.value }}</p>
  </template>
</template>
