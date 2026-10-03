// The Blade presentation-editor example (packages/php/examples/rendered/presentation-editor.html) under real Alpine.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";
import { closestThumb, formatElapsed, keyAction, moveSlide, safeImageSrc, swipeAction } from "../src/alpine/presentation-editor";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = () => new Promise((r) => setTimeout(r, 30));

beforeAll(() => {
  Alpine.plugin(nasaq);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).Alpine = Alpine;
  Alpine.start();
});

afterEach(() => {
  for (const el of [...document.body.children]) {
    Alpine.destroyTree(el as HTMLElement);
    el.remove();
  }
  document.documentElement.lang = "en";
  (Alpine.store("nq") as { setLocale(l: string): void }).setLocale("en");
});

async function mount() {
  const host = document.createElement("div");
  host.innerHTML = rendered("presentation-editor");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

type Scope = {
  deck: { title: string; slides: { id: string; title: string }[] };
  playing: boolean;
  pIndex: number;
  notes: boolean;
  announce: string;
  saveState: { status: string };
  dirty: boolean;
};
const root = () => document.querySelector<HTMLElement>('[data-slot="presentation-editor"]')!;
const state = () => Alpine.$data(root()) as unknown as Scope;
const thumbs = () => [...document.querySelectorAll<HTMLElement>("[data-slide-id]")];
const btn = (label: string) => document.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;

describe("presentation helpers", () => {
  it("moves, maps keys and swipes with the reading direction, and vets images", () => {
    expect(moveSlide(["a", "b", "c"], 0, 2)).toEqual(["b", "c", "a"]);
    expect(keyAction("ArrowRight", false)).toBe("next");
    expect(keyAction("ArrowRight", true)).toBe("prev");
    expect(swipeAction(-80, 0, true)).toBe("prev");
    expect(safeImageSrc("javascript:alert(1)")).toBeUndefined();
    expect(safeImageSrc("https://a.co/x.png")).toBeDefined();
    expect(formatElapsed(65)).toBe("1:05");
    expect(closestThumb([{ x: 0, y: 0 }, { x: 0, y: 100 }], 0, 80)).toBe(1);
  });
});

describe("presentation-editor (Blade example)", () => {
  it("renders the title input, the rail and the unsaved-changes badge", async () => {
    await mount();
    expect(root().getAttribute("aria-label")).toBe("Presentation editor");
    expect(thumbs()).toHaveLength(1);
    expect(root().textContent).toContain("1 slides");
    expect(root().textContent).toContain("Saved");
    expect(document.querySelector<HTMLInputElement>('input[aria-label="Deck title"]')!.value).toBe("Q3 review");
    expect(document.querySelector('[aria-current="true"]')!.getAttribute("aria-label")).toBe("1. Q3 review");
  });

  it("duplicates, moves and deletes slides, announcing the change", async () => {
    await mount();
    btn("Duplicate slide").click();
    await tick();
    expect(thumbs()).toHaveLength(2);
    expect(state().dirty).toBe(true);
    btn("Move earlier").click();
    await tick();
    expect(state().announce).toBe("Slide moved to position 1");
    btn("Delete slide").click();
    await tick();
    expect(thumbs()).toHaveLength(1);
  });

  it("edits the title in place and saves", async () => {
    await mount();
    const title = document.querySelector<HTMLTextAreaElement>('[data-slot="slide"]:not([aria-hidden]) textarea')!;
    title.value = "Changed";
    title.dispatchEvent(new Event("input", { bubbles: true }));
    await tick();
    expect(state().deck.slides[0]!.title).toBe("Changed");
    expect(root().textContent).toContain("Unsaved changes");
    [...root().querySelectorAll("button")].find((b) => b.textContent!.trim() === "Save")!.click();
    await tick();
    expect(root().textContent).toContain("Saved");
    expect(state().dirty).toBe(false);
  });

  it("reorders by dragging a thumbnail with native pointer events", async () => {
    await mount();
    btn("Duplicate slide").click();
    btn("Duplicate slide").click();
    await tick();
    const ids = () => thumbs().map((t) => t.dataset.slideId);
    const before = ids();
    thumbs().forEach((el, i) => {
      el.getBoundingClientRect = () => ({ left: 0, top: i * 100, width: 100, height: 90, right: 100, bottom: i * 100 + 90, x: 0, y: i * 100, toJSON() {} }) as DOMRect;
    });
    thumbs()[0]!.dispatchEvent(new MouseEvent("pointerdown", { clientX: 50, clientY: 45, button: 0, bubbles: true }));
    window.dispatchEvent(new MouseEvent("pointermove", { clientX: 50, clientY: 250 }));
    await tick();
    expect(thumbs()[0]!.hasAttribute("data-dragging")).toBe(true);
    expect(thumbs()[2]!.hasAttribute("data-over")).toBe(true);
    window.dispatchEvent(new MouseEvent("pointerup", { clientX: 50, clientY: 250 }));
    await tick();
    expect(ids()).toEqual([before[1], before[2], before[0]]);
  });

  it("plays the deck in a modal player and closes it", async () => {
    await mount();
    [...root().querySelectorAll("button")].find((b) => b.textContent!.trim() === "Present")!.click();
    await tick();
    const player = document.querySelector<HTMLElement>('[data-slot="deck-player"]')!;
    expect(player.getAttribute("style") ?? "").not.toContain("display: none");
    expect(player.querySelector('[role="progressbar"]')!.getAttribute("aria-valuetext")).toBe("Slide 1 of 1");
    player.dispatchEvent(new KeyboardEvent("keydown", { key: "n", bubbles: true }));
    await tick();
    expect(state().notes).toBe(true);
    player.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await tick();
    expect(state().playing).toBe(false);
  });

  it("speaks Arabic with Arabic digits", async () => {
    (Alpine.store("nq") as { setLocale(l: string): void }).setLocale("ar");
    await mount();
    expect(root().textContent).toContain("شرائح");
  });
});
