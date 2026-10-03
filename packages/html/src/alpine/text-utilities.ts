// Text utilities: the behaviours behind translatable-text, scroll-fade, bookmark-button, progressive-reveal and progressive-list.
// (linkify and user-text are server-rendered by the Blade components and need nothing here.)
//
//   <div x-data="nqTranslatable({ original, translation, source: 'ar', target: 'en', show: false, fetch: true })" x-bind="root"> … </div>
//   <div x-data="nqScrollFade(32)" x-bind="root"> … </div>
//   <span x-data="nqBookmark(false, true)" x-modelable="saved"> <button x-bind="button"> … </button> <span x-bind="status"></span> </span>
//   <div x-data="nqReveal(96, false)" x-modelable="expanded" x-bind="root"> <div x-ref="body" x-bind="body"> … </div> <button x-bind="button"> … </button> </div>
//   <div x-data="nqProgressiveList(3, 3, 7)"> <ul x-ref="list"> <li> … </li> </ul> <button x-bind="button"> … </button> </div>
//
// Self-contained: the scroll-fade and progressive helpers below are those of text-utilities-logic.ts in @fadymondy/nasaq.

import type { Magics, Register } from "./types";

interface Nq {
  $nq: { t(en: string, ar: string): string; locale: string };
}

// ---- pure helpers -----------------------------------------------------------------------------------------------

function scrollFadeState(scrollStart: number, clientSize: number, scrollSize: number, threshold = 1): { start: boolean; end: boolean } {
  if (scrollSize - clientSize <= threshold) return { start: false, end: false };
  const from = Math.max(0, scrollStart);
  return { start: from > threshold, end: from + clientSize < scrollSize - threshold };
}

function scrollFadeMask(state: { start: boolean; end: boolean }, size: number, rtl: boolean): string {
  if (!state.start && !state.end) return "";
  const side = rtl ? "left" : "right";
  const from = state.start ? `transparent 0, black ${size}px` : "black 0";
  const to = state.end ? `black calc(100% - ${size}px), transparent 100%` : "black 100%";
  return `linear-gradient(to ${side}, ${from}, ${to})`;
}

function progressiveRemaining(visible: number, total: number, step: number): { next: number; left: number } {
  const left = Math.max(0, total - visible);
  return { next: Math.min(left, Math.max(1, step)), left };
}

// ---- translatable-text --------------------------------------------------------------------------------------------

interface TranslatableInit {
  original: string;
  translation: string | null;
  source: string;
  target: string;
  show: boolean;
  fetch: boolean;
}

interface TranslatableScope extends Magics, Nq {
  original: string;
  translated: string | null;
  source: string;
  target: string;
  show: boolean;
  pending: boolean;
  error: string;
  alive: boolean;
  readonly showingTranslation: boolean;
  load(): Promise<void>;
}

// ---- scroll-fade -------------------------------------------------------------------------------------------------

interface FadeScope extends Magics {
  size: number;
  start: boolean;
  end: boolean;
  rtl: boolean;
  observer: ResizeObserver | null;
  measure(): void;
}

// ---- bookmark ----------------------------------------------------------------------------------------------------

interface BookmarkScope extends Magics, Nq {
  saved: boolean;
  showLabel: boolean;
  message: string;
  failed: boolean;
  busy: boolean;
  toggle(): Promise<void>;
}

// ---- reveal ------------------------------------------------------------------------------------------------------

interface RevealScope extends Magics {
  height: number;
  expanded: boolean;
  overflows: boolean;
  observer: ResizeObserver | null;
  check(): void;
}

// ---- progressive list --------------------------------------------------------------------------------------------

interface ListScope extends Magics, Nq {
  initial: number;
  step: number;
  total: number;
  visible: number;
  readonly shown: number;
  readonly left: number;
  readonly next: number;
  apply(): void;
}

export const textUtilities: Register = (Alpine) => {
  Alpine.data("nqTranslatable", (init: TranslatableInit) => ({
    original: init.original,
    translated: init.translation as string | null,
    source: init.source,
    target: init.target,
    show: init.show && init.translation !== null,
    pending: false,
    error: "",
    alive: true,

    destroy(this: TranslatableScope) {
      this.alive = false;
    },
    get showingTranslation() {
      return this.show && this.translated !== null;
    },
    languageName(this: TranslatableScope, code: string) {
      try {
        return new Intl.DisplayNames([this.$nq.locale], { type: "language" }).of(code) ?? code;
      } catch {
        return code;
      }
    },
    get toggleText() {
      if (this.pending) return this.$nq.t("Translating", "جارٍ الترجمة");
      return this.showingTranslation ? this.$nq.t("Show original", "عرض الأصل") : this.$nq.t("Show translation", "عرض الترجمة");
    },
    get note() {
      const language = this.languageName(this.source);
      return this.showingTranslation ? this.$nq.t(`Translated from ${language}`, `مترجم من ${language}`) : this.$nq.t(`Original in ${language}`, `الأصل بـ${language}`);
    },
    async load(this: TranslatableScope) {
      this.pending = true;
      this.error = "";
      const failed = this.$nq.t("Could not translate this text.", "تعذرت ترجمة هذا النص.");
      let work: Promise<unknown> | undefined;
      this.$dispatch("translate", {
        text: this.original,
        target: this.target,
        wait: (p: unknown) => {
          work = Promise.resolve(p);
        },
      });
      try {
        const result = (await work) as string | { text?: string; error?: string } | undefined;
        if (!this.alive) return;
        const text = typeof result === "string" ? result : result?.text;
        const failure = typeof result === "object" && result ? result.error : undefined;
        if (failure || text === undefined) this.error = failure ?? failed;
        else {
          this.translated = text;
          this.show = true;
        }
      } catch {
        if (this.alive) this.error = failed;
      } finally {
        if (this.alive) this.pending = false;
      }
    },
    toggle(this: TranslatableScope) {
      if (this.show) this.show = false;
      else if (this.translated !== null) this.show = true;
      else void this.load();
    },

    root: {
      ":data-showing"(this: TranslatableScope) {
        return this.showingTranslation ? "translation" : "original";
      },
    },
    body: {
      "x-text"(this: TranslatableScope) {
        return this.showingTranslation ? this.translated : this.original;
      },
      ":lang"(this: TranslatableScope) {
        return this.showingTranslation ? this.target : this.source;
      },
    },
    toggleButton: {
      ":disabled"(this: TranslatableScope) {
        return this.pending;
      },
      ":aria-pressed"(this: TranslatableScope) {
        return this.showingTranslation ? "true" : "false";
      },
      "x-on:click"(this: TranslatableScope & { toggle(): void }) {
        this.toggle();
      },
    },
  } as Record<string, unknown> & ThisType<TranslatableScope & { languageName(c: string): string }>));

  Alpine.data("nqScrollFade", (size: number = 32) => ({
    size,
    start: false,
    end: false,
    rtl: false,
    observer: null as ResizeObserver | null,

    init(this: FadeScope) {
      const node = this.$el;
      this.measure();
      if (typeof ResizeObserver === "undefined") return;
      this.observer = new ResizeObserver(() => this.measure());
      this.observer.observe(node);
      for (const child of Array.from(node.children)) this.observer.observe(child);
    },
    destroy(this: FadeScope) {
      this.observer?.disconnect();
    },
    measure(this: FadeScope) {
      const node = this.$el;
      this.rtl = getComputedStyle(node).direction === "rtl";
      const next = scrollFadeState(Math.abs(node.scrollLeft), node.clientWidth, node.scrollWidth);
      if (next.start !== this.start) this.start = next.start;
      if (next.end !== this.end) this.end = next.end;
    },

    root: {
      "x-on:scroll"(this: FadeScope) {
        this.measure();
      },
      ":data-fade-start"(this: FadeScope) {
        return this.start ? "" : undefined;
      },
      ":data-fade-end"(this: FadeScope) {
        return this.end ? "" : undefined;
      },
      ":tabindex"(this: FadeScope) {
        return this.start || this.end ? 0 : undefined;
      },
      ":style"(this: FadeScope) {
        const mask = scrollFadeMask({ start: this.start, end: this.end }, this.size, this.rtl);
        return { maskImage: mask, WebkitMaskImage: mask };
      },
    },
  }));

  Alpine.data("nqBookmark", (saved: boolean = false, showLabel: boolean = false) => ({
    saved,
    showLabel,
    message: "",
    failed: false,
    busy: false,

    get text() {
      return this.saved ? this.$nq.t("Saved", "محفوظ") : this.$nq.t("Save", "حفظ");
    },
    async toggle(this: BookmarkScope) {
      if (this.busy) return;
      const previous = this.saved;
      const next = !previous;
      this.busy = true;
      this.saved = next;
      this.failed = false;
      this.message = next ? this.$nq.t("Saved to your bookmarks", "حُفظ في إشاراتك المرجعية") : this.$nq.t("Removed from your bookmarks", "أُزيل من إشاراتك المرجعية");
      let work: Promise<unknown> | undefined;
      this.$dispatch("saved-change", {
        saved: next,
        wait: (p: unknown) => {
          work = Promise.resolve(p);
        },
      });
      try {
        const result = (await work) as { error?: string } | void;
        if (result && typeof result === "object" && result.error) throw new Error(result.error);
      } catch {
        this.saved = previous;
        this.failed = true;
        this.message = this.$nq.t("Could not update your bookmarks.", "تعذر تحديث إشاراتك المرجعية.");
      } finally {
        this.busy = false;
      }
    },

    button: {
      ":data-saved"(this: BookmarkScope) {
        return this.saved ? "" : undefined;
      },
      ":aria-pressed"(this: BookmarkScope) {
        return this.saved ? "true" : "false";
      },
      ":aria-label"(this: BookmarkScope & { text: string }) {
        return this.showLabel ? undefined : this.text;
      },
      "x-on:click"(this: BookmarkScope) {
        void this.toggle();
      },
    },
    status: {
      "x-text"(this: BookmarkScope) {
        return this.message;
      },
      ":class"(this: BookmarkScope) {
        return { "sr-only": !this.failed, "text-caption text-nq-danger-text": this.failed };
      },
    },
  } as Record<string, unknown> & ThisType<BookmarkScope>));

  Alpine.data("nqReveal", (height: number = 96, expanded: boolean = false) => ({
    height,
    expanded,
    overflows: false,
    observer: null as ResizeObserver | null,

    init(this: RevealScope) {
      this.check();
      const body = this.$refs.body;
      if (typeof ResizeObserver === "undefined" || !body) return;
      this.observer = new ResizeObserver(() => this.check());
      this.observer.observe(body);
    },
    destroy(this: RevealScope) {
      this.observer?.disconnect();
    },
    check(this: RevealScope) {
      const body = this.$refs.body;
      if (body) this.overflows = body.scrollHeight > this.height + 1;
    },
    get label() {
      return this.expanded ? this.$nq.t("Show less", "عرض أقل") : this.$nq.t("Show more", "عرض المزيد");
    },

    root: {
      ":data-expanded"(this: RevealScope) {
        return this.expanded ? "" : undefined;
      },
    },
    body: {
      ":id"(this: RevealScope) {
        return this.$id("progressive-reveal");
      },
      ":style"(this: RevealScope) {
        const mask = this.overflows && !this.expanded ? "linear-gradient(to bottom, black calc(100% - 32px), transparent)" : "";
        return { maxHeight: this.expanded ? "" : `${this.height}px`, maskImage: mask, WebkitMaskImage: mask };
      },
    },
    button: {
      ":aria-expanded"(this: RevealScope) {
        return this.expanded ? "true" : "false";
      },
      ":aria-controls"(this: RevealScope) {
        return this.$refs.body?.id;
      },
      "x-on:click"(this: RevealScope) {
        this.expanded = !this.expanded;
      },
    },
  } as Record<string, unknown> & ThisType<RevealScope & Nq>));

  Alpine.data("nqProgressiveList", (initial: number = 3, step: number = 3, total: number = 0) => ({
    initial,
    step,
    total,
    visible: initial,

    init(this: ListScope) {
      const items = this.$refs.list?.children;
      if (items && items.length) this.total = items.length;
      this.apply();
    },
    apply(this: ListScope) {
      Array.from(this.$refs.list?.children ?? []).forEach((li, i) => ((li as HTMLElement).hidden = i >= this.visible));
    },
    get shown() {
      return Math.min(this.visible, this.total);
    },
    get left() {
      return progressiveRemaining(this.shown, this.total, this.step).left;
    },
    get next() {
      return progressiveRemaining(this.shown, this.total, this.step).next;
    },
    get moreText() {
      return this.$nq.t(`Show ${this.next} more`, `عرض ${this.next} أخرى`);
    },
    get leftText() {
      return this.$nq.t(`${this.left} left`, `متبقٍ ${this.left}`);
    },
    more(this: ListScope) {
      this.visible = this.shown + this.next;
      this.apply();
      this.$dispatch("reveal", this.visible);
    },

    button: {
      "x-show"(this: ListScope) {
        return this.left > 0;
      },
      "x-on:click"(this: ListScope & { more(): void }) {
        this.more();
      },
    },
  } as Record<string, unknown> & ThisType<ListScope>));
};
