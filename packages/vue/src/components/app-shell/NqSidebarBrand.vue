<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { resolveBrand } from "../product-mark/brands";
import NqProductLogo from "../product-mark/NqProductLogo.vue";
import NqProductMark from "../product-mark/NqProductMark.vue";
import { useSidebarCollapsed } from "./context";
import NqRailTooltip from "./NqRailTooltip.vue";

/**
 * The product logo at the top of the sidebar, usually a link home. Put it first in `NqSidebarHeader`.
 * Expanded it shows the mark and the name; collapsed, the mark alone, with the name in a tooltip.
 * Override what shows with the `logo` (expanded) and `mark` (collapsed) slots.
 */
interface Props {
  /** Brand for the default logo. Default: the provider's brand. */
  brand?: string;
  /** The link's name while only the mark shows, and its tooltip. Default: the brand's name. */
  label?: string;
  href?: string;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { href: "/" });
defineOptions({ inheritAttrs: false });
const collapsed = useSidebarCollapsed();
const nasaq = useNasaq();
const ar = computed(() => nasaq.locale.value.startsWith("ar"));
const name = computed(() => {
  if (props.label) return props.label;
  if (props.brand) return undefined;
  const manifest = resolveBrand(nasaq.brand.value);
  return manifest ? (ar.value && manifest.name.ar) || manifest.name.en : undefined;
});
</script>

<template>
  <NqRailTooltip :enabled="collapsed && !!name" :content="name">
    <a
      data-slot="sidebar-brand"
      :href="props.href"
      :class="
        cn(
          'flex h-control shrink-0 items-center gap-2 rounded-control px-2 outline-none',
          'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus',
          'group-data-collapsed/sidebar:size-control group-data-collapsed/sidebar:justify-center group-data-collapsed/sidebar:px-0',
          props.class,
        )
      "
      v-bind="$attrs"
      :aria-label="collapsed ? name : ($attrs['aria-label'] as string | undefined)"
    >
      <template v-if="collapsed"><slot name="mark"><NqProductMark :brand="props.brand" :size="20" title="" /></slot></template>
      <template v-else><slot name="logo"><NqProductLogo :brand="props.brand" :size="20" /></slot></template>
    </a>
  </NqRailTooltip>
</template>
