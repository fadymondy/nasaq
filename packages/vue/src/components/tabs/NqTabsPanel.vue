<script setup lang="ts">
import { TabsContent } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

// The content for one tab.
interface Props {
  value: string | number;
  forceMount?: boolean;
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
</script>

<template>
  <TabsContent
    data-slot="tabs-panel"
    :value="props.value"
    :force-mount="props.forceMount"
    :class="cn('outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus', props.class)"
  >
    <slot />
  </TabsContent>
</template>
