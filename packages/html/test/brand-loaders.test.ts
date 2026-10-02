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

describe("brand-loaders (Blade example)", () => {
  it("the braille loader advances its frame", async () => {
    const host = await mount(rendered("brand-loaders"));
    const glyph = host.querySelector<HTMLElement>('[data-slot="braille-loader"] [dir="ltr"]')!;
    expect(glyph.textContent).toBe("⠋");
    await tick(200);
    expect(glyph.textContent).not.toBe("⠋");
  });

  it("the determinate dot matrix keeps its fill, an x-model value repaints it", async () => {
    const host = await mount(rendered("brand-loaders"));
    const bar = host.querySelector<HTMLElement>('[data-slot="dot-matrix-fill"]')!;
    expect(bar.getAttribute("aria-valuenow")).toBe("62");
    expect(bar.querySelectorAll("[data-dot]").length).toBe(120);

    const wrap = await mount(`<div x-data="{ pct: 0 }"><div data-slot="dot-matrix-fill" role="progressbar" x-data="nqDotMatrixFill(4, 1, 0)" x-modelable="value" x-model="pct">${"<span><span data-dot class=\"bg-border\"></span></span>".repeat(4)}</div><button x-on:click="pct = 100">go</button></div>`);
    const dots = [...wrap.querySelectorAll<HTMLElement>("[data-dot]")];
    expect(dots.every((d) => d.classList.contains("bg-border"))).toBe(true);
    wrap.querySelector("button")!.click();
    await tick();
    expect(dots.every((d) => d.classList.contains("bg-primary"))).toBe(true);
    expect(wrap.querySelector('[role="progressbar"]')!.getAttribute("aria-valuenow")).toBe("100");
  });

  it("the indeterminate matrix sweeps", async () => {
    const wrap = await mount(`<div role="progressbar" x-data="nqDotMatrixFill(6, 1, null)">${"<span><span data-dot class=\"bg-border\"></span></span>".repeat(6)}</div>`);
    expect(wrap.querySelector('[role="progressbar"]')!.hasAttribute("aria-valuenow")).toBe(false);
    await tick(250);
    expect(wrap.querySelectorAll(".bg-primary").length).toBeGreaterThan(0);
  });

  it("the boot splash shows the slow line after the delay and fires nq:retry", async () => {
    const wrap = await mount(`<div data-slot="boot-splash" x-data="nqBootSplash(60)"><p x-show="slow" style="display: none">slow</p><button x-on:click="retry()">retry</button></div>`);
    const slow = wrap.querySelector<HTMLElement>("p")!;
    expect(slow.style.display).toBe("none");
    await tick(120);
    expect(slow.style.display).toBe("");

    const host = await mount(rendered("brand-loaders"));
    const failed = host.querySelector<HTMLElement>('[data-slot="boot-splash"][data-state="failed"]')!;
    let fired = 0;
    failed.addEventListener("nq:retry", () => fired++);
    [...failed.querySelectorAll("button")].find((b) => b.textContent!.includes("Try again"))!.click();
    expect(fired).toBe(1);
    expect(failed.querySelector("code")!.textContent).toBe("req_8f2a91");
    const loading = host.querySelector<HTMLElement>('[data-slot="boot-splash"][data-state="loading"]')!;
    expect(loading.getAttribute("aria-busy")).toBe("true");
    expect(loading.textContent).toMatch(/40\s*%/);
  });
});
