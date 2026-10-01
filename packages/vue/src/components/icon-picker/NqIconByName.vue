<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { ICON_CATALOG, type IconEntry } from "./icon-catalog";
import { findIcon, isIconUrl } from "./icon-picker";

// <NqIconByName :name="icon" class="size-6" />
interface Props {
  /** An icon name (`users`, `Users`, `lucide:users`) or an image URL (`https://…`, `/…`, `data:image/…`). */
  name: string | null | undefined;
  icons?: readonly IconEntry[];
  size?: number;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { icons: () => ICON_CATALOG, size: undefined });
const url = computed(() => (props.name && isIconUrl(props.name) ? props.name : null));
const Found = computed(() => (url.value ? undefined : findIcon(props.name, props.icons)?.icon));
</script>

<template>
  <img
    v-if="url"
    :src="url"
    alt=""
    aria-hidden="true"
    data-slot="icon-image"
    :width="props.size"
    :height="props.size"
    :class="cn('inline-block shrink-0 object-contain', props.size === undefined && 'size-4', props.class)"
  />
  <component :is="Found" v-else-if="Found" aria-hidden="true" :size="props.size" :class="props.class" />
  <slot v-else />
</template>
