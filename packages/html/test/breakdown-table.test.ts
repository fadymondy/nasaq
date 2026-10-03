// The Blade example (php/examples/breakdown-table.blade.php) mounted under real Alpine, plus the Show all markup <x-nq::breakdown-table> emits past its limit.
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

describe("breakdown-table (Blade example)", () => {
  it("sorts by value and shows the value, share and change", async () => {
    const host = await mountHtml(rendered("breakdown-table"));
    const root = host.querySelector<HTMLElement>('[data-slot="breakdown-table"]')!;
    expect(root.querySelector('[data-slot="table-container"]')!.getAttribute("aria-label")).toBe("Channels");
    expect([...root.querySelectorAll("tbody tr")].map((r) => r.getAttribute("data-row"))).toEqual(["organic", "direct"]);
    const first = root.querySelector("tbody tr")!;
    expect(first.textContent).toContain("Organic Search");
    expect(first.textContent).toContain("28,100");
    expect(first.textContent).toContain("67.7%");
    expect(first.textContent).toContain("+13.3%");
    expect(first.querySelector(".text-nq-success-text")).not.toBeNull();
    expect(root.querySelectorAll("tbody tr")[1]!.querySelector(".text-nq-danger-text")).not.toBeNull();
    expect(root.querySelector('[data-slot="breakdown-bar"] > span')!.getAttribute("style")).toContain("width: 100%");
    expect(root.querySelector('[data-slot="button"]')).toBeNull();
  });

  it("expands past the limit with Show all", async () => {
    const rows = Array.from({ length: 4 }, (_, i) => `<tr data-row="r${i}"${i >= 2 ? ` x-show="all" style="display: none"` : ""}><td>Row ${i}</td></tr>`).join("");
    const host = await mountHtml(`
      <div data-slot="breakdown-table" x-data="nqBreakdownTable">
        <table><tbody>${rows}</tbody></table>
        <button type="button" data-slot="button" x-on:click="all = ! all" x-bind:aria-expanded="String(all)"><span x-text="all ? 'Show fewer' : 'Show all 4'">Show all 4</span></button>
      </div>`);
    const visible = () => [...host.querySelectorAll<HTMLElement>("tbody tr")].filter((r) => r.style.display !== "none").length;
    const button = host.querySelector<HTMLElement>("button")!;
    expect(visible()).toBe(2);
    expect(button.textContent).toBe("Show all 4");
    button.click();
    await tick();
    expect(visible()).toBe(4);
    expect(button.textContent).toBe("Show fewer");
    expect(button.getAttribute("aria-expanded")).toBe("true");
    button.click();
    await tick();
    expect(visible()).toBe(2);
    expect(button.getAttribute("aria-expanded")).toBe("false");
  });
});
