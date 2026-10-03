// The Blade example (php/examples/geo-list.blade.php) mounted under real Alpine.
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

describe("geo-list (Blade example)", () => {
  it("renders each country as a decorative flag span and the localised name", async () => {
    const host = await mountHtml(rendered("geo-list"));
    const labels = [...host.querySelectorAll("tbody span.inline-flex.items-center.gap-2, [role=row] span.inline-flex.items-center.gap-2")];
    expect(labels.map((l) => l.textContent)).toEqual(["🇸🇦Saudi Arabia", "🇪🇬Egypt"]);
    for (const label of labels) {
      const flag = label.firstElementChild!;
      expect(flag.getAttribute("aria-hidden")).toBe("true");
      expect(flag.className).toContain("text-base");
      expect(flag.className).toContain("leading-none");
    }
  });
});
