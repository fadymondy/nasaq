// nqCodeBlock: syntax colours for <x-nq::code-block>. The server renders the plain lines (so nothing shifts and no-JS readers still have the code);
// this swaps each line's content for coloured token spans using a small built-in tokeniser (code-block-highlight.ts, a copy of the Vue one),
// with the same --shiki-token-* variables the React component sets. No Shiki dependency.
//
//   <figure data-slot="code-block" x-data="nqCodeBlock({ code: '...', language: 'ts' })" x-bind:data-highlighted="highlighted ? '' : null">
//     <pre><code><span data-line="1"><span data-code-line>plain text</span></span> ...</code></pre>
//   </figure>
//
// To use another highlighter (Shiki), set window.nasaqHighlight = async (code, language) => CodeToken[][] | null before Alpine starts.

import { type CodeToken, highlightCode } from "./code-block-highlight";
import type { Magics, Register } from "./types";

interface Config {
  code?: string;
  language?: string;
  /** Line numbers (1-based) drawn as highlighted rows. */
  marked?: number[];
  lineNumbers?: boolean;
}
const ON = ["border-nq-accent", "bg-nq-selected"];
interface CodeBlockState extends Magics {
  code: string;
  language: string;
  highlighted: boolean;
  marked: number[];
  lineNumbers: boolean;
  proto: HTMLElement | null;
  run: number;
  highlight(): Promise<void>;
  setCode(next: unknown): void;
  paint(lines: CodeToken[][]): void;
}

declare global {
  interface Window {
    nasaqHighlight?: (code: string, language: string) => Promise<CodeToken[][] | null> | CodeToken[][] | null;
  }
}

export const codeBlock: Register = (Alpine) => {
  Alpine.data("nqCodeBlock", (cfg: Config = {}) => ({
    code: (cfg.code ?? "").replace(/\n$/, ""),
    language: cfg.language ?? "text",
    highlighted: false,
    marked: cfg.marked ?? [],
    lineNumbers: cfg.lineNumbers ?? false,
    proto: null as HTMLElement | null,
    run: 0,
    init(this: CodeBlockState) {
      // A server-rendered line is the template for the lines code-expr builds later (minus the highlighted-row look).
      const first = this.$el.querySelector<HTMLElement>("[data-line]");
      if (first) {
        this.proto = first.cloneNode(true) as HTMLElement;
        this.proto.removeAttribute("data-highlighted");
        this.proto.classList.remove(...ON);
      }
      return this.highlight();
    },
    /** code-expr: swap in new code (text, line numbers, copy value) and colour it again. The first call matches the server render and changes nothing. */
    setCode(this: CodeBlockState, next: unknown) {
      if (typeof next !== "string") return;
      const code = next.replace(/\n$/, "");
      if (code === this.code) return;
      this.code = code;
      const holder = this.$el.querySelector<HTMLElement>("pre > code");
      if (!holder || !this.proto) return;
      const lines = code.split("\n");
      const width = `${String(lines.length).length + 3}ch`;
      holder.replaceChildren(
        ...lines.map((text, i) => {
          const row = this.proto!.cloneNode(true) as HTMLElement;
          const n = i + 1;
          row.setAttribute("data-line", String(n));
          if (this.marked.includes(n)) {
            row.setAttribute("data-highlighted", "");
            row.classList.add(...ON);
          }
          const gutter = row.querySelector<HTMLElement>(":scope > [aria-hidden]");
          if (gutter) {
            gutter.textContent = String(n);
            gutter.style.minWidth = width;
          }
          row.querySelector<HTMLElement>("[data-code-line]")!.textContent = text;
          return row;
        }),
      );
      this.highlighted = false;
      void this.highlight();
    },
    async highlight(this: CodeBlockState) {
      const run = ++this.run;
      let tokens: CodeToken[][] | null = null;
      try {
        tokens = await (window.nasaqHighlight ?? ((c: string, l: string) => highlightCode(c, l)))(this.code, this.language);
      } catch {
        // The highlighter failed: the plain lines stay.
      }
      if (tokens && run === this.run) this.paint(tokens);
    },
    paint(this: CodeBlockState, lines: CodeToken[][]) {
      const targets = this.$el.querySelectorAll<HTMLElement>("[data-code-line]");
      targets.forEach((target, i) => {
        const line = lines[i] ?? [];
        target.replaceChildren(
          ...line.map((tok) => {
            const span = document.createElement("span");
            span.textContent = tok.content;
            if (tok.color) span.style.color = tok.color;
            if (tok.italic) span.classList.add("italic");
            if (tok.bold) span.classList.add("font-semibold");
            return span;
          }),
        );
      });
      this.highlighted = true;
    },
  }));
};
