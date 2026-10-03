// nqMcpConnect: the show/hide token toggle and the "Test connection" check of the MCP connect card.
// The snippets, tabs and copy buttons are server-rendered; this holds the reveal flag and the test state.
//
//   <div x-data="nqMcpConnect({ token, masked, labels: {…} })"> … x-on:test="$event.detail.wait(fetch(…).then(…))"
//
// It is presentational: the host does the check. The root fires `test` with detail `{ wait(promise) }`; resolve
// `{ ok: true, latencyMs?, tools? }` or `{ ok: false, error? }`. A rejection, or nobody listening, shows a generic failure.

import type { Magics, Register } from "./types";

interface McpTestResult {
  ok: boolean;
  latencyMs?: number;
  tools?: number;
  error?: string;
}

interface McpConnectConfig {
  token?: string;
  masked?: string;
  snippets?: { real: string; masked: string | null }[];
  labels: {
    showToken: string;
    hideToken: string;
    test: string;
    testing: string;
    answered: string;
    answeredBare: string;
    tool1: string;
    tools: string;
    sep: string;
    failedFallback: string;
  };
}

interface McpConnectState extends Magics {
  config: McpConnectConfig;
  root: HTMLElement | null;
  reveal: boolean;
  status: "idle" | "testing" | "done" | "error";
  result: McpTestResult | null;
  alive: boolean;
}

export const mcpConnect: Register = (Alpine) => {
  Alpine.data("nqMcpConnect", (config: McpConnectConfig) => ({
    config,
    root: null as HTMLElement | null,
    reveal: false,
    status: "idle" as McpConnectState["status"],
    result: null as McpTestResult | null,
    alive: true,
    init(this: McpConnectState) {
      this.root = this.$el;
    },
    destroy(this: McpConnectState) {
      this.alive = false;
    },
    get shownToken(): string {
      return this.reveal ? (this.config.token ?? "") : (this.config.masked ?? "");
    },
    /** The code-block text for client i: the real token once revealed, the masked one before. */
    shownSnippet(this: McpConnectState, i: number): string {
      const one = this.config.snippets?.[i];
      return one ? (this.reveal ? one.real : (one.masked ?? one.real)) : "";
    },
    get toggleLabel(): string {
      return this.reveal ? this.config.labels.hideToken : this.config.labels.showToken;
    },
    get busy(): boolean {
      return this.status === "testing";
    },
    get testLabel(): string {
      return this.busy ? this.config.labels.testing : this.config.labels.test;
    },
    get okShown(): boolean {
      return this.status === "done" && !!this.result?.ok;
    },
    get failShown(): boolean {
      return this.status === "done" && !this.result?.ok;
    },
    get errorShown(): boolean {
      return this.status === "error";
    },
    get detail(): string {
      const l = this.config.labels;
      const r = this.result;
      const parts: string[] = [];
      if (r?.latencyMs !== undefined) parts.push(`${r.latencyMs} ms`);
      if (r?.tools !== undefined) parts.push(r.tools === 1 ? l.tool1 : l.tools.replace("{n}", String(r.tools)));
      return parts.length ? l.answered.replace("{parts}", parts.join(l.sep)) : l.answeredBare;
    },
    get failure(): string {
      return this.result?.error ?? this.config.labels.failedFallback;
    },
    async run(this: McpConnectState) {
      if (this.status === "testing") return;
      this.status = "testing";
      try {
        let pending: Promise<McpTestResult> | undefined;
        const event = new CustomEvent("test", {
          bubbles: true,
          detail: { wait: (p: Promise<McpTestResult>) => (pending = Promise.resolve(p)) },
        });
        (this.root ?? this.$el).dispatchEvent(event);
        if (!pending) throw new Error("no listener");
        const result = await pending;
        if (!this.alive) return;
        this.result = result;
        this.status = "done";
      } catch {
        if (this.alive) this.status = "error";
      }
    },
  }));
};
