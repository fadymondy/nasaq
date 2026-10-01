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
}
interface CodeBlockState extends Magics {
  code: string;
  language: string;
  highlighted: boolean;
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
    async init(this: CodeBlockState) {
      let tokens: CodeToken[][] | null = null;
      try {
        tokens = await (window.nasaqHighlight ?? ((c: string, l: string) => highlightCode(c, l)))(this.code, this.language);
      } catch {
        // The highlighter failed: the plain lines stay.
      }
      if (tokens) this.paint(tokens);
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
