<script setup lang="ts">
import { ref, type Component, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { nextTabIndex } from "./mobile-nav-math";
import { useMobileNav, type MobileNavLabels } from "./strings";

export interface BottomTabBarItem {
  value: string;
  label: string;
  /** A lucide-vue-next icon component. */
  icon: Component;
  /** A count or short text on the icon. 0 and empty hide it. */
  badge?: number | string;
  /** Renders a link instead of a button. */
  href?: string;
}

// A bottom tab bar for phones: 3 to 5 destinations, an icon over a label, a badge, and room for the home indicator.
interface Props {
  items: readonly BottomTabBarItem[];
  /** v-model: the active tab. */
  modelValue: string;
  /** `sticky` (default) sits at the bottom of its scroll parent, `fixed` at the bottom of the screen, `static` in flow. */
  position?: "sticky" | "fixed" | "static";
  labels?: MobileNavLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { position: "sticky", labels: undefined });
const emit = defineEmits<{ "update:modelValue": [value: string] }>();
const { t, rtl } = useMobileNav(() => props.labels);

const refs = ref<(HTMLElement | null)[]>([]);
const hasActive = () => props.items.some((i) => i.value === props.modelValue);
function onKeyDown(event: KeyboardEvent, index: number) {
  const next = nextTabIndex(index, props.items.length, event.key, rtl.value);
  if (next === null) return;
  event.preventDefault();
  refs.value[next]?.focus();
}
const hasBadge = (item: BottomTabBarItem) => item.badge !== undefined && item.badge !== 0 && item.badge !== "";
const tabClass =
  "relative flex min-h-14 w-full flex-col items-center justify-center gap-0.5 rounded-control px-2 py-1.5 text-caption text-muted-foreground outline-none transition-colors duration-150 ease-nq hover:text-foreground data-active:text-primary focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus";
</script>

<template>
  <nav
    data-slot="bottom-tab-bar"
    :aria-label="t.navigation"
    :class="
      cn(
        'z-30 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] text-foreground',
        props.position === 'sticky' && 'sticky bottom-0',
        props.position === 'fixed' && 'fixed inset-x-0 bottom-0',
        props.class,
      )
    "
  >
    <ul class="flex items-stretch justify-around px-1">
      <li v-for="(item, index) in props.items" :key="item.value" class="min-w-0 flex-1">
        <component
          :is="item.href ? 'a' : 'button'"
          :ref="(el: unknown) => (refs[index] = (el as HTMLElement | null))"
          :href="item.href"
          :type="item.href ? undefined : 'button'"
          :data-active="item.value === props.modelValue ? '' : undefined"
          :aria-current="item.value === props.modelValue ? 'page' : undefined"
          :tabindex="item.value === props.modelValue || (!hasActive() && index === 0) ? 0 : -1"
          :class="tabClass"
          @keydown="onKeyDown($event, index)"
          @click="emit('update:modelValue', item.value)"
        >
          <span class="relative">
            <component :is="item.icon" aria-hidden="true" class="size-5" :stroke-width="item.value === props.modelValue ? 2.2 : 1.7" />
            <span
              v-if="hasBadge(item)"
              data-slot="bottom-tab-badge"
              class="absolute -top-1.5 -end-2.5 grid min-w-4 place-items-center rounded-full bg-nq-danger px-1 text-[10px] leading-4 font-medium text-background"
            >
              {{ item.badge }}
            </span>
          </span>
          <span class="max-w-full truncate">{{ item.label }}</span>
        </component>
      </li>
    </ul>
  </nav>
</template>
