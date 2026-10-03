<script setup lang="ts">
import { useSlots, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useT } from "../../provider";
import { flattenSlot, RenderNodes } from "./vnodes";

/** Where you are, as a path: organisation / project / environment. Put it in `NqAppHeader`. Below md only the last step shows. */
const props = defineProps<{ class?: HTMLAttributes["class"] }>();
const slots = useSlots();
const t = useT();
const items = () => flattenSlot(slots.default?.());
</script>

<template>
  <nav data-slot="app-breadcrumbs" :aria-label="t('Breadcrumb', 'المسار')" :class="cn('min-w-0', props.class)">
    <ol class="flex min-w-0 items-center gap-1">
      <template v-for="(node, i) in items()" :key="i">
        <li :class="cn('flex min-w-0 items-center gap-1', i < items().length - 1 && 'max-md:hidden')">
          <span v-if="i > 0" aria-hidden="true" class="select-none px-0.5 text-body text-nq-line-strong max-md:hidden">/</span>
          <RenderNodes :nodes="[node]" />
        </li>
      </template>
    </ol>
  </nav>
</template>
