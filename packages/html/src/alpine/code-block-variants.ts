// nqCodeCopyMenu and nqCodeTabs: the Alpine side of <x-nq::code-copy-menu> and <x-nq::code-tabs>. The server renders the markup,
// the prompts and the links; this copies, flashes the check and keeps tabs with the same sync key together.
//
//   <span x-data="nqCodeCopyMenu({ code, markdown, prompts, links, names, t })">…</span>   fires nq-code-copy { kind, text, target }
//   <div x-data="nqCodeTabs({ active, syncKey })" x-on:nq-code-tabs-sync.window="onSync($event)">…</div>   fires nq-code-tab { value }

import { copyText } from "./copy-button";
import type { Magics, Register } from "./types";

type Target = string;
interface MenuConfig {
  code: string;
  markdown: string;
  prompts: Record<Target, string>;
  links: Record<Target, string | null>;
  names: Record<Target, string>;
  t: { code: string; markdown: string; prompt: string; failed: string; tooLong: string };
}
interface MenuState extends MenuConfig, Magics {
  status: string;
  done: boolean;
  timer: ReturnType<typeof setTimeout> | undefined;
  run(kind: string, text: string, message: string, target?: Target): Promise<void>;
}
interface TabsState extends Magics {
  active: string | null;
  syncKey: string | null;
}

const synced: Record<string, string> = {};

export const codeBlockVariants: Register = (Alpine) => {
  Alpine.data("nqCodeCopyMenu", (config: MenuConfig) => ({
    ...config,
    status: "",
    done: false,
    timer: undefined as ReturnType<typeof setTimeout> | undefined,
    async run(this: MenuState, kind: string, text: string, message: string, target?: Target) {
      const ok = await copyText(text);
      clearTimeout(this.timer);
      this.status = ok ? message : this.t.failed;
      this.done = ok;
      this.timer = setTimeout(() => {
        this.done = false;
        this.status = "";
      }, 1500);
      if (ok) this.$dispatch("nq-code-copy", { kind, text, target });
    },
    copyCode(this: MenuState) {
      return this.run("code", this.code, this.t.code);
    },
    copyMarkdown(this: MenuState) {
      return this.run("markdown", this.markdown, this.t.markdown);
    },
    copyPrompt(this: MenuState, target: Target) {
      return this.run("prompt", this.prompts[target]!, this.t.prompt.replace(":name", this.names[target] ?? target), target);
    },
    async open(this: MenuState, target: Target) {
      const link = this.links[target];
      if (!link) {
        await this.run("prompt", this.prompts[target]!, this.t.tooLong, target);
        return;
      }
      window.open(link, "_blank", "noopener,noreferrer");
      this.$dispatch("nq-code-copy", { kind: "open", text: this.prompts[target], target });
    },
  }));

  Alpine.data("nqCodeTabs", ({ active = null, syncKey = null }: { active?: string | null; syncKey?: string | null } = {}) => ({
    active,
    syncKey,
    init(this: TabsState & { $watch: Magics["$watch"] }) {
      const stored = this.syncKey ? synced[this.syncKey] : undefined;
      if (stored !== undefined && this.$el.querySelector(`[role="tab"][data-value="${CSS.escape(stored)}"]`)) this.active = stored;
      this.$watch("active", (value: string | null) => {
        if (value === null) return;
        this.$dispatch("nq-code-tab", { value });
        if (!this.syncKey || synced[this.syncKey] === value) return;
        synced[this.syncKey] = value;
        window.dispatchEvent(new CustomEvent("nq-code-tabs-sync", { detail: { key: this.syncKey, value, source: this.$el } }));
      });
    },
    onSync(this: TabsState, event: CustomEvent<{ key: string; value: string; source: Element }>) {
      const { key, value, source } = event.detail;
      if (key !== this.syncKey || source === this.$el) return;
      if (this.$el.querySelector(`[role="tab"][data-value="${CSS.escape(value)}"]`)) this.active = value;
    },
  }));
};
