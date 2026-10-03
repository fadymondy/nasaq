// nqMentionTextarea: a textarea that suggests people when you type the trigger (@). The markup is the React MentionTextarea's
// (rendered by <x-nq::mention-textarea>); the state lives here.
//
//   <div data-slot="mention-textarea" x-data="nqMentionTextarea('', { suggestions: [{ id, name, description }], strings: {…} })" x-modelable="text" x-id="['nq-mention']">
//     <textarea data-slot="textarea" x-bind="area">…</textarea>         role=combobox; focus never leaves it
//     <ul data-slot="mention-list" x-show="open()" role="listbox" :style="listStyle()">
//       <template x-for="r in rows()"> <li x-bind="row(r)">…</li> </template>
//     </ul>
//     <div data-slot="mention-empty" x-show="emptyShown()">No matches</div>
//     <span role="status" class="sr-only" x-text="status()"></span>
//   </div>
//
// Choosing a suggestion inserts "@name " and records { id, name, start, end } in `mentions`; editing inside a mention drops
// it and edits before it shift it. `text` is x-modelable (x-model="$wire.body"); every change bubbles "nq-mentions-change"
// ({ mentions }). Options: suggestions, mentions (initial), trigger ("@"), maxSuggestions (8), strings.

import type { Magics, Register } from "./types";
import { caretPoint, findActive, kindOf, type Mention, type MentionKind, rankOptions, syncMentions, validOnly, type Presence } from "./mention-textarea-logic";

interface Option {
  id: string;
  name: string;
  description?: string;
  avatar?: string;
  kind?: MentionKind;
  handle?: string;
  presence?: Presence;
  keywords?: readonly string[];
}

interface MentionOptions {
  suggestions?: Option[];
  mentions?: Mention[];
  trigger?: string;
  maxSuggestions?: number;
  strings?: Record<string, string>;
}

type Row = { type: "heading"; key: string; kind: MentionKind } | { type: "option"; key: string; option: Option; index: number };

interface State extends Magics {
  text: string;
  mentions: Mention[];
  caret: number;
  focused: boolean;
  dismissed: number | null;
  activeIndex: number;
  point: { top: number; left: number };
  suggestions: Option[];
  trigger: string;
  maxSuggestions: number;
  strings: Record<string, string>;
  root: HTMLElement | null;
  areaEl(): HTMLTextAreaElement | null;
  mentionsNow(): Mention[];
  current(): ReturnType<typeof findActive>;
  shown(): ReturnType<typeof findActive>;
  results(): Option[];
  sectioned(): boolean;
  open(): boolean;
  activeOption(): number;
  optionId(i: number): string;
  track(): void;
  measure(): void;
  commit(next: string, mentions: Mention[]): void;
  select(option: Option): void;
  emptyShown(): boolean;
}

/** Same fold as the React `normalizeForSearch`. */
const fold = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ًͯ-ٰٟـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .trim();

const PRESENCE: Record<string, string> = {
  online: "bg-nq-success",
  away: "bg-nq-warning",
  busy: "bg-nq-danger",
  offline: "bg-popover ring-1 ring-inset ring-muted-foreground",
};

/** First user-perceived character of the first and last word, like the Avatar. */
const initialsOf = (name: string) => {
  const first = (w: string) => Array.from(w)[0] ?? "";
  const words = name.trim().split(/\s+/).filter(Boolean);
  return ((words[0] ? first(words[0]) : "") + (words.length > 1 ? first(words[words.length - 1] as string) : "")).toUpperCase();
};

export const mentionTextarea: Register = (Alpine) => {
  Alpine.data("nqMentionTextarea", (initial: string = "", options: MentionOptions = {}) => ({
    text: initial ?? "",
    mentions: [...(options.mentions ?? [])] as Mention[],
    caret: 0,
    focused: false,
    dismissed: null as number | null,
    activeIndex: 0,
    point: { top: 0, left: 0 },
    suggestions: options.suggestions ?? [],
    trigger: options.trigger ?? "@",
    maxSuggestions: options.maxSuggestions ?? 8,
    strings: options.strings ?? {},
    root: null as HTMLElement | null,
    init(this: State) {
      this.root = this.$el;
      if (document.activeElement === this.areaEl()) this.focused = true;
      // The list follows the caret, and the highlighted row stays visible while arrowing.
      this.$watch("text", () => this.$nextTick(() => this.measure()));
      this.$watch("activeIndex", () => this.$nextTick(() => document.getElementById(this.optionId(this.activeOption()))?.scrollIntoView?.({ block: "nearest" })));
    },
    areaEl(this: State) {
      return (this.root ?? this.$el).querySelector<HTMLTextAreaElement>('[data-slot="textarea"]');
    },
    mentionsNow(this: State) {
      return validOnly(this.mentions, this.text, this.trigger);
    },
    current(this: State) {
      return this.focused ? findActive(this.text, this.caret, this.trigger) : null;
    },
    shown(this: State) {
      const a = this.current();
      return a && this.dismissed !== a.start ? a : null;
    },
    results(this: State) {
      const s = this.shown();
      return s ? rankOptions(this.suggestions, s.query, fold, this.maxSuggestions) : [];
    },
    sectioned(this: State) {
      return new Set(this.suggestions.map(kindOf)).size > 1;
    },
    open(this: State) {
      return this.shown() !== null && this.results().length > 0;
    },
    activeOption(this: State) {
      return this.open() ? Math.min(this.activeIndex, this.results().length - 1) : -1;
    },
    listId(this: State) {
      return this.$id("nq-mention", "list");
    },
    optionId(this: State, i: number) {
      return this.$id("nq-mention", `opt-${i}`);
    },
    emptyShown(this: State) {
      const s = this.shown();
      return Boolean(s && s.query) && !this.open();
    },
    /** Options, with a heading row before each new kind when more than one kind is offered. */
    rows(this: State): Row[] {
      const list = this.results();
      const sectioned = this.sectioned();
      const out: Row[] = [];
      list.forEach((option, index) => {
        const kind = kindOf(option);
        if (sectioned && (index === 0 || kindOf(list[index - 1] as Option) !== kind)) out.push({ type: "heading", key: `h-${kind}`, kind });
        out.push({ type: "option", key: `o-${option.id}`, option, index });
      });
      return out;
    },
    heading(this: State, kind: MentionKind) {
      return this.strings[kind] ?? kind;
    },
    kindLabel(this: State, kind: MentionKind) {
      return kind === "team" ? (this.strings.teamOne ?? "Team") : (this.strings.groupOne ?? "Group");
    },
    status(this: State) {
      if (this.open()) return (this.strings.count ?? "{n}").replace("{n}", String(this.results().length));
      return this.emptyShown() ? (this.strings.empty ?? "") : "";
    },
    initials: initialsOf,
    presenceClass: (presence: string) => PRESENCE[presence] ?? PRESENCE.offline,
    listStyle(this: State) {
      return { top: `${this.point.top}px`, left: `${this.point.left}px` };
    },
    track(this: State) {
      const el = this.areaEl();
      if (el) this.caret = el.selectionStart;
    },
    measure(this: State) {
      const start = this.shown()?.start;
      const el = this.areaEl();
      if (start === undefined || !el) return;
      const p = caretPoint(el, start);
      const width = (this.root ?? this.$el).clientWidth ?? 0;
      this.point = { top: p.top, left: Math.max(0, Math.min(p.left, width - 256)) };
    },
    commit(this: State, next: string, mentions: Mention[]) {
      this.text = next;
      this.mentions = mentions;
      (this.root ?? this.$el).dispatchEvent(new CustomEvent("nq-mentions-change", { bubbles: true, detail: { mentions } }));
    },
    onInput(this: State, event: Event) {
      const el = event.target as HTMLTextAreaElement;
      const next = el.value;
      this.caret = el.selectionStart;
      this.activeIndex = 0;
      this.commit(next, validOnly(syncMentions(this.mentionsNow(), this.text, next), next, this.trigger));
    },
    select(this: State, option: Option) {
      const current = this.shown();
      if (!current) return;
      const insert = `${this.trigger}${option.name}`;
      const next = `${this.text.slice(0, current.start)}${insert} ${this.text.slice(current.caret)}`;
      const kept = syncMentions(this.mentionsNow(), this.text, next);
      const mention: Mention = { id: option.id, name: option.name, start: current.start, end: current.start + insert.length };
      this.activeIndex = 0;
      this.commit(next, [...kept, mention].sort((a, b) => a.start - b.start));
      const el = this.areaEl();
      if (el) {
        el.value = next;
        el.focus();
      }
      // Restore the caret after the value we set programmatically has been rendered.
      this.$nextTick(() => {
        const target = this.areaEl();
        if (target) {
          target.setSelectionRange(mention.end + 1, mention.end + 1);
          this.caret = mention.end + 1;
        }
      });
    },
    onKeyDown(this: State, e: KeyboardEvent) {
      if (e.defaultPrevented || !this.open()) return;
      const list = this.results();
      if (e.key === "ArrowDown") {
        e.preventDefault();
        this.activeIndex = (this.activeOption() + 1) % list.length;
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        this.activeIndex = (this.activeOption() - 1 + list.length) % list.length;
      } else if ((e.key === "Enter" || e.key === "Tab") && !e.shiftKey && !e.isComposing) {
        const option = list[this.activeOption()];
        if (option) {
          e.preventDefault();
          this.select(option);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        this.dismissed = this.shown()?.start ?? null;
      }
    },
    /** Escape only silences the mention being typed; the next trigger opens the list again. */
    syncDismissed(this: State) {
      if (this.dismissed !== null && !this.current()) this.dismissed = null;
    },
    /** Bind on the textarea (the combobox). */
    area: {
      role: "combobox",
      "aria-autocomplete": "list",
      "aria-haspopup": "listbox",
      ":aria-expanded"(this: State) {
        return this.open() ? "true" : "false";
      },
      ":aria-controls"(this: State & { listId(): string }) {
        return this.open() ? this.listId() : null;
      },
      ":aria-activedescendant"(this: State) {
        return this.open() && this.activeOption() >= 0 ? this.optionId(this.activeOption()) : null;
      },
      ":value"(this: State) {
        return this.text;
      },
      "x-on:input"(this: State & { onInput(e: Event): void; syncDismissed(): void }, e: Event) {
        this.onInput(e);
        this.syncDismissed();
      },
      "x-on:keydown"(this: State & { onKeyDown(e: KeyboardEvent): void }, e: KeyboardEvent) {
        this.onKeyDown(e);
      },
      "x-on:keyup"(this: State & { syncDismissed(): void }) {
        this.track();
        this.syncDismissed();
      },
      "x-on:click"(this: State) {
        this.track();
      },
      "x-on:select"(this: State) {
        this.track();
      },
      "x-on:focus"(this: State) {
        this.focused = true;
        this.track();
      },
      "x-on:blur"(this: State) {
        this.focused = false;
      },
    },
    /** Bind on each row <li> of the list: a heading or an option. */
    row(r: Row) {
      return {
        ":id"(this: State) {
          return r.type === "option" ? this.optionId(r.index) : null;
        },
        ":role"() {
          return r.type === "option" ? "option" : "presentation";
        },
        ":data-slot"() {
          return r.type === "option" ? "mention-option" : "mention-heading";
        },
        ":data-kind"() {
          return r.type === "option" ? kindOf(r.option) : null;
        },
        ":data-active"(this: State) {
          return r.type === "option" && r.index === this.activeOption() ? "" : null;
        },
        ":aria-selected"(this: State) {
          return r.type === "option" ? String(r.index === this.activeOption()) : null;
        },
        ":class"(this: State) {
          return r.type === "option"
            ? "flex cursor-default items-center gap-2 rounded-control px-2 py-1.5 data-active:bg-nq-selected"
            : "px-2 pt-1.5 pb-1 text-caption text-muted-foreground";
        },
        "x-on:mousemove"(this: State) {
          if (r.type === "option") this.activeIndex = r.index;
        },
        "x-on:click"(this: State) {
          if (r.type === "option") this.select(r.option);
        },
      };
    },
  }));
};
