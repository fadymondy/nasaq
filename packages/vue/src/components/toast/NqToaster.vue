<script setup lang="ts">
import { computed, useAttrs } from "vue";
import { Toaster, type ToasterProps } from "vue-sonner";
import { cn } from "../../lib/cn";
import { useNasaq, useT } from "../../provider";

// vue-sonner, themed from Nasaq tokens and mirrored for RTL (the toast stack sits at the inline end).
// Mount it once near the app root; nothing mounts it for you. Import "vue-sonner/style.css" once.
// Every vue-sonner Toaster prop is accepted (position, duration, richColors, closeButton, toastOptions ...).
defineOptions({ inheritAttrs: false });
const attrs = useAttrs() as Partial<ToasterProps>;
const nasaq = useNasaq();
const t = useT();

const nasaqClassNames: Record<string, string> = {
  toast: "!rounded-floating !border !border-border !bg-popover !text-popover-foreground !shadow-floating !font-sans !text-body-sm !gap-2",
  description: "!text-muted-foreground",
  actionButton: "!rounded-control !bg-primary !text-primary-foreground",
  cancelButton: "!rounded-control !bg-secondary !text-foreground",
  success: "[&_[data-icon]]:!text-nq-success-text",
  error: "[&_[data-icon]]:!text-nq-danger-text",
  warning: "[&_[data-icon]]:!text-nq-warning-text",
};

// Merge the caller's classes with ours per slot instead of replacing them.
const toastOptions = computed(() => {
  const caller = (attrs.toastOptions?.classes ?? {}) as Record<string, string | undefined>;
  const classes: Record<string, string> = { ...nasaqClassNames };
  for (const [key, value] of Object.entries(caller)) if (value) classes[key] = cn(nasaqClassNames[key], value);
  return { ...attrs.toastOptions, classes };
});
</script>

<template>
  <Toaster
    :theme="nasaq.resolvedTheme.value"
    :dir="nasaq.isRtl.value ? 'rtl' : 'ltr'"
    :position="nasaq.isRtl.value ? 'bottom-left' : 'bottom-right'"
    :container-aria-label="t('Notifications', 'الإشعارات')"
    v-bind="{ ...attrs, toastOptions: undefined }"
    :toast-options="toastOptions"
  />
</template>
