// page-header is static Blade: the rendered example has the title, trail and actions, no Alpine needed.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");

describe("page-header (Blade example)", () => {
  it("renders the trail, title, description and actions", () => {
    const host = document.createElement("div");
    host.innerHTML = rendered("page-header");
    expect(host.querySelector("h1[data-slot='page-header-title']")!.textContent).toBe("Customers");
    expect(host.querySelector('[data-slot="breadcrumb-page"]')!.getAttribute("aria-current")).toBe("page");
    expect(host.querySelectorAll('[data-slot="breadcrumb-link"]')).toHaveLength(1);
    expect(host.querySelector('[data-slot="page-header-description"]')).not.toBeNull();
    expect(host.querySelector('[data-slot="page-header-actions"] [data-slot="button"]')).not.toBeNull();
  });
});
