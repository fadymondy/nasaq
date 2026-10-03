<script setup lang="ts">
import { useT } from "../../provider";
import { NqButton } from "../button";

// A button that appends the next batch. `loading` shows a spinner and blocks repeat presses. Same props as NqButton.
defineOptions({ inheritAttrs: false });
withDefaults(defineProps<{ variant?: "primary" | "secondary" | "ghost" | "danger" | "link"; loading?: boolean; disabled?: boolean }>(), { variant: "secondary" });
const t = useT();
</script>

<template>
  <NqButton v-bind="$attrs" data-slot="load-more" :variant="variant" :loading="loading" :disabled="disabled">
    <slot>{{ t("Load more", "تحميل المزيد") }}</slot>
  </NqButton>
</template>
