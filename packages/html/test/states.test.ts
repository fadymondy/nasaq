import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");

function load() {
  const host = document.createElement("div");
  host.innerHTML = rendered("states");
  return host;
}

describe("states loading shapes (Blade example)", () => {
  it("grid previews cards in two columns with a visible caption instead of the sr-only label", () => {
    const grid = load().querySelector<HTMLElement>('[data-slot="loading-state"][data-shape="grid"]')!;
    expect(grid.getAttribute("role")).toBe("status");
    expect(grid.querySelectorAll('[data-slot="loading-card"]')).toHaveLength(4);
    expect(grid.querySelector(".grid")!.className).toContain("sm:grid-cols-2");
    expect(grid.querySelector(".sr-only")).toBeNull();
    expect(grid.querySelector("p")!.textContent?.trim()).toBe("Fetching the last 30 days…");
  });

  it("timeline previews events joined by a rail, none after the last", () => {
    const tl = load().querySelector<HTMLElement>('[data-slot="loading-state"][data-shape="timeline"]')!;
    const events = tl.querySelectorAll('[data-slot="loading-event"]');
    expect(events).toHaveLength(3);
    expect(events[0]!.querySelector('span[aria-hidden="true"]')).not.toBeNull();
    expect(events[2]!.querySelector('span[aria-hidden="true"]')).toBeNull();
    expect(tl.querySelector(".sr-only")!.textContent?.trim()).toBe("Loading…");
  });
});
