<script setup lang="ts">
import { AlertDialogOverlay, injectDialogRootContext } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { presence } from "../../lib/presence";
import { fade } from "../dialog/variants";

const props = defineProps<{ class?: HTMLAttributes["class"] }>();
const root = injectDialogRootContext();
</script>

<template>
  <Transition v-bind="presence">
    <AlertDialogOverlay
      v-if="root.open.value"
      force-mount
      data-slot="alert-dialog-backdrop"
      :class="cn('fixed inset-0 z-50 bg-nq-fg/15 dark:bg-nq-bg/60', fade, props.class)"
    />
  </Transition>
</template>
