"use client";

import { CircleCheck, CircleX, Clock, MinusCircle } from "lucide-react";
import { cn } from "../../lib/cn";
import { Spinner } from "../spinner";
import type { WorkflowStatus } from "./workflow-model";

const STATUS_TONE: Record<WorkflowStatus, string> = {
  idle: "text-muted-foreground",
  running: "text-nq-info-text",
  success: "text-nq-success-text",
  error: "text-nq-danger-text",
  skipped: "text-muted-foreground",
  waiting: "text-nq-warning-text",
};

/** Every status has its own shape, so state never relies on colour alone. */
export function StatusGlyph({ status, label, className }: { status: WorkflowStatus; label?: string; className?: string }) {
  const cls = cn("size-4 shrink-0", STATUS_TONE[status], className);
  const a11y = label ? { role: "img", "aria-label": label } : { "aria-hidden": true };
  if (status === "running") return <Spinner className={cls} label={label} />;
  const Icon = status === "success" ? CircleCheck : status === "error" ? CircleX : status === "skipped" ? MinusCircle : status === "waiting" ? Clock : null;
  if (!Icon) return null;
  return <Icon className={cls} {...a11y} />;
}
