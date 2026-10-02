import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import nasaq from "../src/alpine";
import { flipTokenStyle, revealTokenStyle } from "../src/alpine/text-effects-style";
import { marqueeCopies, nextFlipIndex, splitText } from "../src/alpine/text-effects-logic";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = (ms = 60) => new Promise((r) => setTimeout(r, ms));

beforeAll(() => {
  Alpine.plugin(nasaq);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).Alpine = Alpine;
  Alpine.start();
});

afterEach(() => {
  vi.unstubAllGlobals();
  for (const el of [...document.body.children]) {
    Alpine.destroyTree(el as HTMLElement);
    el.remove();
  }
});

async function mount() {
  const host = document.createElement("div");
  host.innerHTML = rendered("text-effects");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data = (el: Element) => Alpine.$data(el as HTMLElement) as Record<string, any>;
const byId = (host: ParentNode, id: string) => host.querySelector<HTMLElement>(`#${id}`)!;
const reducedMotion = () => vi.stubGlobal("matchMedia", (query: string) => ({ matches: query.includes("reduce"), media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));

describe("text-effects logic", () => {
  it("splits words and keeps Arabic whole", () => {
    expect(splitText("a b", "word").tokens.map((t) => t.text)).toEqual(["a", " ", "b"]);
    expect(splitText("مرحبا", "grapheme").mode).toBe("word");
    expect(nextFlipIndex(2, 3, true)).toBe(0);
    expect(marqueeCopies(0, 0)).toBe(2);
    expect(flipTokenStyle(true, 0)).toContain("opacity: 1");
    expect(revealTokenStyle(false, 45)).toContain("blur(4px)");
  });
});

describe("text-effects (rendered Blade under Alpine)", () => {
  it("text-flip shows the first phrase and flips on a tick, announcing the change", async () => {
    const host = await mount();
    const flip = byId(host, "fx-flip");
    const phrases = flip.querySelectorAll<HTMLElement>("[data-phrase]");
    expect(phrases.length).toBe(3);
    expect(phrases[0]!.hasAttribute("data-active")).toBe(true);
    expect(flip.querySelector(".sr-only")!.textContent).toBe("faster, safer, together");
    const seen: number[] = [];
    flip.addEventListener("nq-flip-change", (e) => seen.push((e as CustomEvent).detail.index));
    data(flip).tick();
    expect(phrases[0]!.hasAttribute("data-active")).toBe(false);
    expect(phrases[1]!.hasAttribute("data-active")).toBe(true);
    expect(phrases[1]!.querySelector<HTMLElement>("[data-token]")!.style.opacity).toBe("1");
    expect(phrases[0]!.querySelector<HTMLElement>("[data-token]")!.style.opacity).toBe("0");
    expect(seen).toEqual([1]);
  });

  it("text-flip does not rotate while halted or paused", async () => {
    const host = await mount();
    const flip = byId(host, "fx-flip");
    data(flip).halted = true;
    data(flip).tick();
    expect(data(flip).index).toBe(0);
    data(flip).halted = false;
    data(flip).paused = true;
    data(flip).tick();
    expect(data(flip).index).toBe(0);
  });

  it("text-flip stays on the first phrase under reduced motion", async () => {
    reducedMotion();
    const host = await mount();
    const flip = byId(host, "fx-flip");
    expect(flip.hasAttribute("data-reduced")).toBe(true);
    expect(flip.querySelectorAll("[data-active]").length).toBe(1);
  });

  it("text-shimmer drops the sweep under reduced motion", async () => {
    reducedMotion();
    const host = await mount();
    const shimmer = byId(host, "fx-shimmer");
    expect(shimmer.className).toContain("text-foreground");
    expect(shimmer.className).not.toContain("text-transparent");
  });

  it("text-reveal is shown at once when immediate and waits to be seen otherwise", async () => {
    const seen: ((entries: { isIntersecting: boolean }[]) => void)[] = [];
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(cb: (entries: { isIntersecting: boolean }[]) => void) {
          seen.push(cb);
        }
        observe() {}
        disconnect() {}
      },
    );
    const host = await mount();
    expect(byId(host, "fx-reveal").hasAttribute("data-shown")).toBe(true);
    expect(byId(host, "fx-reveal").querySelector(".sr-only")!.textContent).toBe("Words fade and rise into place as you scroll.");
    const later = byId(host, "fx-reveal-scroll");
    expect(later.hasAttribute("data-shown")).toBe(false);
    expect(later.querySelector<HTMLElement>("[data-token]")!.style.opacity).toBe("0");
    seen.forEach((cb) => cb([{ isIntersecting: true }]));
    expect(later.hasAttribute("data-shown")).toBe(true);
    expect(later.querySelector<HTMLElement>("[data-token]")!.style.opacity).toBe("1");
  });

  it("text-reveal is plain text under reduced motion", async () => {
    reducedMotion();
    const host = await mount();
    const later = byId(host, "fx-reveal-scroll");
    expect(later.hasAttribute("data-shown")).toBe(true);
    expect(later.querySelector("[data-token]")).toBeNull();
    expect(later.querySelector("[data-visual]")!.textContent).toBe("Hidden until seen");
  });

  it("handwritten-mark is drawn when not animated and draws in when seen", async () => {
    const seen: ((entries: { isIntersecting: boolean }[]) => void)[] = [];
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(cb: (entries: { isIntersecting: boolean }[]) => void) {
          seen.push(cb);
        }
        observe() {}
        disconnect() {}
      },
    );
    const host = await mount();
    expect(byId(host, "fx-mark-still").hasAttribute("data-drawn")).toBe(true);
    const mark = byId(host, "fx-mark");
    const path = mark.querySelector<SVGPathElement>("path")!;
    expect(mark.hasAttribute("data-drawn")).toBe(false);
    expect(path.style.strokeDashoffset).toBe("1");
    seen.forEach((cb) => cb([{ isIntersecting: true }]));
    expect(mark.hasAttribute("data-drawn")).toBe(true);
    expect(path.style.strokeDashoffset).toBe("0");
  });

  it("handwritten-note keeps its own markup and author", async () => {
    const host = await mount();
    const note = byId(host, "fx-note");
    expect(note.tagName).toBe("ASIDE");
    expect(note.textContent).toContain("Remember to say thanks.");
    expect(note.textContent).toContain("Fady");
  });

  it("marquee keeps hidden copies out of assistive tech and flattens under reduced motion", async () => {
    const host = await mount();
    const copies = byId(host, "fx-marquee").querySelectorAll<HTMLElement>("[data-slot='marquee-copy']");
    expect(copies.length).toBeGreaterThanOrEqual(2);
    expect(copies[0]!.hasAttribute("aria-hidden")).toBe(false);
    expect(copies[1]!.getAttribute("aria-hidden")).toBe("true");
    Alpine.destroyTree(host);
    host.remove();
    reducedMotion();
    const still = await mount();
    const marquee = byId(still, "fx-marquee");
    expect(marquee.hasAttribute("data-static")).toBe(true);
    expect(marquee.querySelectorAll("[data-slot='marquee-copy']").length).toBe(1);
    expect(marquee.className).not.toContain("mask-image");
  });
});
