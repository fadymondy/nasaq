// The Blade example (php/examples/chrome-extension-install.blade.php) mounted under real Alpine: step states, pin, check and sign-in events.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";

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
});

async function mountHtml(html: string) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

const states = (host: HTMLElement) => [...host.querySelectorAll<HTMLElement>('[data-slot="extension-step"]')].map((s) => s.dataset.state);
const button = (host: HTMLElement, text: string) => [...host.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.trim() === text)!;

describe("chrome-extension-install (Blade example)", () => {
  it("starts missing: step 1 current, aria-current set, store link present", async () => {
    const host = await mountHtml(rendered("chrome-extension-install"));
    const root = host.querySelector<HTMLElement>('[data-slot="chrome-extension-install"]')!;
    expect(root.dataset.state).toBe("missing");
    expect(states(host)).toEqual(["current", "todo", "todo"]);
    expect(host.querySelector('[data-slot="extension-step"]')!.getAttribute("aria-current")).toBe("step");
    expect(host.querySelector('[data-slot="extension-store-link"]')!.getAttribute("href")).toContain("chromewebstore");
  });

  it("check resolves installed, then the person pins and signs in", async () => {
    const host = await mountHtml(rendered("chrome-extension-install"));
    const root = host.querySelector<HTMLElement>('[data-slot="chrome-extension-install"]')!;
    root.addEventListener("nq-extension-check", (e) => (e as CustomEvent).detail.wait(Promise.resolve({ installed: true, version: "2.0.1" })));
    button(host, "Check again").click();
    await tick();
    expect(root.dataset.state).toBe("installed");
    expect(host.querySelector('[data-slot="extension-detected"]')!.textContent).toContain("version 2.0.1");
    expect(states(host)).toEqual(["done", "current", "todo"]);

    const pinned: boolean[] = [];
    root.addEventListener("nq-extension-pinned", (e) => pinned.push((e as CustomEvent).detail.pinned));
    button(host, "I pinned it").click();
    await tick();
    expect(pinned).toEqual([true]);
    expect(states(host)).toEqual(["done", "done", "current"]);

    root.addEventListener("nq-extension-signin", (e) => (e as CustomEvent).detail.wait(Promise.resolve({ error: "Nope" })));
    button(host, "Sign in").click();
    await tick();
    expect(host.querySelector('[role="alert"]')!.textContent).toBe("Nope");
  });

  it("signing in with signedIn true finishes the flow", async () => {
    const host = await mountHtml(rendered("chrome-extension-install"));
    const root = host.querySelector<HTMLElement>('[data-slot="chrome-extension-install"]')!;
    root.addEventListener("nq-extension-check", (e) => (e as CustomEvent).detail.wait(Promise.resolve({ installed: true })));
    root.addEventListener("nq-extension-signin", (e) => (e as CustomEvent).detail.wait(Promise.resolve({ signedIn: true })));
    button(host, "Check again").click();
    await tick();
    button(host, "I pinned it").click();
    await tick();
    button(host, "Sign in").click();
    await tick();
    expect(root.dataset.state).toBe("ready");
  });
});
