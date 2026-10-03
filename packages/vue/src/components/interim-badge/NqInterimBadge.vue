<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqBadge } from "../badge";
import { NqSpinner } from "../spinner";

// Marks content that is partial and still arriving: a streamed answer, a total before every source reported, a draft
// figure. A small outlined badge with a spinner and a word, so it never relies on motion alone.
interface Props {
  /** Default "Interim" / "مبدئي" by locale. */
  label?: string;
  /** Stop the spinner once nothing more is coming, keeping the badge. Default `true`. */
  pending?: boolean;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { label: undefined, pending: true });
const nq = useNasaq();
const text = computed(() => props.label ?? (nq.locale.value.startsWith("ar") ? "مبدئي" : "Interim"));
</script>

<template>
  <NqBadge data-slot="interim-badge" :data-pending="props.pending ? 'true' : undefined" variant="outline" :class="cn('border-nq-brand/40 text-foreground', props.class)">
    <NqSpinner v-if="props.pending" class="size-3" />
    <slot>{{ text }}</slot>
  </NqBadge>
</template>
