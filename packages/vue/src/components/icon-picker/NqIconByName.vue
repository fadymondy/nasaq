<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { ICON_CATALOG, type IconEntry } from "./icon-catalog";
import { boxiconClass, findIcon, isIconUrl } from "./icon-picker";

// <NqIconByName :name="icon" class="size-6" />
interface Props {
  /**
   * An icon name (`users`, `Users`, `lucide:users`), a Boxicons name (`bx:home`, `bxl:github`, `bx-home`; needs the
   * Boxicons CSS on the page) or an image URL (`https://…`, `/…`, `data:image/…`).
   */
  name: string | null | undefined;
  icons?: readonly IconEntry[];
  size?: number;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { icons: () => ICON_CATALOG, size: undefined });
const url = computed(() => (props.name && isIconUrl(props.name) ? props.name : null));
const bx = computed(() => (url.value ? undefined : boxiconClass(props.name)));
const Found = computed(() => (url.value || bx.value ? undefined : findIcon(props.name, props.icons)?.icon));
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
  <i
    v-else-if="bx"
    aria-hidden="true"
    data-slot="icon-boxicon"
    :class="cn('bx inline-block shrink-0 not-italic', bx, props.class)"
    :style="{ fontSize: props.size === undefined ? '1em' : props.size + 'px', lineHeight: 1 }"
  />
  <component :is="Found" v-else-if="Found" aria-hidden="true" :size="props.size" :class="props.class" />
  <slot v-else />
</template>
