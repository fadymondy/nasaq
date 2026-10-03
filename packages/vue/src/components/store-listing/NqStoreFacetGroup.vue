<script setup lang="ts">
import { ChevronDown } from "lucide-vue-next";
import { ref } from "vue";
import { cn } from "../../lib/cn";

// One collapsible group of the facet sidebar. Internal to store-listing.
interface Props {
  title: string;
  defaultOpen?: boolean;
}
const props = withDefaults(defineProps<Props>(), { defaultOpen: true });
const open = ref(props.defaultOpen);
</script>

<template>
  <section class="border-b border-border py-3 last:border-b-0" data-slot="store-facet-group">
    <h3>
      <button
        type="button"
        :aria-expanded="open"
        class="flex w-full items-center justify-between gap-2 rounded-sm py-1 text-start text-label text-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus"
        @click="open = !open"
      >
        {{ props.title }}
        <ChevronDown aria-hidden="true" :class="cn('size-4 text-muted-foreground transition-transform motion-reduce:transition-none', open && 'rotate-180')" />
      </button>
    </h3>
    <div v-if="open" class="pt-2"><slot /></div>
  </section>
</template>
