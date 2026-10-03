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

async function mount(html: string) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

describe("avatar (Blade example)", () => {
  it("renders the React markup: image hidden, fallback aria-hidden while the image loads", async () => {
    const host = await mount(rendered("avatar"));
    const root = host.querySelector<HTMLElement>('[data-slot="avatar"]')!;
    expect(root.className).toContain("rounded-full");
    const img = root.querySelector<HTMLImageElement>('[data-slot="avatar-image"]')!;
    expect(img.getAttribute("alt")).toBe("نور عادل");
    expect(img.style.display).toBe("none");
    const fb = root.querySelector<HTMLElement>('[data-slot="avatar-fallback"]')!;
    expect(fb.getAttribute("aria-hidden")).toBe("true");
    expect(fb.textContent?.trim()).toBe("نع");
  });

  it("holds the fallback back for the delay, then shows it while the image has not loaded", async () => {
    const host = await mount(rendered("avatar"));
    const fb = host.querySelector<HTMLElement>('[data-slot="avatar-fallback"]')!;
    expect(fb.style.display).toBe("none");
    await tick(450);
    expect(fb.style.display).toBe("");
  });

  it("shows the image and hides the fallback once the image loads, and swaps back on error", async () => {
    const host = await mount(rendered("avatar"));
    const img = host.querySelector<HTMLImageElement>('[data-slot="avatar-image"]')!;
    const fb = host.querySelector<HTMLElement>('[data-slot="avatar-fallback"]')!;
    await tick(450);
    img.dispatchEvent(new Event("load"));
    await tick();
    expect(img.style.display).toBe("");
    expect(fb.style.display).toBe("none");
    img.dispatchEvent(new Event("error"));
    await tick();
    expect(img.style.display).toBe("none");
    expect(fb.style.display).toBe("");
  });

  it("without a src the initials show at once, labelled by the name", async () => {
    const host = await mount(
      '<span data-slot="avatar" x-data="nqAvatar(0)"><span data-slot="avatar-fallback" x-bind="fallback" role="img" aria-label="Fady Mondy">FM</span></span>',
    );
    const fb = host.querySelector<HTMLElement>('[data-slot="avatar-fallback"]')!;
    expect(fb.style.display).toBe("");
    expect(fb.getAttribute("role")).toBe("img");
  });
});

describe("avatar initials (Blade example)", () => {
  it("skips leading punctuation: (Test) Driver is TD, not (D", async () => {
    const host = await mount(rendered("avatar"));
    const fbs = [...host.querySelectorAll<HTMLElement>('[data-slot="avatar-fallback"]')];
    const driver = fbs.find((f) => f.getAttribute("aria-label") === "(Test) Driver")!;
    expect(driver.textContent?.trim()).toBe("TD");
  });
});
