// The Blade cookie-consent example (packages/php/examples/rendered/cookie-consent.html) under real Alpine.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = (ms = 40) => new Promise((r) => setTimeout(r, ms));

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
  document.body.innerHTML = "";
});

async function mount() {
  const host = document.createElement("div");
  host.innerHTML = rendered("cookie-consent");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host.querySelector<HTMLElement>('[data-slot="cookie-consent-root"]')!;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data = (el: Element): any => Alpine.$data(el as HTMLElement);
const listen = (root: Element, result?: unknown) => {
  const calls: { state: Record<string, boolean>; source: string }[] = [];
  root.addEventListener("save", (e) => {
    const d = (e as CustomEvent).detail;
    calls.push(d);
    d.wait(result instanceof Error ? Promise.reject(result) : Promise.resolve(result));
  });
  return calls;
};
const visible = (el: Element | null) => !!el && (el as HTMLElement).style.display !== "none";

describe("cookie-consent (Blade example)", () => {
  it("shows the banner with a policy link and the three choices", async () => {
    const root = await mount();
    const banner = root.querySelector<HTMLElement>('[data-slot="cookie-consent"]')!;
    expect(visible(banner)).toBe(true);
    expect(banner.textContent).toContain("Your privacy choices");
    expect(banner.querySelector('a[href="/cookies"]')!.textContent).toBe("Cookie policy");
    expect(banner.querySelectorAll('[data-slot="cookie-consent-actions"] button')).toHaveLength(3);
  });

  it("accepts all and hides the banner", async () => {
    const root = await mount();
    const calls = listen(root);
    await data(root).accept();
    await tick();
    expect(calls[0]).toMatchObject({ source: "accept-all", state: { necessary: true, preferences: true, analytics: true, marketing: true } });
    expect(visible(root.querySelector('[data-slot="cookie-consent"]'))).toBe(false);
  });

  it("rejects all, keeping only the required category", async () => {
    const root = await mount();
    const calls = listen(root);
    await data(root).reject();
    expect(calls[0]).toMatchObject({ source: "reject-all", state: { necessary: true, preferences: false, analytics: false, marketing: false } });
  });

  it("opens the preferences and saves a custom choice from the switches", async () => {
    const root = await mount();
    const d = data(root);
    d.openPrefs();
    await tick();
    expect(d.prefs).toBe(true);
    const rows = document.body.querySelectorAll('[data-slot="cookie-category"]');
    expect(rows).toHaveLength(4);
    expect(rows[0]!.textContent).toContain("Always on");
    expect(rows[0]!.querySelector("button[role=switch]")!.hasAttribute("disabled")).toBe(true);
    expect(rows[2]!.textContent).toContain("Show cookies (1)");
    expect(rows[2]!.textContent).toContain("_ga");
    (rows[2]!.querySelector("button[role=switch]") as HTMLElement).click();
    await tick();
    expect(d.draft).toEqual({ necessary: true, preferences: false, analytics: true, marketing: false });
    const calls = listen(root);
    await d.saveDraft();
    expect(calls[0]).toMatchObject({ source: "custom", state: { analytics: true, marketing: false } });
    expect(d.prefs).toBe(false);
  });

  it("opens from a Cookie settings event", async () => {
    const root = await mount();
    window.dispatchEvent(new Event("nq-cookie-settings"));
    expect(data(root).prefs).toBe(true);
  });

  it("shows a server error and keeps the banner, then the generic one with no listener", async () => {
    const root = await mount();
    const d = data(root);
    listen(root, { error: "Offline" });
    await d.accept();
    expect(d.error).toBe("Offline");
    expect(d.saved).toBeNull();
    const fresh = await mount();
    const f = data(fresh);
    await f.accept();
    expect(f.error).toBe("Your choices could not be saved. Try again.");
    expect(f.saved).toBeNull();
    expect(f.pending).toBeNull();
  });

  it("blocks the other buttons while one choice is pending", async () => {
    const root = await mount();
    const d = data(root);
    d.pending = "accept-all";
    expect(d.blocked("reject-all")).toBe(true);
    expect(d.blocked("accept-all")).toBe(false);
    expect(d.busy).toBe(true);
  });
});
