"use client";

// Ported from mahaam-feedback registry/react/feedback/feedback-launcher.tsx (MIT) onto the Nasaq Button.
import { Button, type ButtonProps, useNasaq } from "@nasaq/web";
import { MessageSquarePlus } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { installDiagnostics, type SubmitFn, type SubmitOptions, submit } from "../core";
import { FEEDBACK_LABELS } from "./labels";
import { ReportDialog, type ReportDialogProps } from "./report-dialog";

export type FeedbackLauncherProps = Omit<ReportDialogProps, "open" | "onOpenChange" | "onSubmit" | "mode" | "initial"> & {
  /** An endpoint (multipart POST) or a submitter such as `mahaamSubmitter(key)`. */
  target: string | SubmitFn;
  submitOptions?: SubmitOptions;
  /** Called after a successful submit, e.g. to toast. */
  onSubmitted?: (result: unknown) => void;
  /** Replaces the default icon + label inside the button. */
  children?: ReactNode;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
};

/**
 * A button that opens the reporter. Installs the console/network recorder on mount; mount it (or call
 * `installDiagnostics()`) early so the log covers what happened before the report. For a menu item, render
 * `ReportDialog` directly and open it from the item.
 */
export function FeedbackLauncher({
  target,
  submitOptions,
  onSubmitted,
  children,
  variant = "secondary",
  size = "sm",
  className,
  ...dialog
}: FeedbackLauncherProps) {
  const [open, setOpen] = useState(false);
  const { locale } = useNasaq();
  useEffect(() => installDiagnostics(), []);
  const label = dialog.labels?.launcher ?? FEEDBACK_LABELS[dialog.locale ?? (locale === "ar" ? "ar" : "en")].launcher;
  const iconOnly = size === "icon" || size === "icon-sm";

  return (
    <>
      <Button
        data-slot="feedback-launcher"
        variant={variant}
        size={size}
        className={className}
        aria-label={iconOnly ? label : undefined}
        onClick={() => setOpen(true)}
      >
        {children ?? (
          <>
            <MessageSquarePlus />
            {iconOnly ? null : label}
          </>
        )}
      </Button>
      <ReportDialog
        {...dialog}
        open={open}
        onOpenChange={setOpen}
        onSubmit={async (payload) => onSubmitted?.(await submit(target, payload, submitOptions))}
      />
    </>
  );
}
