<script setup lang="ts">
import { computed, getCurrentInstance, useAttrs, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import NqCourierCard from "./NqCourierCard.vue";
import { STRINGS, type CourierCardLabels } from "./strings";
import type { CourierItem } from "./types";

defineOptions({ inheritAttrs: false });

interface Props {
  /** Pass the couriers already sorted (nearest first, offline last). */
  couriers: readonly CourierItem[];
  /** Id of the selected courier (`v-model:selectedId`). */
  selectedId?: string | null;
  locale?: string;
  labels?: CourierCardLabels;
  class?: HTMLAttributes["class"];
}

const props = defineProps<Props>();
const emit = defineEmits<{ selectCourier: [id: string]; "update:selectedId": [id: string] }>();
const attrs = useAttrs();
const instance = getCurrentInstance();
const selectable = computed(() => typeof instance?.vnode.props?.onSelectCourier !== "undefined" || typeof instance?.vnode.props?.["onUpdate:selectedId"] !== "undefined");

const nq = useNasaq();
const locale = computed(() => props.locale ?? nq.locale.value);
const t = computed(() => ({ ...STRINGS[locale.value.startsWith("ar") ? "ar" : "en"], ...props.labels }));
const label = computed(() => (attrs["aria-label"] as string | undefined) ?? t.value.couriers);
const rest = computed(() => {
  const { "aria-label": _label, ...others } = attrs;
  return others;
});
const pick = (id: string) => {
  emit("selectCourier", id);
  emit("update:selectedId", id);
};
</script>

<template>
  <ul role="list" data-slot="courier-list" :aria-label="label" :class="cn('flex flex-col gap-2', props.class)" v-bind="rest">
    <li v-for="{ id, ...card } in props.couriers" :key="id">
      <NqCourierCard v-bind="card" :locale="locale" :labels="props.labels" :selected="props.selectedId === id" :selectable="selectable" @select="pick(id)">
        <template v-if="$slots.actions" #actions><slot name="actions" :courier="{ id, ...card }" /></template>
      </NqCourierCard>
    </li>
  </ul>
</template>
