// Live items: timeline takes items from an Alpine expression (items-expr) and renders the same markup as the server items.
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

async function mountHtml(html: string) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

describe("timeline (items-expr)", () => {
  it("replaces the server items with the expression's and follows changes", async () => {
    const html = rendered("timeline");
    const host = await mountHtml(html);
    const list = host.querySelector<HTMLElement>("#live-timeline")!;
    const items = () => [...list.querySelectorAll<HTMLElement>(':scope > [data-slot="timeline-item"]')];
    expect(items()).toHaveLength(1);
    expect(items()[0]!.hasAttribute("data-nq-dynamic")).toBe(true);
    expect(items()[0]!.querySelector("p")!.textContent).toBe("Order placed");
    expect(items()[0]!.querySelector("time")!.getAttribute("datetime")).toBe("2026-09-27T09:00:00.000Z");
    expect(items()[0]!.querySelector('[data-slot="timeline-marker"] > span')!.getAttribute("aria-hidden")).toBe("true");

    host.querySelector<HTMLElement>("#live-add")!.click();
    await tick();
    expect(items().map((li) => li.querySelector("p")!.textContent)).toEqual(["Packed", "Order placed"]);
    const first = items()[0]!;
    expect(first.querySelector('[data-slot="avatar-fallback"]')!.textContent).toBe("KN");
    expect(first.querySelectorAll("p")[1]!.textContent).toBe("Box 2 of 2");
    expect(first.querySelector('[data-slot="timeline-rail"]')!.className).toContain("group-last/timeline:hidden");
  });
});
