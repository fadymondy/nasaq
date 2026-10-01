/** Types and pure helpers of CopilotChat. No React here, so they are unit tested. */

import type { ReactNode } from "react";
import type { Artifact } from "../artifact-renderer/artifact-renderer-logic";

export type CopilotStepStatus = "running" | "done" | "error";

/** One tool call the assistant made while answering. */
export interface CopilotStep {
  id: string;
  /** What happened in words: "Searched the docs". */
  label: string;
  /** Tool name, shown as code. */
  tool?: string;
  status: CopilotStepStatus;
  /** Arguments or a short result. Shown in a monospace line. */
  detail?: string;
}

export interface CopilotSource {
  id: string;
  title: string;
  /** Only http(s) links are made clickable. */
  url?: string;
  snippet?: string;
}

export interface CopilotMessage {
  id: string;
  role: "user" | "assistant";
  /** Markdown for the assistant, plain text for the user. */
  text: string;
  at?: number | Date | string;
  steps?: readonly CopilotStep[];
  sources?: readonly CopilotSource[];
  /** Follow-up questions offered under the last answer. */
  followUps?: readonly string[];
  streaming?: boolean;
  /** The answer failed. The text is what arrived before it stopped. */
  error?: string;
  feedback?: "up" | "down" | null;
  /** Files sent with a user message. */
  attachments?: readonly CopilotAttachment[];
  /** Structured results under an answer, drawn by `ArtifactList`. */
  artifacts?: readonly Artifact[];
  /** Sent to the assistant but not shown, such as an artifact interaction. */
  hidden?: boolean;
}

/** A file in the composer or on a sent message. */
export interface CopilotAttachment {
  id: string;
  name: string;
  /** MIME type. Images get a thumbnail when `url` is set. */
  type?: string;
  size?: number;
  /** Preview url, usually from `URL.createObjectURL`. Only http(s), blob: and data:image are used. */
  url?: string;
  /** Upload progress 0..1, or `undefined` when ready. */
  progress?: number;
  error?: string;
}

/** A tool, skill or agent the "/" menu offers. Chosen ones are sent with the next prompt. */
export interface CopilotCommand {
  id: string;
  label: string;
  description?: string;
  /** Free kind such as "tool", "skill", "agent" or "mcp". Shown as a badge. */
  kind?: string;
}

/** An on/off option under the box: thinking, web search, deep research. */
export interface CopilotToggle {
  id: string;
  label: string;
  icon?: ReactNode;
  description?: string;
}

/** One saved conversation in the history list. */
export interface CopilotSessionSummary {
  id: string;
  title: string;
  at?: number | Date | string;
}

export interface CopilotContextItem {
  id: string;
  label: string;
  /** Free kind such as "file", "page" or "selection". Shown as a small prefix. */
  kind?: string;
}

export interface CopilotModel {
  id: string;
  label: string;
  description?: string;
}

/** Whether a link is safe to render as an anchor. */
export function isSafeUrl(url: string | undefined): url is string {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

/** Host of a url without `www.`, or an empty string. */
export function hostOf(url: string | undefined): string {
  if (!isSafeUrl(url)) return "";
  return new URL(url).host.replace(/^www\./, "");
}

/** Counts of finished, running and failed steps. */
export function stepCounts(steps: readonly CopilotStep[] | undefined) {
  const list = steps ?? [];
  return {
    total: list.length,
    running: list.filter((s) => s.status === "running").length,
    error: list.filter((s) => s.status === "error").length,
    done: list.filter((s) => s.status === "done").length,
  };
}

/** The whole conversation as Markdown, for the "copy conversation" action. */
export function transcriptToMarkdown(messages: readonly CopilotMessage[], names: { user: string; assistant: string }): string {
  return messages
    .filter((m) => m.text.trim() !== "")
    .map((m) => {
      const head = `**${m.role === "user" ? names.user : names.assistant}**`;
      const sources = m.sources?.length
        ? `\n\n${m.sources.map((s, i) => `${i + 1}. ${isSafeUrl(s.url) ? `[${s.title}](${s.url})` : s.title}`).join("\n")}`
        : "";
      return `${head}\n\n${m.text.trim()}${sources}`;
    })
    .join("\n\n---\n\n");
}

/** Removes a context item by id. */
export function withoutContext(items: readonly CopilotContextItem[], id: string): CopilotContextItem[] {
  return items.filter((i) => i.id !== id);
}

/** Items of `options` not yet in `items`. */
export function availableContext(options: readonly CopilotContextItem[], items: readonly CopilotContextItem[]): CopilotContextItem[] {
  const have = new Set(items.map((i) => i.id));
  return options.filter((o) => !have.has(o.id));
}

/** The "/" word the caret is in, or null. A slash only counts at the start or after a space. */
export function slashQuery(text: string, caret: number = text.length): { query: string; start: number } | null {
  const before = text.slice(0, caret);
  const m = /(^|\s)\/([^\s/]*)$/.exec(before);
  if (!m) return null;
  return { query: m[2] ?? "", start: before.length - (m[2] ?? "").length - 1 };
}

/** Commands whose label, id or description contain the query, label matches first. */
export function filterCommands(commands: readonly CopilotCommand[], query: string, chosen: readonly string[] = []): CopilotCommand[] {
  const q = query.trim().toLowerCase();
  const free = commands.filter((c) => !chosen.includes(c.id));
  if (!q) return free;
  const starts = free.filter((c) => c.label.toLowerCase().startsWith(q) || c.id.toLowerCase().startsWith(q));
  const rest = free.filter((c) => !starts.includes(c) && `${c.label} ${c.id} ${c.description ?? ""}`.toLowerCase().includes(q));
  return [...starts, ...rest];
}

/** Removes the "/query" the caret is in. */
export function withoutSlash(text: string, caret: number = text.length): string {
  const s = slashQuery(text, caret);
  if (!s) return text;
  return (text.slice(0, s.start) + text.slice(caret)).replace(/\s{2,}/g, " ").trimStart();
}

/** 1.2 MB style sizes. */
export function formatBytes(bytes: number | undefined, locale = "en"): string {
  if (bytes === undefined || !Number.isFinite(bytes) || bytes < 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let v = bytes;
  let u = 0;
  while (v >= 1024 && u < units.length - 1) {
    v /= 1024;
    u++;
  }
  const n = new Intl.NumberFormat(locale.startsWith("ar") ? "ar-EG-u-nu-latn" : "en", { maximumFractionDigits: u === 0 ? 0 : 1 }).format(v);
  return `${n} ${units[u]}`;
}

/** Whether an attachment url may be put in an img src. */
export function isPreviewUrl(url: string | undefined): url is string {
  if (!url) return false;
  if (url.startsWith("blob:") || /^data:image\/(png|jpe?g|gif|webp|avif);/i.test(url)) return true;
  return isSafeUrl(url);
}

/** Messages a person sees: hidden ones are left out. */
export function visibleMessages(messages: readonly CopilotMessage[]): CopilotMessage[] {
  return messages.filter((m) => !m.hidden);
}
