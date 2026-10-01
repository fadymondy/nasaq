// The Blade auth-layout example (packages/php/examples/rendered/auth-layout.html) under real Alpine.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = (ms = 40) => new Promise((r) => setTimeout(r, ms));

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
  document.body.innerHTML = "";
});

async function mount() {
  const host = document.createElement("div");
  host.innerHTML = rendered("auth-layout");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

const slot = (name: string) => document.querySelector<HTMLElement>(`[data-slot="${name}"]`);

describe("auth-layout", () => {
  it("renders the page frame with the emblem, heading, prompt and footer", async () => {
    await mount();
    expect(slot("auth-layout")?.getAttribute("data-variant")).toBe("card");
    expect(slot("auth-layout-title")?.tagName).toBe("H1");
    expect(slot("auth-layout-title")?.textContent).toBe("Sign in");
    expect(document.querySelectorAll("[data-emblem-cell]")).toHaveLength(18 + 24 + 30 + 36);
    expect(slot("auth-layout-prompt")?.querySelector("a")?.getAttribute("href")).toBe("/sign-up");
    expect(slot("auth-footer")?.querySelectorAll("a")).toHaveLength(2);
  });

  it("fills in the origin host from the page", async () => {
    await mount();
    const origin = slot("auth-origin")!;
    expect(origin.style.display).not.toBe("none");
    expect(origin.querySelector("bdi")?.textContent).toBe(window.location.host);
    expect(origin.hasAttribute("data-secure")).toBe(Boolean(window.isSecureContext));
  });

  it("lights the backdrop under a moving pointer and clears it on leave", async () => {
    await mount();
    const backdrop = slot("auth-backdrop")!;
    window.dispatchEvent(new MouseEvent("pointermove", { clientX: 30, clientY: 40 }));
    await tick(60);
    expect(backdrop.hasAttribute("data-pointer")).toBe(true);
    expect(backdrop.style.getPropertyValue("--nq-auth-x")).toMatch(/px$/);
    document.documentElement.dispatchEvent(new Event("pointerleave"));
    expect(backdrop.hasAttribute("data-pointer")).toBe(false);
  });
});
