import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");

describe("button (Blade example)", () => {
  it("the pill shape is fully rounded with the React padding and a data-shape hook", () => {
    const host = document.createElement("div");
    host.innerHTML = rendered("button");
    const buttons = [...host.querySelectorAll<HTMLElement>('[data-slot="button"]')];
    const pill = buttons.find((b) => b.getAttribute("data-shape") === "pill")!;
    expect(pill.textContent?.trim()).toBe("Track order");
    expect(pill.className).toContain("rounded-full");
    expect(pill.className).toContain("px-5");
    expect(pill.className).not.toContain("rounded-control");
    expect(pill.className).not.toContain("px-[var(--nq-control-pad)]");
    // The default shape keeps the control radius and no hook.
    const plain = buttons.find((b) => b.textContent?.trim() === "Save changes")!;
    expect(plain.className).toContain("rounded-control");
    expect(plain.hasAttribute("data-shape")).toBe(false);
  });
});
