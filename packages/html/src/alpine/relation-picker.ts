// nqRelationPicker: a field that points at another record and finds it by searching. The markup is the React RelationPicker's.
//
//   <div data-slot="relation-picker" x-data="nqRelationPicker({ value: 'c2', multiple: false, options: [...], searchUrl: '/api/customers', resolveUrl: '/api/customers', createUrl: '/api/customers', debounce: 250, ar: false, t: {...} })"
//        x-modelable="value" x-id="['nq-relation']">
//     <div data-slot="combobox-input-group" x-ref="anchor"><input data-slot="combobox-input" x-ref="input" x-bind="input">…</div>
//     <template x-teleport="body">
//       <div data-slot="combobox-content" x-ref="popup" x-bind="popup" x-nq-presence="open" x-anchor…>
//         <div data-slot="combobox-empty" x-bind="emptyState">…</div>
//         <template x-for="o in rows()" :key="o.value"><div data-slot="combobox-item" x-bind="row(o)">…</div></template>
//       </div>
//     </template>
//   </div>
//
// It stores ids and shows names. Records come from fixed `options` (filtered on the client, Arabic-aware), or from `searchUrl`
// (GET <url>?q=<text>, a JSON array of { value, label, labelAr?, description? }, called with an empty q to fill the list on open;
// older requests are aborted and typing is debounced). `resolveUrl` turns saved ids into names (GET <url>?ids[]=a&ids[]=b), once
// per unseen id. `createUrl` adds a "Create ..." row for the typed text (POST JSON { name }, answering the new record or { error }).
// Single mode shows the chosen name in the input; multiple mode shows chips and keeps the list open. value is x-modelable.
// Keys follow the combobox: ArrowDown / ArrowUp / Home / End move the highlight, Enter picks, Escape closes, Backspace removes the last chip.

import type { Magics, Register } from "./types";

type Id = string;

interface RelationOption {
  value: Id;
  label: string;
  labelAr?: string;
  description?: string;
  disabled?: boolean;
}

interface RelationConfig {
  value: Id | Id[] | null;
  multiple: boolean;
  options: RelationOption[];
  searchUrl: string | null;
  resolveUrl: string | null;
  createUrl: string | null;
  debounce: number;
  ar: boolean;
  t: { empty: string; hint: string; searching: string; error: string; create: string; createFailed: string };
}

interface RelationState extends Magics {
  cfg: RelationConfig;
  value: Id | Id[] | null;
  multiple: boolean;
  open: boolean;
  editing: boolean;
  query: string;
  typed: string;
  highlighted: string | null;
  known: Record<string, RelationOption>;
  results: RelationOption[];
  status: "idle" | "loading" | "error";
  createState: "idle" | "busy" | "failed";
  timer: ReturnType<typeof setTimeout> | undefined;
  controller: AbortController | null;
  show(): void;
  close(refocus?: boolean): void;
  remember(list: readonly RelationOption[]): void;
  text(option: RelationOption): string;
  isCreate(o: RelationOption): boolean;
  labelOf(id: Id): string;
  selected(): Id[];
  isSelected(id: Id): boolean;
  hasValue(): boolean;
  rows(): RelationOption[];
  inputText(): string;
  refresh(immediate?: boolean): void;
  resolveMissing(): void;
  pick(option: RelationOption): void;
  create(): Promise<void>;
  remove(id: Id): void;
  clearAll(): void;
  options(): HTMLElement[];
  highlight(el: HTMLElement | undefined): void;
  emptyText(): string;
  inputEl(): HTMLInputElement | undefined;
}

const CREATE = "\u0000create";
const key = (v: unknown) => String(v);

/** Same fold as the combobox / React `normalizeForSearch`. */
const fold = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ًͯ-ٰٟـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .trim();

function withParams(url: string, params: [string, string][]): string {
  const sep = url.includes("?") ? "&" : "?";
  return url + sep + params.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");
}

const asList = (json: unknown): RelationOption[] => (Array.isArray(json) ? json : ((json as { data?: RelationOption[] } | null)?.data ?? [])) as RelationOption[];

function csrf(): Record<string, string> {
  const token = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content;
  return token ? { "X-CSRF-TOKEN": token } : {};
}

export const relationPicker: Register = (Alpine) => {
  Alpine.data("nqRelationPicker", (cfg: RelationConfig) => ({
    cfg,
    value: cfg.value === "" ? null : cfg.value,
    multiple: Boolean(cfg.multiple),
    open: false,
    /** The user has typed since the list last closed: the input shows their text, not the chosen name. */
    editing: false,
    query: "",
    /** The last non-empty text, so Create still has it after the list closes. */
    typed: "",
    highlighted: null as string | null,
    known: {} as Record<string, RelationOption>,
    results: [] as RelationOption[],
    status: "idle" as "idle" | "loading" | "error",
    createState: "idle" as "idle" | "busy" | "failed",
    timer: undefined as ReturnType<typeof setTimeout> | undefined,
    controller: null as AbortController | null,
    init(this: RelationState) {
      if (this.multiple && !Array.isArray(this.value)) this.value = this.value === null ? [] : [this.value as Id];
      this.remember(this.cfg.options);
      this.results = this.cfg.options;
      this.resolveMissing();
      this.$watch("value", () => this.resolveMissing());
    },
    remember(this: RelationState, list: readonly RelationOption[]) {
      for (const o of list) this.known[key(o.value)] = o;
    },
    isCreate(o: RelationOption) {
      return o.value === CREATE;
    },
    text(this: RelationState, option: RelationOption) {
      return this.cfg.ar && option.labelAr ? option.labelAr : option.label;
    },
    labelOf(this: RelationState, id: Id) {
      const o = this.known[key(id)];
      return o ? this.text(o) : key(id);
    },
    selected(this: RelationState) {
      return Array.isArray(this.value) ? this.value : this.value === null || this.value === undefined ? [] : [this.value];
    },
    isSelected(this: RelationState, id: Id) {
      return this.selected().some((v) => key(v) === key(id));
    },
    hasValue(this: RelationState) {
      return this.selected().length > 0;
    },
    inputText(this: RelationState) {
      if (this.editing) return this.query;
      return !this.multiple && this.hasValue() ? this.labelOf(this.value as Id) : "";
    },
    /** Selected records always stay in the list, so the box can show them; then the results; then Create for new text. */
    rows(this: RelationState) {
      const shown = new Map<string, RelationOption>();
      for (const id of this.selected()) shown.set(key(id), this.known[key(id)] ?? { value: id, label: key(id) });
      for (const o of this.results) shown.set(key(o.value), o);
      const list = [...shown.values()];
      const q = this.query.trim();
      const canCreate = this.cfg.createUrl && q && !list.some((o) => this.text(o).trim().toLowerCase() === q.toLowerCase());
      return canCreate ? [...list, { value: CREATE, label: this.cfg.t.create.replace("{q}", q) }] : list;
    },
    emptyText(this: RelationState) {
      if (this.status === "loading") return this.cfg.t.searching;
      if (this.status === "error") return this.cfg.t.error;
      return this.query || this.cfg.options.length || !this.cfg.searchUrl ? this.cfg.t.empty : this.cfg.t.hint;
    },
    /** Fills `results` for the current query: filtered options, or the search endpoint (debounced, older calls aborted). */
    refresh(this: RelationState, immediate = false) {
      clearTimeout(this.timer);
      this.controller?.abort();
      this.controller = null;
      const url = this.cfg.searchUrl;
      if (!url) {
        const q = fold(this.query);
        this.results = q ? this.cfg.options.filter((o) => fold(`${this.text(o)} ${o.description ?? ""}`).includes(q)) : this.cfg.options;
        this.status = "idle";
        return;
      }
      const controller = new AbortController();
      this.controller = controller;
      this.status = "loading";
      this.timer = setTimeout(
        () => {
          fetch(withParams(url, [["q", this.query]]), { signal: controller.signal, headers: { Accept: "application/json" } })
            .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
            .then((json) => {
              if (controller.signal.aborted) return;
              const list = asList(json);
              this.remember(list);
              this.results = list;
              this.status = "idle";
            })
            .catch(() => {
              if (!controller.signal.aborted) this.status = "error";
            });
        },
        immediate || !this.query ? 0 : this.cfg.debounce,
      );
    },
    /** Asks the resolve endpoint for ids whose names are not known yet. */
    resolveMissing(this: RelationState) {
      const url = this.cfg.resolveUrl;
      const missing = this.selected().filter((id) => !this.known[key(id)]);
      if (!url || !missing.length) return;
      // Mark them so a second change before the answer does not ask again.
      for (const id of missing) this.known[key(id)] = { value: id, label: key(id) };
      fetch(withParams(url, missing.map((id) => ["ids[]", key(id)] as [string, string])), { headers: { Accept: "application/json" } })
        .then((r) => (r.ok ? r.json() : []))
        .then((json) => this.remember(asList(json)))
        .catch(() => undefined);
    },
    inputEl(this: RelationState) {
      return this.$refs.input as HTMLInputElement | undefined;
    },
    show(this: RelationState) {
      if (this.open) return;
      this.open = true;
      this.refresh(true);
      this.$nextTick(() => {
        const anchor = this.$refs.anchor;
        const popup = this.$refs.popup;
        if (anchor && popup) {
          popup.style.setProperty("--anchor-width", `${anchor.offsetWidth}px`);
          popup.style.setProperty("--available-height", `${Math.max(120, window.innerHeight - anchor.getBoundingClientRect().bottom - 16)}px`);
        }
      });
    },
    close(this: RelationState, refocus = false) {
      if (!this.open) return;
      this.open = false;
      this.highlighted = null;
      this.editing = false;
      this.query = "";
      this.controller?.abort();
      clearTimeout(this.timer);
      this.status = "idle";
      if (refocus) this.inputEl()?.focus();
    },
    pick(this: RelationState, option: RelationOption) {
      if (option.value === CREATE) {
        void this.create();
        return;
      }
      this.remember([option]);
      if (this.multiple) {
        const list = this.selected().filter((v) => key(v) !== key(option.value));
        this.value = this.isSelected(option.value) ? list : [...list, option.value];
        this.editing = false;
        this.query = "";
        this.refresh(true);
        this.inputEl()?.focus();
        return;
      }
      this.value = option.value;
      this.close();
    },
    async create(this: RelationState) {
      const url = this.cfg.createUrl;
      const name = (this.query || this.typed).trim();
      if (!url || !name) return;
      this.createState = "busy";
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json", ...csrf() },
          body: JSON.stringify({ name }),
        });
        const made = (await response.json()) as RelationOption | { error: string };
        if (!response.ok || "error" in made) {
          this.createState = "failed";
          return;
        }
        this.remember([made]);
        this.createState = "idle";
        this.pick(made);
        if (this.multiple) this.close();
      } catch {
        this.createState = "failed";
      }
    },
    remove(this: RelationState, id: Id) {
      this.value = this.selected().filter((v) => key(v) !== key(id));
      this.inputEl()?.focus();
    },
    clearAll(this: RelationState) {
      this.value = this.multiple ? [] : null;
      this.editing = false;
      this.query = "";
      this.inputEl()?.focus();
    },
    options(this: RelationState) {
      const popup = this.$refs.popup;
      if (!popup) return [];
      return [...popup.querySelectorAll<HTMLElement>('[data-slot="combobox-item"]:not([data-disabled])')];
    },
    highlight(this: RelationState, el: HTMLElement | undefined) {
      if (!el) return;
      this.highlighted = el.dataset.value ?? null;
      el.scrollIntoView?.({ block: "nearest" });
    },
    /** Bind on the text input. */
    input: {
      type: "text",
      role: "combobox",
      autocomplete: "off",
      "aria-autocomplete": "list",
      ":value"(this: RelationState) {
        return this.inputText();
      },
      ":aria-expanded"(this: RelationState) {
        return String(this.open);
      },
      ":aria-controls"(this: RelationState) {
        return this.open ? this.$id("nq-relation", "listbox") : undefined;
      },
      ":aria-activedescendant"(this: RelationState) {
        return this.open && this.highlighted !== null ? this.$id("nq-relation", `item-${this.highlighted}`) : undefined;
      },
      "x-on:input"(this: RelationState, event: Event) {
        const text = (event.target as HTMLInputElement).value;
        this.editing = true;
        this.query = text;
        if (text) this.typed = text;
        const wasOpen = this.open;
        this.show();
        if (wasOpen) this.refresh();
        this.highlighted = null;
        this.$nextTick(() => this.highlight(this.options()[0]));
      },
      "x-on:focus"(this: RelationState) {
        if (!this.multiple && !this.open) this.inputEl()?.select();
      },
      "x-on:click"(this: RelationState) {
        this.show();
      },
      "x-on:keydown"(this: RelationState, event: KeyboardEvent) {
        if (event.defaultPrevented || event.isComposing) return;
        const items = this.options();
        const at = items.findIndex((el) => el.dataset.value === this.highlighted);
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          if (!this.open) {
            this.show();
            return;
          }
          if (!items.length) return;
          const next = event.key === "ArrowDown" ? (at + 1) % items.length : (at - 1 + items.length) % items.length;
          this.highlight(items[next < 0 ? items.length - 1 : next]);
        } else if (event.key === "Home" || event.key === "End") {
          if (!this.open) return;
          event.preventDefault();
          this.highlight(event.key === "Home" ? items[0] : items[items.length - 1]);
        } else if (event.key === "Enter") {
          if (!this.open || at < 0) return;
          event.preventDefault();
          items[at]!.click();
        } else if (event.key === "Escape") {
          if (!this.open) return;
          event.preventDefault();
          event.stopPropagation();
          this.close();
        } else if (event.key === "Tab") {
          this.close();
        } else if (event.key === "Backspace" && this.multiple && this.inputText() === "" && this.selected().length) {
          const list = this.selected();
          this.remove(list[list.length - 1] as Id);
        }
      },
    },
    /** Bind on the clear button; it hides itself while there is no value. */
    clear: {
      type: "button",
      tabindex: "-1",
      ":data-hidden"(this: RelationState) {
        return this.hasValue() ? undefined : "";
      },
      "x-on:click"(this: RelationState) {
        this.clearAll();
      },
    },
    /** Bind on the chevron button. */
    trigger: {
      type: "button",
      tabindex: "-1",
      "aria-haspopup": "listbox",
      ":aria-expanded"(this: RelationState) {
        return String(this.open);
      },
      ":data-popup-open"(this: RelationState) {
        return this.open ? "" : undefined;
      },
      "x-on:click"(this: RelationState) {
        if (this.open) this.close();
        else {
          this.show();
          this.inputEl()?.focus();
        }
      },
    },
    /** Bind on the list popup. */
    popup: {
      role: "listbox",
      ":id"(this: RelationState) {
        return this.$id("nq-relation", "listbox");
      },
      ":aria-multiselectable"(this: RelationState) {
        return this.multiple ? "true" : undefined;
      },
      ":aria-busy"(this: RelationState) {
        return this.status === "loading" ? "true" : undefined;
      },
      "x-on:mousedown.prevent"() {},
      "x-on:pointerdown.document"(this: RelationState, event: PointerEvent) {
        if (!this.open) return;
        const target = event.target as Node;
        if (this.$refs.popup?.contains(target) || this.$refs.anchor?.contains(target)) return;
        this.close();
      },
    },
    /** Bind on the empty message: shown while the list has no rows (searching, failed, nothing found). */
    emptyState: {
      "x-show"(this: RelationState) {
        return this.rows().length === 0;
      },
      "x-cloak": "",
      style: "display: none",
    },
    /** Bind on one row; `o` is the record. */
    row(this: RelationState, o: RelationOption) {
      return {
        role: "option",
        ":data-value"() {
          return key(o.value);
        },
        ":data-disabled"() {
          return o.disabled ? "" : undefined;
        },
        ":aria-disabled"() {
          return o.disabled ? "true" : undefined;
        },
        ":id"(this: RelationState) {
          return this.$id("nq-relation", `item-${key(o.value)}`);
        },
        ":aria-selected"(this: RelationState) {
          return String(this.isSelected(o.value));
        },
        ":data-selected"(this: RelationState) {
          return this.isSelected(o.value) ? "" : undefined;
        },
        ":data-highlighted"(this: RelationState) {
          return this.highlighted === key(o.value) ? "" : undefined;
        },
        "x-on:pointermove"(this: RelationState) {
          if (!o.disabled && this.highlighted !== key(o.value)) this.highlighted = key(o.value);
        },
        "x-on:click"(this: RelationState) {
          if (!o.disabled) this.pick(o);
        },
      };
    },
  }));
};
