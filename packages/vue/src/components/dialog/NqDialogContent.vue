<script setup lang="ts">
import { X } from "lucide-vue-next";
import { DialogClose, DialogContent, DialogOverlay, DialogPortal, injectDialogRootContext } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { presence } from "../../lib/presence";
import { useT } from "../../provider";
import { fade, overlayCloseClass } from "./variants";

interface Props {
  /** Render the close (×) button in the header corner. */
  showClose?: boolean;
  /** Label for the close button. Defaults to "Close" / "إغلاق" by the Nasaq locale. */
  closeLabel?: string;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { showClose: true });
defineOptions({ inheritAttrs: false });
const root = injectDialogRootContext();
const t = useT();
</script>

<template>
  <DialogPortal>
    <Transition v-bind="presence">
      <DialogOverlay
        v-if="root.open.value"
        force-mount
        data-slot="dialog-backdrop"
        :class="cn('fixed inset-0 z-50 bg-nq-fg/15 dark:bg-nq-bg/60', fade)"
      />
    </Transition>
    <Transition v-bind="presence">
      <DialogContent
        v-if="root.open.value"
        force-mount
        data-slot="dialog-content"
        v-bind="$attrs"
        :class="
          cn(
            'fixed inset-0 z-50 m-auto grid h-fit w-[calc(100%-2rem)] max-w-lg gap-4',
            'rounded-floating border border-border bg-popover p-6 text-popover-foreground outline-none',
            'max-h-[calc(100dvh-2rem)] overflow-y-auto',
            fade,
            props.class,
          )
        "
      >
        <slot />
        <DialogClose v-if="props.showClose" data-slot="dialog-close" :aria-label="props.closeLabel ?? t('Close', 'إغلاق')" :class="overlayCloseClass">
          <X />
        </DialogClose>
      </DialogContent>
    </Transition>
  </DialogPortal>
</template>
