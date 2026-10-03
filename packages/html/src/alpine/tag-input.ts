// nqTagInput: chips inside an input box. The markup is the React TagInput's (see the Blade component), the state lives here.
//
//   <div data-slot="tag-input" x-data="nqTagInput(['design'], { maxTags: 5, suggestions: ['urgent'] })" x-modelable="tags">
//     <div data-slot="tag-input-box" x-bind="box" class="…">
//       <template x-for="(tag, i) in tags" :key="tag"> <span data-slot="tag-input-tag">…<button @click.stop="removeAt(i)"></button></span> </template>
//       <input data-slot="tag-input-field" x-ref="field" x-bind="field" class="…">
//     </div>
//     <ul data-slot="tag-input-suggestions" x-show="showList()" role="listbox"> <template x-for="(s, i) in filtered()">…</template> </ul>
//     <p data-slot="tag-input-error" x-show="error" x-text="error"></p>
//   </div>
//
// Enter, "," and the Arabic comma add the typed text; Backspace on an empty input removes the last tag; pasting splits on
// commas and new lines; duplicates are compared with the Arabic-aware fold. Rejections dispatch a bubbling "reject"
// event ({ tag, reason }). `tags` is x-modelable (x-model="$wire.labels"). Options: maxTags, suggestions, separators,
// addOnBlur, invalid, validate(tag, tags) → true | false | message string.

import type { Magics, Register } from "./types";

type Reason = "duplicate" | "invalid" | "max";

interface TagOptions {
  maxTags?: number;
  suggestions?: readonly string[];
  separators?: readonly string[];
  addOnBlur?: boolean;
  invalid?: boolean;
  validate?: (tag: string, tags: readonly string[]) => boolean | string;
}

interface TagState extends Magics {
  $nq: { t(en: string, ar: string): string };
  tags: string[];
  text: string;
  error: string | null;
  message: string;
  open: boolean;
  active: number;
  invalid: boolean;
  maxTags: number | undefined;
  suggestions: readonly string[] | undefined;
  separators: readonly string[];
  addOnBlur: boolean;
  validate: TagOptions["validate"];
  listId(): string;
  inputEl(): HTMLInputElement | undefined;
  filtered(): string[];
  showList(): boolean;
  addMany(raw: string[]): boolean;
  pick(s: string): void;
  removeAt(i: number): void;
}

/** Same fold as the React `normalizeForSearch`: case, Arabic diacritics, tatweel and alef / yeh / teh-marbuta variants. */
const fold = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f\u064b-\u065f\u0670\u0640]/g, "")
    .replace(/[\u0623\u0625\u0622\u0671]/g, "\u0627")
    .replace(/\u0649/g, "\u064a")
    .replace(/\u0629/g, "\u0647")
    .trim();

export const tagInput: Register = (Alpine) => {
  Alpine.data("nqTagInput", (initial: readonly string[] = [], options: TagOptions = {}) => ({
    tags: [...(initial ?? [])],
    text: "",
    error: null as string | null,
    message: "",
    open: false,
    active: -1,
    invalid: Boolean(options.invalid),
    maxTags: options.maxTags,
    suggestions: options.suggestions,
    separators: options.separators ?? ["Enter", ",", "،"],
    addOnBlur: options.addOnBlur ?? true,
    validate: options.validate,
    listId(this: TagState) {
      return this.$id("nq-tag-input", "list");
    },
    inputEl(this: TagState) {
      return this.$refs.field as HTMLInputElement | undefined;
    },
    /** Adds each tag in order; returns true when every one was accepted. */
    addMany(this: TagState, raw: string[]) {
      let next = [...this.tags];
      let firstError: string | null = null;
      const added: string[] = [];
      for (const item of raw) {
        const tag = item.trim();
        if (!tag) continue;
        let problem: string | null = null;
        let reason: Reason | null = null;
        if (this.maxTags !== undefined && next.length >= this.maxTags) {
          const max = this.maxTags;
          problem = this.$nq.t(`You can add up to ${max} ${max === 1 ? "tag" : "tags"}.`, `يمكنك إضافة ${max} وسوم كحد أقصى.`);
          reason = "max";
        } else if (next.some((x) => fold(x) === fold(tag))) {
          problem = this.$nq.t(`${tag} is already added.`, `${tag} مضاف بالفعل.`);
          reason = "duplicate";
        } else if (this.validate) {
          const result = this.validate(tag, next);
          if (result !== true) {
            problem = typeof result === "string" ? result : this.$nq.t(`${tag} is not valid.`, `${tag} غير صالح.`);
            reason = "invalid";
          }
        }
        if (problem && reason) {
          firstError ??= problem;
          this.$dispatch("reject", { tag, reason });
        } else {
          next = [...next, tag];
          added.push(tag);
        }
      }
      if (added.length) {
        this.tags = next;
        this.message = added.map((tag) => this.$nq.t(`${tag} added`, `تمت إضافة ${tag}`)).join(", ");
      }
      this.error = firstError;
      return firstError === null;
    },
    filtered(this: TagState) {
      if (!this.suggestions?.length) return [];
      const q = fold(this.text);
      const chosen = new Set(this.tags.map(fold));
      return this.suggestions.filter((s) => !chosen.has(fold(s)) && (!q || fold(s).includes(q)));
    },
    showList(this: TagState) {
      return this.open && this.filtered().length > 0 && this.text.trim() !== "";
    },
    pick(this: TagState, s: string) {
      if (this.addMany([s])) this.text = "";
      this.open = false;
      this.active = -1;
      this.inputEl()?.focus();
    },
    removeAt(this: TagState, i: number) {
      const tag = this.tags[i];
      if (tag === undefined) return;
      this.tags = this.tags.filter((_, k) => k !== i);
      this.message = this.$nq.t(`${tag} removed`, `تمت إزالة ${tag}`);
      this.error = null;
      this.inputEl()?.focus();
    },
    /** Bind on the box: a click anywhere in it focuses the input; the border follows invalid / error. */
    box: {
      "x-on:click"(this: TagState) {
        this.inputEl()?.focus();
      },
      ":class"(this: TagState) {
        return { "border-input": !(this.invalid || this.error), "border-nq-danger": Boolean(this.invalid || this.error) };
      },
    },
    /** Bind on the root: data-invalid follows invalid / error. */
    root: {
      ":data-invalid"(this: TagState) {
        return this.invalid || this.error ? "" : undefined;
      },
    },
    /** Bind on the text input. */
    field: {
      ":value"(this: TagState) {
        return this.text;
      },
      ":aria-expanded"(this: TagState) {
        return this.suggestions ? String(this.showList()) : undefined;
      },
      ":aria-activedescendant"(this: TagState) {
        return this.showList() && this.active >= 0 ? `${this.listId()}-${this.active}` : undefined;
      },
      "x-on:input"(this: TagState, event: Event) {
        this.text = (event.target as HTMLInputElement).value;
        this.open = true;
        this.active = -1;
        if (this.error) this.error = null;
      },
      "x-on:focus"(this: TagState) {
        this.open = true;
      },
      "x-on:blur"(this: TagState) {
        this.open = false;
        if (this.addOnBlur && this.text.trim() && this.addMany([this.text])) this.text = "";
      },
      "x-on:paste"(this: TagState, event: ClipboardEvent) {
        if (event.defaultPrevented) return;
        const pasted = event.clipboardData?.getData("text") ?? "";
        if (!/[,\n\r،]/.test(pasted)) return;
        event.preventDefault();
        this.addMany(`${this.text}${pasted}`.split(/[,\n\r،]+/));
        this.text = "";
      },
      "x-on:keydown"(this: TagState, event: KeyboardEvent) {
        if (event.defaultPrevented || event.isComposing) return;
        const list = this.showList();
        if (list && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
          event.preventDefault();
          const n = this.filtered().length;
          this.active = event.key === "ArrowDown" ? (this.active + 1) % n : (this.active - 1 + n) % n;
          return;
        }
        if (event.key === "Escape" && list) {
          event.preventDefault();
          this.open = false;
          return;
        }
        const choice = this.filtered()[this.active];
        if (event.key === "Enter" && list && choice !== undefined) {
          event.preventDefault();
          this.pick(choice);
          return;
        }
        if (this.separators.includes(event.key) && this.text.trim()) {
          event.preventDefault();
          if (this.addMany([this.text])) this.text = "";
          this.open = false;
          this.active = -1;
          return;
        }
        if (this.separators.includes(event.key) && event.key !== "Enter") {
          // A bare comma is never text.
          event.preventDefault();
          return;
        }
        if (event.key === "Backspace" && this.text === "" && this.tags.length) {
          const last = this.tags[this.tags.length - 1] as string;
          this.tags = this.tags.slice(0, -1);
          this.message = this.$nq.t(`${last} removed`, `تمت إزالة ${last}`);
          this.error = null;
        }
      },
    },
    /** Bind on one suggestion; `i` is its index in filtered(). */
    option(this: TagState, s: string, i: number) {
      return {
        ":id"(this: TagState) {
          return `${this.listId()}-${i}`;
        },
        ":aria-selected"(this: TagState) {
          return String(i === this.active);
        },
        ":data-active"(this: TagState) {
          return i === this.active ? "" : undefined;
        },
        // mousedown keeps focus in the input, so blur does not close the list before the click lands.
        "x-on:mousedown.prevent"() {},
        "x-on:click"(this: TagState) {
          this.pick(s);
        },
      };
    },
  }));
};
