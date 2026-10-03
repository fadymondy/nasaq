// nqAgentPersonaEditor: the behaviour of the React AgentPersonaEditor. It keeps a draft of the persona, tells what is unsaved,
// adds section headings to the Markdown, counts words and characters, saves and reverts.
//
//   <form data-slot="agent-persona-editor" x-data="nqAgentPersonaEditor({ value: {…}, maxLength: 4000, locale: "en", labels: {…} })"
//         x-on:submit.prevent="submit()"> … x-model="draft.name" … </form>
//
// Saving tells the host through an event on the form with `detail.wait(promise)`: resolve `{ error }` to keep the draft unsaved
// and show the message (a rejection shows a generic message; no listener means it failed).
//   nq-persona-save     { persona, wait }
//   nq-persona-change   { persona }                         (after every edit)
//   nq-persona-preview  { markdown, wait }                  (optional: wait(Promise<string>) with the rendered HTML of the Markdown)
// The server renders the Markdown preview of the saved text; for an edited text the page can answer nq-persona-preview with HTML,
// otherwise the text is shown as it is.

import { appendSection, countWords, isPersonaDirty, personaProblems, type PersonaLike, type PersonaProblem } from "./agent-persona-editor-logic";
import type { Magics, Register } from "./types";

type Outcome = void | { error?: string } | undefined;

interface Config {
  value: PersonaLike;
  maxLength?: number;
  locale?: string;
  disabled?: boolean;
  labels?: { saved?: string; saveFailed?: string; unsaved?: string; saving?: string; save?: string; words?: string; chars?: string; tooLong?: string; unnamed?: string };
}

interface EditorState extends Magics {
  config: Config;
  root: HTMLElement;
  draft: PersonaLike;
  saved: PersonaLike;
  saving: boolean;
  message: { tone: "ok" | "error"; text: string } | null;
  tried: boolean;
  /** HTML from the host for the edited text. */
  rendered: { source: string; html: string } | null;
  alive: boolean;
  readonly dirty: boolean;
  readonly problems: PersonaProblem[];
  readonly over: boolean;
  ask(name: string, detail: Record<string, unknown>): Promise<Outcome>;
}

const copy = (p: PersonaLike): PersonaLike => ({ ...p, traits: [...(p.traits ?? [])] });

export const agentPersonaEditor: Register = (Alpine) => {
  Alpine.data("nqAgentPersonaEditor", (config: Config) => ({
    config,
    root: null as unknown as HTMLElement,
    draft: copy(config.value),
    saved: copy(config.value),
    saving: false,
    message: null as { tone: "ok" | "error"; text: string } | null,
    tried: false,
    rendered: null as { source: string; html: string } | null,
    alive: true,

    init(this: EditorState) {
      this.root = this.$el;
      // The server drew the live card once; the Alpine card takes over.
      this.root.querySelectorAll("[data-ssr]").forEach((n) => n.remove());
      this.$watch("draft", () => {
        this.message = null;
        this.root.dispatchEvent(new CustomEvent("nq-persona-change", { bubbles: true, detail: { persona: copy(this.draft) } }));
      });
    },
    destroy(this: EditorState) {
      this.alive = false;
    },

    get dirty() {
      const self = this as unknown as EditorState;
      return isPersonaDirty(self.draft, self.saved);
    },
    get problems() {
      const self = this as unknown as EditorState;
      return personaProblems(self.draft, self.config.maxLength ?? 4000);
    },
    get over() {
      const self = this as unknown as EditorState;
      const max = self.config.maxLength ?? 4000;
      return max > 0 && self.draft.persona.length > max;
    },
    /** The invalid state of the name Field (read only: it follows the draft). */
    get nameInvalid() {
      const self = this as unknown as EditorState;
      return self.tried && self.problems.includes("nameRequired");
    },
    set nameInvalid(_: boolean) {
      /* driven by the draft */
    },
    /** Save is off until something changed, and once a try failed, until it is valid. */
    get cannotSave() {
      const self = this as unknown as EditorState;
      return !self.dirty || (self.tried && self.problems.length > 0);
    },
    num(this: EditorState, n: number) {
      return new Intl.NumberFormat(`${this.config.locale ?? "en"}-u-nu-latn`).format(n);
    },
    get wordsCount() {
      const self = this as unknown as EditorState;
      return countWords(self.draft.persona);
    },
    /** The status line: the save result, else "Unsaved changes" while there are edits. */
    get status() {
      const self = this as unknown as EditorState;
      return self.message?.text ?? (self.dirty ? self.config.labels?.unsaved ?? "Unsaved changes" : "");
    },

    /** "%1$s words" and the like: fills the placeholders. */
    fill(tpl: string, a: string, b = "") {
      return tpl.replace("%1$s", a).replace("%2$s", b);
    },
    get wordsLine() {
      const self = this as unknown as EditorState & { fill(t: string, a: string, b?: string): string; num(n: number): string };
      if (self.over) return self.fill(self.config.labels?.tooLong ?? "", self.num(self.config.maxLength ?? 0));
      return self.fill(self.config.labels?.words ?? "%1$s words", self.num(countWords(self.draft.persona)));
    },
    get charsLine() {
      const self = this as unknown as EditorState & { fill(t: string, a: string, b?: string): string; num(n: number): string };
      return self.fill(self.config.labels?.chars ?? "%1$s of %2$s", self.num(self.draft.persona.length), self.num(self.config.maxLength ?? 0));
    },
    get saveLabel() {
      const self = this as unknown as EditorState;
      return self.saving ? (self.config.labels?.saving ?? "Saving") : (self.config.labels?.save ?? "Save persona");
    },
    /** The icon of the draft as markup, taken from the picker grid (the picker keeps every tile in the page). */
    iconHtml(this: EditorState) {
      const name = this.draft.icon;
      if (!name) return "";
      return this.root.querySelector(`[data-slot="icon-picker-tile"][data-name="${CSS.escape(name)}"]`)?.innerHTML ?? "";
    },
    /** A colour value as CSS: a custom property name becomes var(--name). */
    css(value: string) {
      const v = (value || "--nq-tag-gray").trim();
      return v.startsWith("--") ? `var(${v})` : v;
    },

    addSection(this: EditorState, heading: string) {
      this.draft.persona = appendSection(this.draft.persona, heading);
      this.$nextTick(() => this.root.querySelector<HTMLTextAreaElement>("textarea")?.focus());
    },
    revert(this: EditorState) {
      this.draft = copy(this.saved);
      // The colour picker only follows x-model on its own root, so hand it the colour.
      const picker = this.root.querySelector('[data-slot="color-picker"]');
      const data = picker ? (Alpine as unknown as { $data(el: Element): { color?: string } }).$data(picker) : null;
      if (data) data.color = this.draft.color;
      this.tried = false;
      this.message = null;
    },

    async submit(this: EditorState) {
      this.tried = true;
      if (this.saving || this.problems.length > 0) return;
      this.saving = true;
      this.message = null;
      const snapshot = copy(this.draft);
      try {
        const result = await this.ask("nq-persona-save", { persona: snapshot });
        if (!this.alive) return;
        if (result && "error" in result && result.error) this.message = { tone: "error", text: result.error };
        else {
          this.saved = snapshot;
          this.message = { tone: "ok", text: this.config.labels?.saved ?? "Saved." };
        }
      } catch (e) {
        if (this.alive) this.message = { tone: "error", text: e instanceof Error && e.message && e.message !== "no listener" ? e.message : (this.config.labels?.saveFailed ?? "The persona could not be saved. Try again.") };
      } finally {
        if (this.alive) this.saving = false;
      }
    },

    /** Ask the host for the rendered Markdown of the edited text (the Preview tab). */
    async showPreview(this: EditorState) {
      const source = this.draft.persona;
      if (source === this.config.value.persona) return;
      let pending: Promise<string> | undefined;
      this.root.dispatchEvent(new CustomEvent("nq-persona-preview", { bubbles: true, detail: { markdown: source, wait: (p: Promise<string>) => (pending = Promise.resolve(p)) } }));
      if (!pending) return;
      try {
        const html = await pending;
        if (this.alive) this.rendered = { source, html };
      } catch {
        /* the text stays plain */
      }
    },

    async ask(this: EditorState, name: string, detail: Record<string, unknown>): Promise<Outcome> {
      let pending: Promise<Outcome> | undefined;
      this.root.dispatchEvent(new CustomEvent(name, { bubbles: true, detail: { ...detail, wait: (p: Promise<Outcome>) => (pending = Promise.resolve(p)) } }));
      if (!pending) throw new Error("no listener");
      return pending;
    },
  }));
};
