<script setup lang="ts">
import { X } from "lucide-vue-next";
import { DialogClose, DialogContent, DialogOverlay, DialogPortal, injectDialogRootContext } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { presence } from "../../lib/presence";
import { useT } from "../../provider";
import { overlayCloseClass } from "../dialog/variants";
import { sheetBackdropClass, sheetVariants, type SheetVariants } from "./variants";

interface Props {
  /** The edge the panel slides from. Logical: "end" is the right edge in LTR, the left in RTL. Default "end". */
  side?: NonNullable<SheetVariants["side"]>;
  showClose?: boolean;
  /** Label for the close button. Defaults to "Close" / "إغلاق" by the Nasaq locale. */
  closeLabel?: string;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { side: "end", showClose: true });
defineOptions({ inheritAttrs: false });
const root = injectDialogRootContext();
const t = useT();
</script>

<template>
  <DialogPortal>
    <Transition v-bind="presence">
      <DialogOverlay v-if="root.open.value" force-mount data-slot="sheet-backdrop" :class="cn(sheetBackdropClass)" />
    </Transition>
    <Transition v-bind="presence">
      <DialogContent
        v-if="root.open.value"
        force-mount
        data-slot="sheet-content"
        :data-side="props.side"
        v-bind="$attrs"
        :class="cn(sheetVariants({ side: props.side }), props.class)"
      >
        <slot />
        <DialogClose v-if="props.showClose" data-slot="sheet-close" :aria-label="props.closeLabel ?? t('Close', 'إغلاق')" :class="overlayCloseClass">
          <X />
        </DialogClose>
      </DialogContent>
    </Transition>
  </DialogPortal>
</template>
