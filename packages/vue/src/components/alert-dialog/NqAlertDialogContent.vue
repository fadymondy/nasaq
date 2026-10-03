<script setup lang="ts">
import { AlertDialogContent, AlertDialogPortal, injectDialogRootContext } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { presence } from "../../lib/presence";
import { fade } from "../dialog/variants";
import NqAlertDialogBackdrop from "./NqAlertDialogBackdrop.vue";

// Portal + backdrop + popup. No × button and no outside-press dismissal: the user must pick an answer.
// Put NqAlertDialogCancel first in the footer; it takes initial focus so Enter never destroys.
const props = defineProps<{ class?: HTMLAttributes["class"] }>();
defineOptions({ inheritAttrs: false });
const root = injectDialogRootContext();
</script>

<template>
  <AlertDialogPortal>
    <NqAlertDialogBackdrop />
    <Transition v-bind="presence">
      <AlertDialogContent
        v-if="root.open.value"
        force-mount
        data-slot="alert-dialog-content"
        v-bind="$attrs"
        :class="
          cn(
            'fixed inset-0 z-50 m-auto grid h-fit w-[calc(100%-2rem)] max-w-md gap-4',
            'rounded-floating border border-border bg-popover p-6 text-popover-foreground outline-none',
            'max-h-[calc(100dvh-2rem)] overflow-y-auto',
            fade,
            props.class,
          )
        "
      >
        <slot />
      </AlertDialogContent>
    </Transition>
  </AlertDialogPortal>
</template>
