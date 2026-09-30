/** Types and pure helpers of CopilotChat. No React here, so they are unit tested. */

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
