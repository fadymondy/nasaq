// Live values: progress reads value-expr / x-model from Alpine and updates the server-rendered markup (the Blade example mounted under real Alpine).
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

describe("progress (live value)", () => {
  it("follows value-expr and x-model, and goes indeterminate on null", async () => {
    const host = await mountHtml(rendered("progress"));
    const live = host.querySelector<HTMLElement>("#live-progress")!;
    const model = host.querySelector<HTMLElement>("#model-progress")!;
    const bar = (el: HTMLElement) => el.querySelector<HTMLElement>('[data-slot="progress-indicator"]')!;
    expect(live.getAttribute("aria-valuenow")).toBe("30");
    expect(bar(live).style.width).toBe("30%");
    expect(live.hasAttribute("data-progressing")).toBe(true);

    host.querySelector<HTMLElement>("#live-more")!.click();
    await tick();
    for (const el of [live, model]) {
      expect(el.getAttribute("aria-valuenow")).toBe("65");
      expect(el.getAttribute("aria-valuetext")).toBe("65%");
      expect(bar(el).style.width).toBe("65%");
      expect(el.querySelector("[data-progress-value]")!.textContent).toBe("65%");
    }
    host.querySelector<HTMLElement>("#live-more")!.click();
    await tick();
    expect(live.hasAttribute("data-complete")).toBe(true);
    expect(live.hasAttribute("data-progressing")).toBe(false);
    expect(bar(live).hasAttribute("data-complete")).toBe(true);
    expect(bar(live).style.width).toBe("100%");

    host.querySelector<HTMLElement>("#live-wait")!.click();
    await tick();
    expect(live.hasAttribute("data-indeterminate")).toBe(true);
    expect(live.hasAttribute("aria-valuenow")).toBe(false);
    expect(live.getAttribute("aria-valuetext")).toBe("indeterminate progress");
    expect(bar(live).classList.contains("w-full")).toBe(true);
    expect(live.querySelector<HTMLElement>("[data-progress-value]")!.hidden).toBe(true);
  });
});
