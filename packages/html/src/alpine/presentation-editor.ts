// nqPresentation: a slide deck editor and its full-screen player (the React PresentationEditor and DeckPlayer).
// The markup is the Blade component's; the state lives here. Thumbnail reordering uses native pointer events.
//
//   <div x-data="nqPresentation({ title: 'Q3', slides: [{ id: 's1', layout: 'title', title: 'Q3' }] }, { save: async (deck) => {} })" x-modelable="deck">
//
// `deck` is x-modelable ({ title, slides }). Options: readOnly, save (deck) => Promise<void | { error?: string }>,
// fullscreen (default true), defaultShowNotes. Events (bubbling): "change" { deck } after every edit, "present" { deck, index }.
// The player is part of the same component: present() opens it, `playing` is its open state.

import type { Magics, Register } from "./types";

export type SlideLayout = "title" | "section" | "content" | "two-column" | "quote" | "image" | "blank";
export type SlideTheme = "light" | "dark" | "brand";

export interface Slide {
  id: string;
  layout: SlideLayout;
  title: string;
  subtitle?: string;
  body?: string;
  body2?: string;
  image?: string;
  imageAlt?: string;
  notes?: string;
  theme?: SlideTheme;
}
export interface Deck {
  title: string;
  slides: Slide[];
}

export interface PresentationOptions {
  readOnly?: boolean;
  save?: (deck: Deck) => Promise<void | { error?: string }>;
  fullscreen?: boolean;
  defaultShowNotes?: boolean;
}

export const SLIDE_LAYOUTS: readonly SlideLayout[] = ["title", "section", "content", "two-column", "quote", "image", "blank"];

let counter = 0;
export const makeSlideId = () => `slide_${Date.now().toString(36)}${(++counter).toString(36)}`;

export function moveSlide<T>(list: readonly T[], from: number, to: number): T[] {
  if (from < 0 || from >= list.length) return [...list];
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(Math.max(0, Math.min(to, next.length)), 0, item as T);
  return next;
}

export const clampIndex = (index: number, count: number) => (count <= 0 ? 0 : Math.max(0, Math.min(count - 1, index)));
export const lines = (text: string | undefined): string[] =>
  (text ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.replace(/^[-*•]\s+/, ""));

export type PlayerKey = "next" | "prev" | "first" | "last" | "notes" | "fullscreen" | null;
/** What a key does in the player. Arrow keys follow the reading direction: in RTL, ArrowLeft goes forward. */
export function keyAction(key: string, rtl: boolean): PlayerKey {
  switch (key) {
    case "ArrowRight": return rtl ? "prev" : "next";
    case "ArrowLeft": return rtl ? "next" : "prev";
    case "ArrowDown":
    case "PageDown":
    case " ":
    case "Enter": return "next";
    case "ArrowUp":
    case "PageUp":
    case "Backspace": return "prev";
    case "Home": return "first";
    case "End": return "last";
    case "n":
    case "N": return "notes";
    case "f":
    case "F": return "fullscreen";
    default: return null;
  }
}

/** A horizontal swipe of at least `threshold` px moves a slide; swiping toward the start goes forward (mirrored in RTL). */
export function swipeAction(dx: number, dy: number, rtl: boolean, threshold = 48): "next" | "prev" | null {
  if (Math.abs(dx) < threshold || Math.abs(dx) < Math.abs(dy) * 1.2) return null;
  return (rtl ? dx > 0 : dx < 0) ? "next" : "prev";
}

const SAFE_IMAGE = /^(https?:\/\/|\/(?!\/)|data:image\/(png|jpe?g|gif|webp|avif|svg\+xml)[;,])/i;
/** Only https, http, site-relative and data:image sources render; everything else is dropped. */
export function safeImageSrc(src: string | undefined): string | undefined {
  const value = (src ?? "").trim();
  return value && SAFE_IMAGE.test(value) ? value : undefined;
}

export function formatElapsed(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const pad = (v: number) => String(v).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
}

/** Index of the centre closest to (x, y). */
export function closestThumb(centers: readonly { x: number; y: number }[], x: number, y: number): number {
  let best = 0;
  let bestDistance = Infinity;
  centers.forEach((c, i) => {
    const d = (c.x - x) ** 2 + (c.y - y) ** 2;
    if (d < bestDistance) {
      bestDistance = d;
      best = i;
    }
  });
  return best;
}

const THEME: Record<SlideTheme, string> = {
  light: "bg-card text-foreground",
  dark: "bg-nq-fg text-nq-bg",
  brand: "bg-primary text-primary-foreground",
};

type Scope = Magics & {
  $nq: { t(en: string, ar: string): string; locale: string };
  deck: Deck;
  selectedId: string | undefined;
  announce: string;
  saveState: { status: "idle" | "saving" | "error"; message?: string };
  savedJson: string;
  playing: boolean;
  pIndex: number;
  notes: boolean;
  isFull: boolean;
  chrome: boolean;
  elapsed: number;
  drag: { id: string; dx: number; dy: number; over: number } | null;
  readonly slide: Slide | undefined;
  readonly index: number;
  n(value: number): string;
  go(next: number): void;
  wake(): void;
  toggleFullscreen(): void;
  stopPlayer(): void;
  move(from: number, to: number): void;
} & Record<string, any>;

export const presentationEditor: Register = (Alpine) => {
  Alpine.data("nqPresentation", (initial?: Deck, options: PresentationOptions = {}) => {
    let session: { id: string; from: number; x: number; y: number; centers: { x: number; y: number }[]; active: boolean } | null = null;
    let swallowClick = false;
    let swipe: { x: number; y: number } | null = null;
    let clock: ReturnType<typeof setInterval> | undefined;
    let idle: ReturnType<typeof setTimeout> | undefined;
    let onMove: ((e: PointerEvent) => void) | null = null;
    let onUp: (() => void) | null = null;
    let onFullscreen: (() => void) | null = null;
    let destroyed = false;

    return {
      deck: initial ?? { title: "", slides: [] },
      selectedId: undefined as string | undefined,
      announce: "",
      saveState: { status: "idle" } as { status: "idle" | "saving" | "error"; message?: string },
      savedJson: "",
      playing: false,
      pIndex: 0,
      notes: !!options.defaultShowNotes,
      isFull: false,
      chrome: true,
      elapsed: 0,
      drag: null as { id: string; dx: number; dy: number; over: number } | null,
      readOnly: !!options.readOnly,
      layouts: SLIDE_LAYOUTS,
      themes: ["light", "dark", "brand"] as SlideTheme[],

      init(this: Scope) {
        if (!Array.isArray(this.deck.slides)) this.deck = { title: this.deck.title ?? "", slides: [] };
        this.selectedId = this.deck.slides[0]?.id;
        this.savedJson = JSON.stringify(this.deck);
        this.$watch("deck", () => {
          if (this.saveState.status === "error") this.saveState = { status: "idle" };
          // A deleted selection falls back to the first slide.
          if (!this.slide && this.deck.slides[0]) this.selectedId = this.deck.slides[0].id;
          this.$root.dispatchEvent(new CustomEvent("change", { detail: { deck: this.deck }, bubbles: true }));
        });
        this.$watch("playing", (open: boolean) => {
          this.stopPlayer();
          if (!open) return;
          this.pIndex = this.index;
          this.elapsed = 0;
          onFullscreen = () => (this.isFull = !!document.fullscreenElement);
          document.addEventListener("fullscreenchange", onFullscreen);
          clock = setInterval(() => this.elapsed++, 1000);
          this.wake();
          void this.$nextTick(() => {
            if (destroyed) return;
            const stage = document.querySelector<HTMLElement>('[data-slot="deck-player-stage"]');
            stage?.focus();
            const popup = stage?.closest<HTMLElement>('[data-slot="deck-player"]');
            if (options.fullscreen !== false && popup?.requestFullscreen) void popup.requestFullscreen().catch(() => undefined);
          });
        });
      },
      destroy(this: Scope) {
        destroyed = true;
        this.stopPlayer();
        if (onMove) window.removeEventListener("pointermove", onMove);
        if (onUp) {
          window.removeEventListener("pointerup", onUp);
          window.removeEventListener("pointercancel", onUp);
        }
      },

      // ---- editor ----
      get slide(): Slide | undefined {
        return this.deck.slides.find((s) => s.id === this.selectedId) ?? this.deck.slides[0];
      },
      get index(): number {
        return Math.max(0, this.deck.slides.findIndex((s) => s.id === this.slide?.id));
      },
      get count(): number {
        return this.deck.slides.length;
      },
      get dirty(): boolean {
        return JSON.stringify(this.deck) !== this.savedJson;
      },
      get withNotes(): number {
        return this.deck.slides.filter((s) => (s.notes ?? "").trim() !== "").length;
      },
      n(this: Scope, value: number): string {
        return new Intl.NumberFormat(this.$nq.locale.startsWith("ar") ? "ar-u-nu-arab" : "en").format(value);
      },
      slideName(this: Scope, s: Slide): string {
        return s.title.trim() || lines(s.body)[0] || this.$nq.t("Untitled slide", "شريحة بلا عنوان");
      },
      countText(this: Scope): string {
        const c = this.n(this.count);
        const base = this.$nq.t(`${c} slides`, `${c} شرائح`);
        return this.withNotes ? `${base} · ${this.$nq.t(`${this.n(this.withNotes)} with notes`, `${this.n(this.withNotes)} بملاحظات`)}` : base;
      },
      layoutName(this: Scope, layout: SlideLayout): string {
        const names: Record<SlideLayout, [string, string]> = {
          title: ["Title", "عنوان"], section: ["Section", "قسم"], content: ["Content", "محتوى"], "two-column": ["Two columns", "عمودان"],
          quote: ["Quote", "اقتباس"], image: ["Image", "صورة"], blank: ["Blank", "فارغة"],
        };
        return this.$nq.t(...names[layout]);
      },
      lines,
      safeImage: safeImageSrc,
      themeClass(this: Scope, s: Slide | undefined): string {
        return THEME[s?.theme ?? "light"];
      },
      select(this: Scope, id: string) {
        if (!swallowClick) this.selectedId = id;
      },
      addSlide(this: Scope, layout: SlideLayout) {
        const s: Slide = { id: makeSlideId(), layout, title: "", theme: layout === "section" ? "brand" : "light" };
        const at = this.slide ? this.index + 1 : 0;
        this.deck.slides = [...this.deck.slides.slice(0, at), s, ...this.deck.slides.slice(at)];
        this.selectedId = s.id;
        this.announce = this.$nq.t("Slide added", "أُضيفت شريحة");
        this.revealThumb(s.id);
      },
      duplicate(this: Scope) {
        const cur = this.slide;
        if (!cur) return;
        const copy: Slide = { ...JSON.parse(JSON.stringify(cur)), id: makeSlideId() };
        const at = this.index + 1;
        this.deck.slides = [...this.deck.slides.slice(0, at), copy, ...this.deck.slides.slice(at)];
        this.selectedId = copy.id;
        this.revealThumb(copy.id);
      },
      remove(this: Scope) {
        if (!this.slide) return;
        const at = this.index;
        const next = this.deck.slides.filter((_, i) => i !== at);
        this.deck.slides = next;
        this.selectedId = next[Math.min(at, next.length - 1)]?.id;
        this.announce = this.$nq.t("Slide deleted", "حُذفت الشريحة");
      },
      move(this: Scope, from: number, to: number) {
        const target = Math.max(0, Math.min(this.deck.slides.length - 1, to));
        if (target === from) return;
        this.deck.slides = moveSlide(this.deck.slides, from, target);
        this.announce = this.$nq.t(`Slide moved to position ${this.n(target + 1)}`, `نُقلت الشريحة إلى الموضع ${this.n(target + 1)}`);
      },
      revealThumb(this: Scope, id: string) {
        void this.$nextTick(() => {
          if (destroyed || !this.$root) return;
          const el = [...this.$root.querySelectorAll<HTMLElement>("[data-slide-id]")].find((e) => e.dataset.slideId === id);
          el?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
        });
      },

      // Native pointer reorder of the rail: press a thumbnail and drag past 5px; the thumbnail follows the pointer, the
      // one under it is marked, releasing moves the slide there. A drag never selects (the click is swallowed).
      onThumbDown(this: Scope, e: PointerEvent, i: number, id: string) {
        if (this.readOnly || e.button > 0 || this.deck.slides.length < 2) return;
        const items = [...this.$root.querySelectorAll<HTMLElement>("[data-slide-id]")];
        session = {
          id, from: i, x: e.clientX, y: e.clientY, active: false,
          centers: items.map((el) => {
            const r = el.getBoundingClientRect();
            return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
          }),
        };
        onMove = (ev) => {
          const s = session;
          if (!s) return;
          const dx = ev.clientX - s.x;
          const dy = ev.clientY - s.y;
          if (!s.active) {
            if (Math.hypot(dx, dy) < 5) return;
            s.active = true;
          }
          const from = s.centers[s.from]!;
          this.drag = { id: s.id, dx, dy, over: closestThumb(s.centers, from.x + dx, from.y + dy) };
        };
        onUp = () => {
          const s = session;
          const d = this.drag;
          session = null;
          this.drag = null;
          if (onMove) window.removeEventListener("pointermove", onMove);
          if (onUp) {
            window.removeEventListener("pointerup", onUp);
            window.removeEventListener("pointercancel", onUp);
          }
          if (!s || !s.active || !d) return;
          swallowClick = true;
          setTimeout(() => (swallowClick = false), 0);
          this.move(s.from, d.over);
        };
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
        window.addEventListener("pointercancel", onUp);
      },
      thumbStyle(this: Scope, id: string): string {
        const d = this.drag;
        return d && d.id === id ? `transform: translate(${d.dx}px, ${d.dy}px); touch-action: none` : "";
      },
      isDragging(this: Scope, id: string): boolean {
        return !!this.drag && this.drag.id === id;
      },
      isOver(this: Scope, i: number, id: string): boolean {
        return !!this.drag && this.drag.id !== id && this.drag.over === i;
      },

      async save(this: Scope) {
        if (!options.save) return;
        this.saveState = { status: "saving" };
        try {
          const result = await options.save(JSON.parse(JSON.stringify(this.deck)));
          if (result && result.error) {
            this.saveState = { status: "error", message: result.error };
            return;
          }
          this.savedJson = JSON.stringify(this.deck);
          this.saveState = { status: "idle" };
        } catch (error) {
          this.saveState = { status: "error", message: error instanceof Error ? error.message : this.$nq.t("Could not save", "تعذر الحفظ") };
        }
      },
      present(this: Scope) {
        this.$root.dispatchEvent(new CustomEvent("present", { detail: { deck: this.deck, index: this.index }, bubbles: true }));
        this.playing = true;
      },

      // ---- player ----
      playerSlide(this: Scope): Slide {
        return this.deck.slides[clampIndex(this.pIndex, this.deck.slides.length)] ?? ({ id: "", layout: "blank", title: "" } as Slide);
      },
      upNext(this: Scope): Slide | undefined {
        return this.deck.slides[clampIndex(this.pIndex, this.deck.slides.length) + 1];
      },
      progress(this: Scope): string {
        const c = this.deck.slides.length;
        return `${c <= 0 ? 0 : ((clampIndex(this.pIndex, c) + 1) / c) * 100}%`;
      },
      slideOfText(this: Scope): string {
        const c = this.deck.slides.length;
        return c ? this.$nq.t(`Slide ${this.n(this.pIndex + 1)} of ${this.n(c)}`, `الشريحة ${this.n(this.pIndex + 1)} من ${this.n(c)}`) : this.$nq.t("This presentation has no slides.", "لا يحتوي هذا العرض على شرائح.");
      },
      counterText(this: Scope): string {
        const c = this.deck.slides.length;
        return c ? `${this.n(this.pIndex + 1)} / ${this.n(c)}` : "0";
      },
      announceText(this: Scope): string {
        const s = this.deck.slides[this.pIndex];
        return s ? `${this.slideOfText()}: ${this.slideName(s)}` : "";
      },
      elapsedText(this: Scope): string {
        return formatElapsed(this.elapsed);
      },
      atStart(this: Scope): boolean {
        return this.pIndex <= 0;
      },
      atEnd(this: Scope): boolean {
        return this.pIndex >= this.deck.slides.length - 1;
      },
      stageStyle(this: Scope): string {
        return `max-width: calc((100dvh - ${this.notes ? "19rem" : "6rem"}) * 16 / 9)`;
      },
      go(this: Scope, next: number) {
        this.pIndex = clampIndex(next, this.deck.slides.length);
      },
      closePlayer(this: Scope) {
        this.playing = false;
      },
      wake(this: Scope) {
        this.chrome = true;
        clearTimeout(idle);
        idle = setTimeout(() => (this.chrome = false), 2600);
      },
      toggleFullscreen(this: Scope) {
        if (document.fullscreenElement) void document.exitFullscreen?.();
        else void document.querySelector<HTMLElement>('[data-slot="deck-player"]')?.requestFullscreen?.()?.catch(() => undefined);
      },
      stopPlayer(this: Scope) {
        clearInterval(clock);
        clearTimeout(idle);
        if (onFullscreen) document.removeEventListener("fullscreenchange", onFullscreen);
        onFullscreen = null;
        if (document.fullscreenElement) void document.exitFullscreen?.()?.catch(() => undefined);
      },
      onPlayerKey(this: Scope, e: KeyboardEvent) {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.key === "Escape") {
          this.playing = false;
          return;
        }
        const action = keyAction(e.key, this.$nq.locale.startsWith("ar"));
        if (!action) return;
        // Space and Enter belong to a focused button; the stage and the dialog body use them to advance.
        if ((e.key === " " || e.key === "Enter") && e.target instanceof HTMLElement && e.target.closest("button")) return;
        e.preventDefault();
        this.wake();
        if (action === "next") this.go(this.pIndex + 1);
        else if (action === "prev") this.go(this.pIndex - 1);
        else if (action === "first") this.go(0);
        else if (action === "last") this.go(this.deck.slides.length - 1);
        else if (action === "notes") this.notes = !this.notes;
        else if (action === "fullscreen") this.toggleFullscreen();
      },
      swipeStart(e: PointerEvent) {
        swipe = { x: e.clientX, y: e.clientY };
      },
      swipeEnd(this: Scope, e: PointerEvent) {
        const start = swipe;
        swipe = null;
        if (!start) return;
        const action = swipeAction(e.clientX - start.x, e.clientY - start.y, this.$nq.locale.startsWith("ar"));
        if (action === "next") this.go(this.pIndex + 1);
        else if (action === "prev") this.go(this.pIndex - 1);
      },
      swipeCancel() {
        swipe = null;
      },
    } satisfies ThisType<Scope>;
  });
};
