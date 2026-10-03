import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import nasaq from "../src/alpine";
import { formatSessionClock, sessionStateAt, sessionTimeline } from "../src/alpine/marketing-sections-logic";

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
  host.innerHTML = rendered("marketing-sections");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data = (el: Element) => Alpine.$data(el as HTMLElement) as Record<string, any>;
const byId = (host: ParentNode, id: string) => host.querySelector<HTMLElement>(`#${id}`)!;
const reducedMotion = () => vi.stubGlobal("matchMedia", (query: string) => ({ matches: query.includes("reduce"), media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));

describe("session timeline", () => {
  const events = [
    { role: "user" as const, text: "One two" },
    { role: "tool" as const, text: "run", title: "Tool" },
    { role: "assistant" as const, text: "A b c" },
  ];
  it("counts words, gaps and holds", () => {
    const t = sessionTimeline(events);
    expect(t.total).toBe(2 * 90 + 500 + 900 + 500 + 3 * 90);
  });
  it("shows whole words at a moment", () => {
    const t = sessionTimeline(events);
    expect(sessionStateAt(t, 0)[0]!).toMatchObject({ started: true, done: false });
    expect(sessionStateAt(t, 10)[2]!.started).toBe(false);
    expect(sessionStateAt(t, t.total).every((s) => s.done)).toBe(true);
  });
  it("formats the clock", () => expect(formatSessionClock(65000)).toBe("1:05"));
});

describe("marketing sections (rendered Blade)", () => {
  it("renders every section", async () => {
    const host = await mount();
    for (const slot of ["app-mockup-hero", "how-it-works", "feature-grid", "pricing-packs", "session-playback", "cta-banner", "grid-background"]) {
      expect(host.querySelector(`[data-slot="${slot}"]`), slot).not.toBeNull();
    }
  });

  it("animates the aurora blobs", async () => {
    const animate = vi.fn(() => ({ cancel() {} }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (HTMLElement.prototype as any).animate = animate;
    const host = await mount();
    expect(host.querySelectorAll("[data-blob]").length).toBeGreaterThan(0);
    expect(animate).toHaveBeenCalled();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (HTMLElement.prototype as any).animate;
  });

  it("holds the aurora still under reduced motion", async () => {
    reducedMotion();
    const animate = vi.fn(() => ({ cancel() {} }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (HTMLElement.prototype as any).animate = animate;
    await mount();
    expect(animate).not.toHaveBeenCalled();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (HTMLElement.prototype as any).animate;
  });

  it("pricing: Buy fires nq-purchase and keeps the button busy until the promise settles", async () => {
    const host = await mount();
    const packs = byId(host, "mk-packs");
    let release!: () => void;
    const seen: string[] = [];
    packs.addEventListener("nq-purchase", (e) => {
      const d = (e as CustomEvent).detail;
      seen.push(d.pack.id);
      d.wait(new Promise<void>((r) => (release = r)));
    });
    const buttons = packs.querySelectorAll<HTMLButtonElement>("button[data-pack]");
    buttons[0]!.click();
    await tick();
    expect(seen).toEqual(["s"]);
    expect(buttons[0]!.getAttribute("aria-busy")).toBe("true");
    expect(buttons[1]!.disabled).toBe(true);
    release();
    await tick();
    expect(buttons[0]!.hasAttribute("aria-busy")).toBe(false);
    expect(buttons[1]!.disabled).toBe(false);
  });

  it("pricing: a Buy nobody waits on does not go busy", async () => {
    const host = await mount();
    const button = byId(host, "mk-packs").querySelector<HTMLButtonElement>("button[data-pack]")!;
    button.click();
    await tick();
    expect(button.hasAttribute("aria-busy")).toBe(false);
  });

  it("session: starts whole when auto-play is off, with the full clock", async () => {
    const host = await mount();
    const figure = byId(host, "mk-session");
    expect(figure.textContent).toContain("You had 42 bookings");
    expect(data(figure).time).toBe(data(figure).total);
    expect(data(figure).mode()).toBe("restart");
    expect(figure.querySelector("[data-cursor]")!.hasAttribute("hidden")).toBe(true);
  });

  it("session: play replays word by word and fires nq-session-end", async () => {
    vi.stubGlobal("requestAnimationFrame", (cb: (t: number) => void) => setTimeout(() => cb(performance.now()), 16) as unknown as number);
    vi.stubGlobal("cancelAnimationFrame", (id: number) => clearTimeout(id));
    const host = await mount();
    const figure = byId(host, "mk-session");
    let ended = 0;
    figure.addEventListener("nq-session-end", () => ended++);
    const d = data(figure);
    d.time = 0;
    d.play();
    await tick(120);
    expect(d.playing).toBe(true);
    expect(d.mode()).toBe("pause");
    d.toggle();
    expect(d.playing).toBe(false);
    expect(d.playLabel()).toBe("Play");
    expect(ended).toBe(0);
  });

  it("session: seeking with the scrubber pauses and shows part of the script", async () => {
    const host = await mount();
    const figure = byId(host, "mk-session");
    const d = data(figure);
    d.pct = 0;
    await tick();
    expect(d.time).toBe(0);
    expect(figure.querySelector<HTMLElement>('[data-event="2"]')!.hidden).toBe(true);
    d.pct = 100;
    await tick();
    expect(figure.querySelector<HTMLElement>('[data-event="2"]')!.hidden).toBe(false);
  });
});
