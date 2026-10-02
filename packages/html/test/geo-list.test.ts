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
  it("lists countries by value with a flag and the localised name on a breakdown table", async () => {
    const host = await mountHtml(rendered("geo-list"));
    const root = host.querySelector<HTMLElement>('[data-slot="breakdown-table"]')!;
    expect(root.textContent).toContain("Countries");
    expect([...root.querySelectorAll("thead th")][0]!.textContent).toBe("Country");
    const rows = [...root.querySelectorAll("tbody tr")];
    expect(rows.map((r) => r.getAttribute("data-row"))).toEqual(["SA", "EG"]);
    expect(rows[0]!.textContent).toContain("🇸🇦 Saudi Arabia");
    expect(rows[0]!.textContent).toContain("12,400");
    expect(rows[0]!.textContent).toContain("+10.7%");
  });
});
