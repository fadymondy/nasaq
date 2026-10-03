<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqBadge } from "../badge";
import {
  NqNavigationMenu,
  NqNavigationMenuContent,
  NqNavigationMenuFeatured,
  NqNavigationMenuItem,
  NqNavigationMenuLabel,
  NqNavigationMenuLink,
  NqNavigationMenuList,
  NqNavigationMenuTrigger,
} from "../navigation-menu";
import { NqStoreProductImage } from "../store-listing";
import type { StoreNavItem } from "./types";
import { useStoreChromeStrings, type StoreChromeLabels } from "./strings";

// The desktop category navigation. Items with columns open one shared panel of link columns and a featured tile; it opens
// on hover, focus or Enter, and arrow keys move between items.
const props = defineProps<{
  items: readonly StoreNavItem[];
  /** Id of the current section, for aria-current. */
  currentId?: string;
  labels?: StoreChromeLabels;
  class?: HTMLAttributes["class"];
}>();
const { t } = useStoreChromeStrings(() => props.labels);
const linkClass =
  "inline-flex h-control items-center rounded-control px-3 text-label text-foreground no-underline outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus data-popup-open:bg-nq-hover";
const tone = (i: StoreNavItem) => (i.highlight ? "text-nq-danger-text" : "");
const plain = (i: StoreNavItem) => !(i.columns?.length || i.featured);
const cols = (i: StoreNavItem) => i.columns ?? [];
const gridCols = (i: StoreNavItem) => `repeat(${Math.min(Math.max(cols(i).length, 1), 4)}, minmax(9rem, 1fr))`;
const colLink =
  "flex items-center gap-2 rounded-control px-2 py-1.5 text-body-sm text-foreground no-underline outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus";
const viewAllClass =
  "mt-1 inline-flex rounded-control px-2 py-1.5 text-body-sm font-medium text-foreground underline underline-offset-4 outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus";
</script>

<template>
  <nav :aria-label="t.mainNavigation" data-slot="store-mega-menu" :class="props.class">
    <NqNavigationMenu align="start" :side-offset="6">
      <NqNavigationMenuList>
        <NqNavigationMenuItem v-for="item in props.items" :key="item.id" :value="item.id">
          <NqNavigationMenuLink v-if="plain(item)" :href="item.href ?? '#'" :active="item.id === props.currentId" :class="cn(linkClass, tone(item))">
            {{ item.label }}
          </NqNavigationMenuLink>
          <template v-else>
            <NqNavigationMenuTrigger :class="cn(linkClass, tone(item))">{{ item.label }}</NqNavigationMenuTrigger>
            <NqNavigationMenuContent>
              <div class="flex min-w-[34rem] max-w-[56rem] gap-6 p-5">
                <div class="grid flex-1 gap-x-8 gap-y-4" :style="{ gridTemplateColumns: gridCols(item) }">
                  <div v-for="col in cols(item)" :key="col.title" class="flex min-w-0 flex-col gap-1">
                    <NqNavigationMenuLabel class="px-0">{{ col.title }}</NqNavigationMenuLabel>
                    <ul class="m-0 flex list-none flex-col p-0">
                      <li v-for="l in col.links" :key="l.href + l.label">
                        <NqNavigationMenuLink :href="l.href" :class="colLink">
                          {{ l.label }}
                          <NqBadge v-if="l.badge" variant="accent">{{ l.badge }}</NqBadge>
                        </NqNavigationMenuLink>
                      </li>
                      <li v-if="col.viewAll">
                        <NqNavigationMenuLink :href="col.viewAll.href" :class="viewAllClass">{{ col.viewAll.label }}</NqNavigationMenuLink>
                      </li>
                    </ul>
                  </div>
                </div>
                <NqNavigationMenuFeatured v-if="item.featured" :href="item.featured.href" class="w-56 shrink-0 justify-start p-0">
                  <span class="aspect-[4/3] w-full overflow-hidden rounded-t-card bg-secondary">
                    <NqStoreProductImage :src="item.featured.image" alt="" />
                  </span>
                  <span class="flex flex-col gap-0.5 p-3">
                    <span class="text-label text-foreground">{{ item.featured.title }}</span>
                    <span v-if="item.featured.description" class="text-body-sm text-muted-foreground">{{ item.featured.description }}</span>
                  </span>
                </NqNavigationMenuFeatured>
              </div>
            </NqNavigationMenuContent>
          </template>
        </NqNavigationMenuItem>
      </NqNavigationMenuList>
    </NqNavigationMenu>
  </nav>
</template>
