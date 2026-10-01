// The Blade example (php/examples/code-block.blade.php) mounted under real Alpine: search, pick, branch default.
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

describe("code-block (Blade example)", () => {
  it("renders plain lines on the server and colours them under Alpine", async () => {
    const html = rendered("code-block");
    expect(html).toContain('data-line="3"');
    const host = await mountHtml(html);
    const root = host.querySelector<HTMLElement>('[data-slot="code-block"]')!;
    expect(root.dir).toBe("ltr");
    expect(root.hasAttribute("data-highlighted")).toBe(true);
    expect(host.querySelector('[data-slot="code-block-header"]')!.textContent).toContain("greet.ts");
    expect(host.querySelector('[data-line="2"]')!.hasAttribute("data-highlighted")).toBe(true);
    expect(host.querySelector('[data-line="1"]')!.hasAttribute("data-highlighted")).toBe(false);
    const first = host.querySelector('[data-line="1"] [data-code-line]')!;
    const keyword = [...first.querySelectorAll<HTMLElement>("span")].find((s) => s.textContent === "export");
    expect(keyword!.style.color).toBe("var(--shiki-token-keyword)");
    expect(first.textContent).toBe("export const greet = (name: string) => `Hello, ${name}`;");
    expect(host.querySelector('[data-slot="inline-code"]')!.getAttribute("dir")).toBe("ltr");
  });
});
