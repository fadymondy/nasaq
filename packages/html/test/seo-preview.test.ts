// The Blade example (php/examples/seo-preview.blade.php) mounted under real Alpine: previews, device switch, length meters and live editing.
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

describe("seo-preview (Blade example)", () => {
  it("renders the Google result from the meta, with the host as the breadcrumb", async () => {
    const host = await mountHtml(rendered("seo-preview"));
    const google = host.querySelector<HTMLElement>('[data-slot="seo-google"]')!;
    expect(google.getAttribute("data-device")).toBe("desktop");
    expect(google.textContent).toContain("Nasaq");
    expect(google.textContent).toContain("nasaq.dev");
    expect(google.textContent).toContain("rtl design systems");
    expect(google.textContent).toContain("A practical guide");
  });

  it("switches to the mobile layout", async () => {
    const host = await mountHtml(rendered("seo-preview"));
    host.querySelectorAll<HTMLElement>('[data-slot="toggle"]')[1]!.click();
    await tick();
    expect(host.querySelector('[data-slot="seo-google"]')!.getAttribute("data-device")).toBe("mobile");
  });

  it("measures the title and description and updates while editing", async () => {
    const host = await mountHtml(rendered("seo-preview"));
    const meters = host.querySelectorAll<HTMLElement>('[data-slot="length-meter"]');
    expect(meters[0]!.getAttribute("data-status")).toBe("good");
    const input = host.querySelector<HTMLInputElement>('input[data-slot="input"]')!;
    let changed: { title: string } | undefined;
    host.addEventListener("nq-seo-preview-change", (e) => (changed = (e as CustomEvent).detail));
    input.value = "x".repeat(80);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await tick();
    expect(meters[0]!.getAttribute("data-status")).toBe("long");
    expect(meters[0]!.textContent).toContain("20 characters too long");
    expect(changed?.title).toHaveLength(80);
    expect(host.querySelector('[data-slot="seo-google"]')!.textContent).toContain("…");
  });

  it("shows the share cards on their tabs", async () => {
    const host = await mountHtml(rendered("seo-preview"));
    host.querySelectorAll<HTMLElement>('[data-slot="tabs-tab"]')[1]!.click();
    await tick();
    const og = host.querySelector<HTMLElement>('[data-slot="seo-open-graph"]')!;
    expect(og.closest<HTMLElement>('[data-slot="tabs-panel"]')!.hidden).toBe(false);
    expect(og.textContent).toContain("nasaq.dev");
  });
});
