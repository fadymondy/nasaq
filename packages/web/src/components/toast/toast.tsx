"use client";

import type { ComponentProps } from "react";
import { Toaster as Sonner, toast } from "sonner";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";

export { toast };

const nasaqClassNames: Record<string, string> = {
  toast:
    "!rounded-floating !border !border-border !bg-popover !text-popover-foreground !shadow-floating !font-sans !text-body-sm !gap-2",
  description: "!text-muted-foreground",
  actionButton: "!rounded-control !bg-primary !text-primary-foreground",
  cancelButton: "!rounded-control !bg-secondary !text-foreground",
  success: "[&_[data-icon]]:!text-nq-success-text",
  error: "[&_[data-icon]]:!text-nq-danger-text",
  warning: "[&_[data-icon]]:!text-nq-warning-text",
};

/**
 * Sonner, themed from Nasaq tokens and mirrored for RTL (the toast stack sits at the inline end).
 * Mount it once near the app root; nothing mounts it for you.
 */
export function Toaster({ toastOptions, ...props }: ComponentProps<typeof Sonner>) {
  const nasaq = useOptionalNasaq();
  const rtl = nasaq?.isRtl ?? false;
  const ar = nasaq?.locale.startsWith("ar") ?? false;

  // Merge the caller's classNames with ours per slot instead of replacing them.
  const callerClassNames = (toastOptions?.classNames ?? {}) as Record<string, string | undefined>;
  const classNames: Record<string, string> = { ...nasaqClassNames };
  for (const [key, value] of Object.entries(callerClassNames)) {
    if (value) classNames[key] = cn(nasaqClassNames[key], value);
  }

  return (
    <Sonner
      theme={nasaq?.resolvedTheme ?? "system"}
      dir={rtl ? "rtl" : "ltr"}
      position={rtl ? "bottom-left" : "bottom-right"}
      containerAriaLabel={ar ? "الإشعارات" : "Notifications"}
      {...props}
      toastOptions={{ ...toastOptions, classNames }}
    />
  );
}
