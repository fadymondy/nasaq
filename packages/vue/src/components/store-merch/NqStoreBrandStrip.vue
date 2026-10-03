<script setup lang="ts">
import { computed, getCurrentInstance, type HTMLAttributes } from "vue";
import { merchFill, useMerchStrings, type MerchLabels } from "./strings";
import type { StoreBrand } from "./types";

// A calm row of brand names or official logos. Brands link to their shop page when `href` is set or a `select` listener is bound.
interface Props {
  brands: readonly StoreBrand[];
  /** Heading. Pass `null` to hide it. Default "Our brands". */
  title?: string | null;
  labels?: MerchLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { title: undefined, labels: undefined });
const emit = defineEmits<{ select: [brand: StoreBrand] }>();
const instance = getCurrentInstance();
const hasSelect = computed(() => Boolean((instance?.vnode.props as Record<string, unknown> | null | undefined)?.onSelect));
const { t } = useMerchStrings(() => props.labels);
const heading = computed(() => (props.title === undefined ? t.value.brands : props.title));
</script>

<template>
  <section
    v-if="props.brands.length"
    data-slot="store-brand-strip"
    :aria-label="heading ? undefined : t.brands"
    :aria-labelledby="heading ? 'store-brands-h' : undefined"
    :class="props.class"
  >
    <h2 v-if="heading" id="store-brands-h" class="mb-3 text-center text-label text-muted-foreground"><slot name="title">{{ heading }}</slot></h2>
    <ul class="m-0 flex list-none flex-wrap items-center justify-center gap-x-8 gap-y-3 p-0">
      <li v-for="b in props.brands" :key="b.id">
        <component
          :is="b.href || hasSelect ? 'a' : 'span'"
          :href="b.href || hasSelect ? (b.href ?? '#') : undefined"
          :aria-label="b.href || hasSelect ? merchFill(t.brandLink, { name: b.name }) : undefined"
          :class="
            b.href || hasSelect
              ? 'inline-flex min-h-control items-center rounded-control px-2 text-muted-foreground no-underline outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus'
              : 'inline-flex min-h-control items-center px-2 text-muted-foreground'
          "
          @click="(b.href || hasSelect) && emit('select', b)"
        >
          <img v-if="b.logo" :src="b.logo" :alt="b.name" loading="lazy" class="h-8 w-auto max-w-28 object-contain grayscale transition hover:grayscale-0 motion-reduce:transition-none" />
          <span v-else class="text-h3 font-semibold tracking-tight">{{ b.name }}</span>
        </component>
      </li>
    </ul>
  </section>
</template>
