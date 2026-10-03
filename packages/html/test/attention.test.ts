import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const attr = (el: Element, name: string) => [...el.attributes].find((a) => a.name === name)?.value ?? null; // happy-dom getAttribute is stale for server-rendered attributes Alpine rewrites
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

describe("attention (Blade example)", () => {
  it("shows max rows, expands with Show more and collapses again", async () => {
    const host = await mount(rendered("attention"));
    const rows = () => [...host.querySelectorAll<HTMLElement>('[data-slot="attention-item"]')];
    const visible = () => rows().filter((r) => r.style.display !== "none");
    expect(rows()).toHaveLength(4);
    expect(visible()).toHaveLength(2);
    expect(rows()[0]!.getAttribute("data-tone")).toBe("danger");
    const more = host.querySelector<HTMLButtonElement>("button[data-more]")!;
    expect(more.textContent!.trim()).toBe("Show 2 more");
    expect(attr(more, "aria-expanded")).toBe("false");
    more.click();
    await tick();
    expect(visible()).toHaveLength(4);
    expect(attr(more, "aria-expanded")).toBe("true");
    expect(more.textContent!.trim()).toBe("Show less");
    more.click();
    await tick();
    expect(visible()).toHaveLength(2);
  });

  it("dismisses a row, lowers the count, promotes the next row and fires nq:dismiss", async () => {
    const host = await mount(rendered("attention"));
    const ids: string[] = [];
    host.addEventListener("nq:dismiss", (e) => ids.push((e as CustomEvent).detail.id));
    const count = host.querySelector<HTMLElement>('[data-slot="attention-count"]')!;
    expect(count.textContent).toBe("4");
    host.querySelector<HTMLButtonElement>('[aria-label="Dismiss"]')!.click();
    await tick();
    expect(ids).toEqual(["deploy"]);
    expect(count.textContent).toBe("3");
    const rows = [...host.querySelectorAll<HTMLElement>('[data-slot="attention-item"]')];
    expect(rows).toHaveLength(3);
    expect(rows.filter((r) => r.style.display !== "none")).toHaveLength(2);
  });
});
