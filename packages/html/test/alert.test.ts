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

describe("alert (Blade example)", () => {
  it("renders the React markup and dismisses the dismissible one", async () => {
    const host = await mount(rendered("alert"));
    const [danger, info] = [...host.querySelectorAll<HTMLElement>('[data-slot="alert"]')] as [HTMLElement, HTMLElement];
    expect(danger.getAttribute("role")).toBe("alert");
    expect(danger.getAttribute("data-tone")).toBe("danger");
    expect(danger.className).toContain("bg-nq-danger-soft");
    expect(info.getAttribute("role")).toBe("status");
    expect(info.style.display).toBe("");

    let dismissed = 0;
    host.addEventListener("nq:dismiss", () => dismissed++);
    info.querySelector<HTMLButtonElement>('[aria-label="Dismiss"]')!.click();
    await tick();
    expect(info.style.display).toBe("none");
    expect(dismissed).toBe(1);
    expect(danger.style.display).toBe("");
  });
});
