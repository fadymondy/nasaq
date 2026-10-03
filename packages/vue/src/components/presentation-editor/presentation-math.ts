/* Pure helpers for PresentationEditor and DeckPlayer: slide model, navigation, swipe, image safety, timing. No React. */

export type SlideLayout = "title" | "section" | "content" | "two-column" | "quote" | "image" | "blank";
export const SLIDE_LAYOUTS: readonly SlideLayout[] = ["title", "section", "content", "two-column", "quote", "image", "blank"];

export type SlideTheme = "light" | "dark" | "brand";
export const SLIDE_THEMES: readonly SlideTheme[] = ["light", "dark", "brand"];

export interface Slide {
  id: string;
  layout: SlideLayout;
  title: string;
  /** Second line: the subtitle of a title slide, the author of a quote. */
  subtitle?: string;
  /** Main text. One line per bullet on content slides; the quote itself on quote slides. */
  body?: string;
  /** Right column of a two-column slide. */
  body2?: string;
  /** Image address for image slides: https, a data:image URL or a site-relative path. */
  image?: string;
  imageAlt?: string;
  /** Presenter notes, shown in the player's notes panel only. */
  notes?: string;
  theme?: SlideTheme;
}

export interface Deck {
  title: string;
  slides: Slide[];
}

let counter = 0;
export function makeSlideId(): string {
  counter += 1;
  return `slide_${Date.now().toString(36)}${counter.toString(36)}`;
}

export function newSlide(layout: SlideLayout, overrides: Partial<Slide> = {}): Slide {
  return { id: makeSlideId(), layout, title: "", theme: layout === "section" ? "brand" : "light", ...overrides };
}

export function duplicateSlide(slide: Slide): Slide {
  return { ...slide, id: makeSlideId() };
}

export function moveSlide<T>(list: readonly T[], from: number, to: number): T[] {
  if (from < 0 || from >= list.length) return [...list];
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(Math.max(0, Math.min(to, next.length)), 0, item as T);
  return next;
}

export function insertSlide(slides: readonly Slide[], index: number, slide: Slide): Slide[] {
  const i = Math.max(0, Math.min(index, slides.length));
  return [...slides.slice(0, i), slide, ...slides.slice(i)];
}

export function removeSlide(slides: readonly Slide[], index: number): Slide[] {
  return slides.filter((_, i) => i !== index);
}

/** The non-empty lines of a text block. */
export function lines(text: string | undefined): string[] {
  return (text ?? "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
}

/** Strips a leading bullet marker so "- one" and "one" read the same. */
export function bulletText(line: string): string {
  return line.replace(/^[-*•]\s+/, "");
}

export function clampIndex(index: number, count: number): number {
  if (count <= 0) return 0;
  return Math.max(0, Math.min(count - 1, index));
}

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

/** A horizontal swipe of at least `threshold` px moves a slide. Swiping toward the start goes forward, so RTL is mirrored. */
export function swipeAction(dx: number, dy: number, rtl: boolean, threshold = 48): "next" | "prev" | null {
  if (Math.abs(dx) < threshold || Math.abs(dx) < Math.abs(dy) * 1.2) return null;
  const towardStart = rtl ? dx > 0 : dx < 0;
  return towardStart ? "next" : "prev";
}

/** 0..1 through the deck: the first slide is 1/count, the last is 1. */
export function progressOf(index: number, count: number): number {
  return count <= 0 ? 0 : (clampIndex(index, count) + 1) / count;
}

/** "3:05" or "1:02:09". */
export function formatElapsed(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const pad = (v: number) => String(v).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
}

const SAFE_IMAGE = /^(https?:\/\/|\/(?!\/)|data:image\/(png|jpe?g|gif|webp|avif|svg\+xml)[;,])/i;
/** Only https, http, site-relative and data:image sources render; everything else (javascript:, file:) is dropped. */
export function safeImageSrc(src: string | undefined): string | undefined {
  const value = (src ?? "").trim();
  return value && SAFE_IMAGE.test(value) ? value : undefined;
}

export function slideTitle(slide: Slide, fallback: string): string {
  return slide.title.trim() || lines(slide.body)[0] || fallback;
}

export function notesCount(deck: Deck): number {
  return deck.slides.filter((s) => (s.notes ?? "").trim() !== "").length;
}
