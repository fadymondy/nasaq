<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import type { Presence } from "./profile-model";
import { STRINGS, type ProfileCardLabels } from "./strings";

// A small status dot. Not colour alone: offline is a hollow ring, and the state is spoken.
interface Props {
  presence: Presence;
  /** Hides the state from assistive tech when it is already written next to the dot. */
  decorative?: boolean;
  labels?: Partial<ProfileCardLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { decorative: false });

const dotClass: Record<Presence, string> = {
  online: "bg-nq-success",
  away: "bg-nq-warning",
  busy: "bg-nq-danger",
  offline: "bg-popover ring-1 ring-inset ring-muted-foreground",
};
const nq = useNasaq();
const t = computed(() => ({ ...STRINGS[nq.locale.value.startsWith("ar") ? "ar" : "en"], ...props.labels }));
</script>

<template>
  <span
    data-slot="presence-dot"
    :data-presence="props.presence"
    :role="props.decorative ? undefined : 'img'"
    :aria-label="props.decorative ? undefined : t[props.presence]"
    :aria-hidden="props.decorative || undefined"
    :class="cn('inline-block size-2.5 shrink-0 rounded-full', dotClass[props.presence], props.class)"
  />
</template>
