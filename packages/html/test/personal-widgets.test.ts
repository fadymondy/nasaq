// The Blade personal-widgets example (packages/php/examples/rendered/personal-widgets.html) under real Alpine.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = () => new Promise((r) => setTimeout(r, 40));

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

async function mount() {
  const host = document.createElement("div");
  host.innerHTML = rendered("personal-widgets");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

describe("personal widgets (Alpine)", () => {
  it("renders every widget with its data-slot and no leftover component tags", async () => {
    const h = await mount();
    for (const slot of ["availability-badge", "local-clock", "stats-widget", "weather-widget", "now-widget", "skills-widget", "social-links"]) {
      expect(h.querySelector(`[data-slot=${slot}]`), slot).not.toBeNull();
    }
    expect(h.innerHTML).not.toContain("x-nq");
    expect(h.querySelector("[data-slot=availability-badge]")!.getAttribute("data-status")).toBe("open");
  });

  it("local clock shows the owner's time, working state and offset", async () => {
    const h = await mount();
    const clock = h.querySelector("[data-slot=local-clock]")!;
    expect(clock.querySelector("time")!.textContent).toMatch(/12:00/);
    expect(clock.textContent).toContain("Working hours");
    expect(clock.textContent).toContain("3h ahead of you");
    expect(clock.querySelector("time")!.getAttribute("datetime")).toBe("2026-09-29T09:00:00.000Z");
  });

  it("social links open external links in a new tab only", async () => {
    const h = await mount();
    const [gh, mail] = [...h.querySelectorAll<HTMLAnchorElement>("[data-slot=social-links] a")];
    expect(gh!.target).toBe("_blank");
    expect(gh!.rel).toBe("noopener noreferrer");
    expect(mail!.getAttribute("target")).toBeNull();
    expect(gh!.querySelector("svg")).not.toBeNull();
  });

  it("skills show the level in text", async () => {
    const h = await mount();
    expect(h.querySelector("[data-slot=skills-widget] [role=img]")!.getAttribute("aria-label")).toBe("Level 5 of 5");
  });
});
