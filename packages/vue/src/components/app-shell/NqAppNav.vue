<script setup lang="ts">
import { Ellipsis } from "lucide-vue-next";
import { ref, useAttrs, useSlots, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useT } from "../../provider";
import { NqDrawer, NqDrawerBody, NqDrawerContent, NqDrawerHeader, NqDrawerTitle, NqDrawerTrigger } from "../drawer";
import NqAppNavScope from "./NqAppNavScope.vue";
import { APP_NAV_BAR_ITEM } from "./variants";
import { flattenSlot, isOn, RenderNodes } from "./vnodes";

/**
 * Section tabs under the header, for apps without a sidebar. Below md they move to a bottom bar
 * (thumb reach): the first `mobileItems` sit on it and the rest open in a drawer behind "More".
 */
interface Props {
  /** Below md the tabs become a bottom bar. This many items fit on it; the rest open behind the "More" button. Default 4. */
  mobileItems?: number;
  /** Label of the bar's overflow button. Default "More" / "المزيد". */
  moreLabel?: string;
  /** `always` (default), or `mobile`: text-only tabs on desktop, icons only on the phone bar and its drawer. */
  icons?: "always" | "mobile";
  class?: HTMLAttributes["class"];
}
defineOptions({ inheritAttrs: false });
const props = withDefaults(defineProps<Props>(), { mobileItems: 4, moreLabel: undefined, icons: "always" });
const slots = useSlots();
const t = useT();
const moreOpen = ref(false);
const attrs = useAttrs();
const label = () => (attrs["aria-label"] as string | undefined) ?? t("Sections", "الأقسام");

// Each placement gets its own vnodes (a vnode can only be mounted once).
const items = () => flattenSlot(slots.default?.()).filter((n) => typeof n.type !== "symbol");
function split() {
  const all = items();
  // With exactly one extra item, show it instead of a "More" that hides a single link.
  const fits = all.length <= props.mobileItems + 1;
  const onBar = fits ? all : all.slice(0, props.mobileItems);
  const overflow = fits ? [] : all.slice(props.mobileItems);
  const overflowActive = overflow.some((n) => isOn((n.props as { active?: unknown } | null)?.active));
  return { onBar, overflow, overflowActive };
}
</script>

<template>
  <nav data-slot="app-nav" :aria-label="label()" :class="cn('shrink-0 border-b border-border bg-background max-md:hidden', props.class)">
    <div class="flex items-center gap-1 overflow-x-auto px-2 [scrollbar-width:none]">
      <NqAppNavScope placement="tabs" :icons="props.icons === 'always'"><slot /></NqAppNavScope>
    </div>
  </nav>
  <nav
    data-slot="app-nav-bar"
    :aria-label="label()"
    class="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm md:hidden"
  >
    <div class="flex items-stretch px-1">
      <NqAppNavScope placement="bar"><RenderNodes :nodes="split().onBar" /></NqAppNavScope>
      <NqDrawer v-if="split().overflow.length" v-model:open="moreOpen">
        <NqDrawerTrigger
          data-slot="app-nav-more"
          :data-active="split().overflowActive ? '' : undefined"
          :class="cn(APP_NAV_BAR_ITEM, split().overflowActive && 'font-medium text-foreground')"
        >
          <Ellipsis aria-hidden="true" />
          <span class="max-w-full truncate">{{ props.moreLabel ?? t("More", "المزيد") }}</span>
        </NqDrawerTrigger>
        <NqDrawerContent>
          <NqDrawerHeader>
            <NqDrawerTitle>{{ props.moreLabel ?? t("More", "المزيد") }}</NqDrawerTitle>
          </NqDrawerHeader>
          <NqDrawerBody>
            <div class="grid gap-0.5 pb-2">
              <NqAppNavScope placement="sheet" :on-navigate="() => (moreOpen = false)"><RenderNodes :nodes="split().overflow" /></NqAppNavScope>
            </div>
          </NqDrawerBody>
        </NqDrawerContent>
      </NqDrawer>
    </div>
  </nav>
</template>
