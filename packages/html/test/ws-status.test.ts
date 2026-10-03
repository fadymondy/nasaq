// The Blade ws-status example (packages/php/examples/rendered/ws-status.html) under real Alpine.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms));

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
});

async function mount() {
  const host = document.createElement("div");
  host.innerHTML = rendered("ws-status");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

const roots = (host: HTMLElement) => [...host.querySelectorAll<HTMLElement>('[data-slot="ws-status"]')];
const shown = (el: HTMLElement) => [...el.querySelectorAll<HTMLElement>('[role="status"] > span')].filter((s) => s.style.display !== "none").map((s) => s.textContent);

describe("ws-status (Blade example)", () => {
  it("renders the four examples with their state", async () => {
    const host = await mount();
    const [badge, connecting, inline, banner] = roots(host);
    expect(badge!.dataset.variant).toBe("badge");
    expect(shown(badge!)).toEqual(["Live"]);
    expect(shown(connecting!)).toEqual(["Connecting"]);
    expect(inline!.dataset.variant).toBe("inline");
    expect(banner!.dataset.variant).toBe("banner");
    expect(badge!.querySelector('[data-slot="ws-latency"] bdi')!.textContent).toBe("42 ms");
    expect(badge!.querySelector("button")).toBeNull();
  });

  it("follows nq-ws-status events and shows Retry now when offline", async () => {
    const host = await mount();
    const [badge] = roots(host);
    badge!.dispatchEvent(new CustomEvent("nq-ws-status", { detail: { state: "offline" } }));
    await tick();
    expect(badge!.dataset.state).toBe("offline");
    expect(shown(badge!)).toEqual(["Offline"]);
    expect((badge!.querySelector('[data-slot="ws-latency"]') as HTMLElement).style.display).toBe("none");
  });

  it("counts down while reconnecting and retry waits on the promise", async () => {
    const host = await mount();
    const [, , inline, banner] = roots(host);
    expect(banner!.querySelector<HTMLElement>('[data-slot="ws-countdown"]')!.textContent).toBe("");
    banner!.dispatchEvent(new CustomEvent("nq-ws-status", { detail: { retryAt: Date.now() + 7000 } }));
    await tick();
    expect(banner!.querySelector('[data-slot="ws-countdown"]')!.textContent).toMatch(/^Retrying in 0:0[67]$/);
    expect(banner!.textContent).toContain("Attempt 2");

    let release!: () => void;
    inline!.addEventListener("retry", (e) => (e as CustomEvent).detail.wait(new Promise<void>((r) => (release = r))));
    const button = inline!.querySelector<HTMLButtonElement>("button")!;
    expect(button.style.display).not.toBe("none");
    button.click();
    await tick();
    expect(button.getAttribute("aria-busy")).toBe("true");
    release();
    await tick();
    expect(button.getAttribute("aria-busy")).toBeNull();
  });
});
