"use client";
export type FeedbackLauncherShape = "pill" | "circle" | "tab";

export type FeedbackLauncherPosition = "bottom-end" | "bottom-start" | "top-end" | "top-start" | "edge-end" | "edge-start";

export const FEEDBACK_SHAPES: readonly FeedbackLauncherShape[] = ["pill", "circle", "tab"];
export const FEEDBACK_POSITIONS: readonly FeedbackLauncherPosition[] = ["bottom-end", "bottom-start", "top-end", "top-start", "edge-end", "edge-start"];

export interface FeedbackLauncherConfig {
  shape: FeedbackLauncherShape;
  position: FeedbackLauncherPosition;
  /** The words on the pill and the tab, and the accessible name of the circle. */
  label: string;
}

export type FeedbackSnippetFormat = "react" | "json";

/**
 * A tab hugs a screen edge, so a corner position becomes the edge on the same side. A pill or circle in an edge
 * position sits in the bottom corner of that side. Pure.
 */
export function normalizePosition(shape: FeedbackLauncherShape, position: FeedbackLauncherPosition): FeedbackLauncherPosition {
  const side = position.endsWith("start") ? "start" : "end";
  if (shape === "tab") return `edge-${side}`;
  if (position.startsWith("edge")) return `bottom-${side}`;
  return position;
}

/**
 * The code that installs the configured launcher next to `@nasaq/feedback`'s report dialog, or the plain config as
 * JSON. The public key is read from an env variable in the code sample, never written into it. Pure.
 */
export function feedbackInstallSnippet(config: FeedbackLauncherConfig, format: FeedbackSnippetFormat = "react"): string {
  const position = normalizePosition(config.shape, config.position);
  if (format === "json") return JSON.stringify({ shape: config.shape, position, label: config.label }, null, 2);
  const label = config.label.replace(/"/g, "&quot;");
  return [
    `import { ReportDialog, mahaamSubmitter, submit } from '@nasaq/feedback';`,
    `import { FeedbackFloatingLauncher } from '@nasaq/web';`,
    `import { useState } from 'react';`,
    "",
    "const target = mahaamSubmitter(process.env.NEXT_PUBLIC_MAHAAM_FEEDBACK_KEY!);",
    "",
    "export function Feedback() {",
    "  const [open, setOpen] = useState(false);",
    "  return (",
    "    <>",
    "      <FeedbackFloatingLauncher",
    `        shape="${config.shape}"`,
    `        position="${position}"`,
    `        label="${label}"`,
    "        onClick={() => setOpen(true)}",
    "      />",
    "      <ReportDialog open={open} onOpenChange={setOpen} onSubmit={(report) => submit(target, report)} />",
    "    </>",
    "  );",
    "}",
    "",
  ].join("\n");
}

/**
 * Whether the recent motion spikes add up to a shake: at least `count` spikes inside `windowMs`. `spikes` are the
 * timestamps (ms) at which the acceleration crossed the threshold. Pure.
 */
export function isShake(spikes: readonly number[], now: number, count = 3, windowMs = 900): boolean {
  return spikes.filter((t) => now - t <= windowMs).length >= count;
}

/** The size of the acceleration change between two readings, ignoring which axis moved. Pure. */
export function motionDelta(prev: { x: number; y: number; z: number }, next: { x: number; y: number; z: number }): number {
  return Math.hypot(next.x - prev.x, next.y - prev.y, next.z - prev.z);
}

export type FeedbackIssueStatus = "open" | "in-progress" | "resolved";

export interface FeedbackHubIssue {
  id: string;
  title: string;
  status: FeedbackIssueStatus;
  type?: string;
  createdAt?: number | Date | string;
  /** How many people say they have this problem too. */
  votes?: number;
  /** Whether the current person already voted. */
  voted?: boolean;
  author?: string;
}

/** Counts by status, for the filter tabs. Pure. */
export function countByStatus(issues: readonly FeedbackHubIssue[]): Record<FeedbackIssueStatus | "all", number> {
  const counts = { all: issues.length, open: 0, "in-progress": 0, resolved: 0 };
  for (const issue of issues) counts[issue.status]++;
  return counts;
}
