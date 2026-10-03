import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import nasaq from "../src/alpine";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms));

beforeAll(() => {
  // happy-dom reports webdriver: true, which makes the terminal show its finished frame; play it for real.
  Object.defineProperty(navigator, "webdriver", { value: false, configurable: true });
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
});

async function mount(html: string) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data = (host: HTMLElement): any => Alpine.$data(host.querySelector<HTMLElement>('[data-slot="typing-terminal"]')!);

describe("typing-terminal (Blade example)", () => {
  it("is ltr, keeps a screen-reader transcript and starts typing on load", async () => {
    const host = await mount(rendered("typing-terminal"));
    const root = host.querySelector<HTMLElement>('[data-slot="typing-terminal"]')!;
    expect(root.getAttribute("dir")).toBe("ltr");
    expect(root.querySelector("pre.sr-only")!.textContent).toContain("❯ npx create-togo-app my-shop");
    expect(root.querySelector("pre.sr-only")!.textContent).toContain("✓ Installed 214 packages");
    expect(root.hasAttribute("data-playing")).toBe(true);
    // The server-rendered rows were handed over to the reactive ones.
    expect(root.querySelector('[x-ref="ssr"]')).toBeNull();
    expect(root.querySelectorAll('[data-kind="command"]').length).toBeGreaterThan(0);
  });

  it("plays to the end, offers Replay and replays", async () => {
    const host = await mount(rendered("typing-terminal"));
    const root = host.querySelector<HTMLElement>('[data-slot="typing-terminal"]')!;
    const d = data(host);
    let completed = 0;
    root.addEventListener("complete", () => completed++);
    d.typeMs = 1;
    d.lineMs = 1;
    d.replay();
    await tick(100);
    for (let i = 0; i < 40 && !completed; i++) await tick(100);
    expect(completed).toBe(1);
    expect(root.hasAttribute("data-playing")).toBe(false);
    expect(root.querySelectorAll('[data-kind="command"]')).toHaveLength(2);
    expect(root.querySelectorAll('[data-kind="output"]')).toHaveLength(2);
    expect(root.querySelector('[data-kind="output"]')!.textContent).toContain("Installed 214 packages");
    const replay = root.querySelector<HTMLElement>('[data-slot="typing-terminal-header"] button')!;
    await vi.waitFor(() => expect(replay.style.display).toBe(""), { timeout: 2000 });
    replay.click();
    await vi.waitFor(() => expect(root.hasAttribute("data-playing")).toBe(true), { timeout: 2000 });
  });

  it("shows the whole transcript without playing when play is false", async () => {
    const host = await mount(rendered("typing-terminal"));
    const root = host.querySelector<HTMLElement>('[data-slot="typing-terminal"]')!;
    root.dispatchEvent(new CustomEvent("nq-typing-play", { detail: { play: false } }));
    await tick();
    expect(root.hasAttribute("data-playing")).toBe(false);
    expect(root.querySelectorAll('[data-kind="command"]')).toHaveLength(2);
    expect(root.querySelectorAll('[data-kind="output"]')).toHaveLength(2);
    expect(root.querySelector<HTMLElement>('[data-slot="typing-terminal-header"] button')!.style.display).toBe("none");
  });
});
