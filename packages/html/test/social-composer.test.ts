// The Blade social-composer example (packages/php/examples/rendered/social-composer.html) under real Alpine.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = () => new Promise((r) => setTimeout(r, 40));

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
  host.innerHTML = rendered("social-composer");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

const root = (h: HTMLElement) => h.querySelector<HTMLElement>('[data-slot="social-composer"]')!;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data = (h: HTMLElement) => Alpine.$data(root(h)) as any;
const targets = (h: HTMLElement) => [...h.querySelectorAll<HTMLElement>('[data-slot="social-target"]')];
const press = (h: HTMLElement, text: string) => [...h.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.trim() === text)!;

describe("social-composer (Alpine)", () => {
  it("renders a target per platform with its counter and flags missing media", async () => {
    const h = await mount();
    const t = targets(h);
    expect(t.map((x) => x.getAttribute("data-platform"))).toEqual(["x", "instagram"]);
    expect(t[0]!.textContent).toContain("17 of 280");
    expect(t[1]!.textContent).toContain("Needs an image.");
    expect(t[0]!.getAttribute("data-level")).toBe("ok");
  });

  it("toggles an account and keeps aria-pressed in step", async () => {
    const h = await mount();
    const buttons = [...root(h).querySelectorAll<HTMLButtonElement>("fieldset button")].slice(0, 2);
    expect(buttons.map((b) => b.getAttribute("aria-pressed"))).toEqual(["true", "true"]);
    buttons[1]!.click();
    await tick();
    expect(buttons[1]!.getAttribute("aria-pressed")).toBe("false");
    expect(targets(h)).toHaveLength(1);
  });

  it("blocks Publish until every target passes, then fires nq-social-submit", async () => {
    const h = await mount();
    const publish = [...h.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.includes("Publish now"))!;
    expect(publish.disabled).toBe(true);
    data(h).toggleAccount("ig1");
    await tick();
    expect(publish.disabled).toBe(false);
    let detail: { post: { body: string } } | null = null;
    root(h).addEventListener("nq-social-submit", (e) => (detail = (e as CustomEvent).detail));
    publish.click();
    await tick();
    expect(detail!.post.body).toBe("Nasaq 1.0 is out.");
  });

  it("writes a custom version for one platform", async () => {
    const h = await mount();
    const link = press(h, "Write a version for this platform");
    link.click();
    await tick();
    const area = targets(h)[0]!.querySelector<HTMLTextAreaElement>("textarea")!;
    expect(area.value).toBe("Nasaq 1.0 is out.");
    area.value = "Short X version";
    area.dispatchEvent(new Event("input", { bubbles: true }));
    await tick();
    expect(data(h).variants.x).toBe("Short X version");
    expect(targets(h)[0]!.textContent).toContain("15 of 280");
    expect(targets(h)[0]!.textContent).toContain("Custom");
  });

  it("adds media from the attach event", async () => {
    const h = await mount();
    root(h).addEventListener("nq-social-attach", (e) => {
      (e as CustomEvent).detail.promise = Promise.resolve({ id: "m1", kind: "image", name: "cover.png" });
    });
    press(h, "Add image").click();
    await tick();
    expect(root(h).textContent).toContain("cover.png");
    expect(targets(h)[1]!.textContent).not.toContain("Needs an image.");
  });

  it("the metrics table shows totals and rows", async () => {
    const h = await mount();
    const m = h.querySelector('[data-slot="social-metrics"]')!;
    expect(m.textContent).toContain("Published posts");
    expect(m.querySelectorAll('[data-slot="table-row"][data-row]').length).toBe(2);
    expect(m.textContent).toContain("12,400");
  });
});
