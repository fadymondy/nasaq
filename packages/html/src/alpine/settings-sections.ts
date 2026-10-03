// nqSettingsSections: a settings page with grouped sections, search across every setting and a save bar.
// The markup is the React SettingsSections'; the state lives here.
//
//   <div x-data="nqSettingsSections({ groups, value: 'notifications', dirty: 0, labels })" x-modelable="value" x-id="['nq-settings']">
//     <input type="search" x-model="query" @keydown.escape="clearSearch($event)">
//     <div x-show="q"> <p role="status" x-text="resultsText"></p>
//       <template x-for="hit in hits" :key="hit.key"><button @click="pick(hit)" x-text="hit.title"></button></template> </div>
//     <button x-bind="nav('notifications')">Notifications</button>
//     <div x-bind="page('notifications')"> <div data-slot="setting-row" data-setting-id="email">…</div> </div>
//     <div data-slot="settings-save-bar" :data-state="status" :hidden="!barVisible"> … <button @click="save()"> … </div>
//   </div>
//
// `groups` is `[{ id, label, pages: [{ id, label, description?, keywords?, entries?: [{ id, label, description?, keywords? }] }] }]`.
// The component does not own your values. Tell it how many changes are unsaved by dispatching `nq-settings-dirty`
// ({ detail: 2 } or { detail: true }) from inside it, and handle two events on it:
//   nq-settings-save     detail.waitUntil(promise): the save bar waits for it; resolve `{ error: "…" }` or reject to keep it open
//   nq-settings-discard  detail.waitUntil(promise): reset your state
// Without a save listener the bar just reports "saved". value (the active page) is x-modelable.
// A search hit switches page, scrolls to the `data-setting-id` element and flashes it with data-highlight="true".

import type { Magics, Register } from "./types";

const STRINGS = {
  en: {
    results: "{n} results",
    resultsOne: "1 result",
    noResults: "No settings match",
    unsaved: "{n} unsaved changes",
    unsavedOne: "1 unsaved change",
    unsavedSome: "You have unsaved changes",
    saving: "Saving…",
    saved: "All changes saved",
    failed: "Could not save your changes. Try again.",
  },
  ar: {
    results: "{n} نتائج",
    resultsOne: "نتيجة واحدة",
    noResults: "لا توجد إعدادات مطابقة",
    unsaved: "{n} تغييرات غير محفوظة",
    unsavedOne: "تغيير واحد غير محفوظ",
    unsavedSome: "لديك تغييرات غير محفوظة",
    saving: "جارٍ الحفظ…",
    saved: "تم حفظ كل التغييرات",
    failed: "تعذّر حفظ تغييراتك. حاول مرة أخرى.",
  },
};

/** Folds case, Arabic diacritics/tatweel and letter variants so "اداره" finds "إدارة". */
function normalizeForSearch(text: string) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ًͯ-ٰٟـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .trim();
}

interface Entry {
  id: string;
  label: string;
  description?: string;
  keywords?: string[];
}
interface Page {
  id: string;
  label: string;
  description?: string;
  keywords?: string[];
  entries?: Entry[];
}
interface Group {
  id: string;
  label: string;
  pages: Page[];
}
interface Hit {
  key: string;
  pageId: string;
  entryId?: string;
  title: string;
  description?: string;
  path: string;
}
interface Config {
  groups?: Group[];
  value?: string | null;
  dirty?: number | boolean;
  labels?: Partial<Record<keyof typeof STRINGS.en, string>>;
}
type Status = "idle" | "saving" | "saved" | "error";
interface Waitable {
  waitUntil(promise: unknown): void;
}

interface SettingsState extends Magics {
  value: string | null;
  query: string;
  dirty: number | boolean;
  status: Status;
  error: string | null;
  groups: Group[];
  labels: Record<string, string>;
  savedTimer: ReturnType<typeof setTimeout> | undefined;
  readonly q: string;
  readonly hits: Hit[];
  readonly count: number;
  readonly barVisible: boolean;
  readonly barShown: boolean;
  readonly resultsText: string;
  readonly dirtyText: string;
  readonly message: string;
  select(id: string, entryId?: string): void;
  pick(hit: Hit): void;
  reveal(entryId: string): void;
  fmt(template: string, n: number): string;
  wait(event: string): Promise<unknown[]>;
}

const locale = () => document.documentElement.lang || "en";
const number = (n: number) => new Intl.NumberFormat(new Intl.Locale(locale(), { numberingSystem: "latn" }).toString()).format(n);

export const settingsSections: Register = (Alpine) => {
  Alpine.data("nqSettingsSections", (config: Config = {}) => ({
    value: config.value ?? config.groups?.[0]?.pages[0]?.id ?? null,
    query: "",
    dirty: config.dirty ?? 0,
    status: "idle" as Status,
    error: null as string | null,
    groups: config.groups ?? [],
    labels: { ...STRINGS[locale().startsWith("ar") ? "ar" : "en"], ...config.labels } as Record<string, string>,
    savedTimer: undefined as ReturnType<typeof setTimeout> | undefined,
    init(this: SettingsState) {
      // `this` here is the raw object; go through Alpine's reactive scope so late writes (events, timers) re-render.
      const state = () => (Alpine as unknown as { $data(el: Element): SettingsState }).$data(this.$el);
      this.$el.addEventListener("nq-settings-dirty", (e) => {
        state().dirty = (e as CustomEvent<number | boolean>).detail;
      });
      this.$watch("status", (s: Status) => {
        clearTimeout(this.savedTimer);
        if (s === "saved") this.savedTimer = setTimeout(() => (state().status = "idle"), 2500);
      });
      this.$watch("dirty", () => {
        const me = state();
        if (me.count > 0 && me.status === "saved") me.status = "idle";
      });
    },
    get q(): string {
      const self = this as unknown as SettingsState;
      return normalizeForSearch(self.query);
    },
    get hits(): Hit[] {
      const self = this as unknown as SettingsState;
      const q = self.q;
      if (!q) return [];
      const out: Hit[] = [];
      for (const group of self.groups) {
        for (const page of group.pages) {
          const pageHay = normalizeForSearch([page.label, page.description, group.label, ...(page.keywords ?? [])].filter(Boolean).join(" "));
          if (pageHay.includes(q)) out.push({ key: page.id, pageId: page.id, title: page.label, description: page.description, path: group.label });
          for (const entry of page.entries ?? []) {
            const hay = normalizeForSearch([entry.label, entry.description, ...(entry.keywords ?? [])].filter(Boolean).join(" "));
            if (hay.includes(q)) {
              out.push({ key: `${page.id}:${entry.id}`, pageId: page.id, entryId: entry.id, title: entry.label, description: entry.description, path: `${group.label} › ${page.label}` });
            }
          }
        }
      }
      return out;
    },
    get count(): number {
      const self = this as unknown as SettingsState;
      return typeof self.dirty === "number" ? self.dirty : self.dirty ? 1 : 0;
    },
    get barVisible(): boolean {
      const self = this as unknown as SettingsState;
      return self.count > 0 || self.status === "saved" || self.status === "saving";
    },
    get barShown(): boolean {
      const self = this as unknown as SettingsState;
      return self.barVisible || self.status === "error";
    },
    get resultsText(): string {
      const self = this as unknown as SettingsState;
      const n = self.hits.length;
      if (!n) return self.labels.noResults!;
      return n === 1 ? self.labels.resultsOne! : self.fmt(self.labels.results!, n);
    },
    get dirtyText(): string {
      const self = this as unknown as SettingsState;
      if (typeof self.dirty !== "number") return self.labels.unsavedSome!;
      return self.dirty === 1 ? self.labels.unsavedOne! : self.fmt(self.labels.unsaved!, self.dirty);
    },
    /** The line in the save bar for the current status. */
    get message(): string {
      const self = this as unknown as SettingsState;
      if (self.status === "saved") return self.labels.saved!;
      if (self.status === "error") return self.error ?? self.labels.failed!;
      if (self.status === "saving") return self.labels.saving!;
      return self.dirtyText;
    },
    fmt(_template: string, n: number) {
      return _template.replace("{n}", number(n));
    },
    select(this: SettingsState, id: string, entryId?: string) {
      this.value = id;
      if (entryId) this.reveal(entryId);
    },
    /** Scrolls to a setting and flashes it, once its page is visible. */
    reveal(this: SettingsState, entryId: string) {
      const root = this.$root;
      this.$nextTick(() => {
        requestAnimationFrame(() => {
          const el = [...root.querySelectorAll<HTMLElement>("[data-setting-id]")].find((e) => e.dataset.settingId === entryId);
          if (!el) return;
          el.scrollIntoView?.({ block: "center", behavior: "smooth" });
          el.setAttribute("data-highlight", "true");
          el.querySelector<HTMLElement>("input,button,select,textarea,[role=switch],[role=combobox]")?.focus({ preventScroll: true });
          setTimeout(() => el.removeAttribute("data-highlight"), 2200);
        });
      });
    },
    pick(this: SettingsState, hit: Hit) {
      this.select(hit.pageId, hit.entryId);
      this.query = "";
    },
    clearSearch(this: SettingsState, event: KeyboardEvent) {
      if (!this.query) return;
      event.stopPropagation();
      this.query = "";
    },
    /** Dispatches a waitable event and resolves with whatever the listeners handed to waitUntil. */
    async wait(this: SettingsState, name: string) {
      const pending: unknown[] = [];
      const detail: Waitable = { waitUntil: (p) => void pending.push(p) };
      this.$dispatch(name, detail);
      return Promise.all(pending);
    },
    async save(this: SettingsState) {
      this.status = "saving";
      this.error = null;
      try {
        const results = await this.wait("nq-settings-save");
        const failed = results.find((r) => r && typeof r === "object" && (r as { error?: string }).error) as { error: string } | undefined;
        if (failed) {
          this.error = failed.error;
          this.status = "error";
        } else this.status = "saved";
      } catch {
        this.error = null;
        this.status = "error";
      }
    },
    async discard(this: SettingsState) {
      await this.wait("nq-settings-discard");
      this.status = "idle";
      this.error = null;
    },
    /** Bind on a nav button. */
    nav(this: SettingsState, id: string) {
      return {
        type: "button",
        ":data-active"(this: SettingsState) {
          return String(this.value === id);
        },
        ":aria-current"(this: SettingsState) {
          return this.value === id ? "page" : null;
        },
        ":aria-controls"(this: SettingsState) {
          return this.$id("nq-settings", `page-${id}`);
        },
        "x-on:click"(this: SettingsState) {
          this.select(id);
        },
      };
    },
    /** Bind on the region holding one page's content. */
    page(this: SettingsState, id: string) {
      return {
        role: "region",
        ":id"(this: SettingsState) {
          return this.$id("nq-settings", `page-${id}`);
        },
        ":hidden"(this: SettingsState) {
          return this.value !== id;
        },
      };
    },
  }));
};
