// The Blade page-actions example under real Alpine.
import { afterEach, describe, expect, it } from "vitest";
import { mount, setup, tick } from "./_float-setup";

setup();
afterEach(() => {
  document.body.innerHTML = "";
});

describe("page-actions (Blade example)", () => {
  it("shows the primary action and a more menu, and dispatches the action event", async () => {
    await mount("page-actions");
    expect(document.querySelector('[data-slot="page-actions"]')).not.toBeNull();
    const heard: string[] = [];
    window.addEventListener("issue-new", () => heard.push("new"));
    window.addEventListener("issues-export", () => heard.push("export"));
    const buttons = [...document.querySelectorAll<HTMLElement>('[data-slot="page-actions"] [data-slot="button"]')];
    const primary = buttons.find((b) => b.getAttribute("aria-label") === "New issue")!;
    expect(primary.getAttribute("aria-keyshortcuts")).toBe("C");
    primary.click();
    const more = document.querySelector<HTMLElement>('[data-slot="dropdown-menu-trigger"]')!;
    expect(more.getAttribute("aria-label")).toBe("More actions");
    more.click();
    await tick();
    const items = [...document.querySelectorAll<HTMLElement>('[data-slot="dropdown-menu-item"]')];
    expect(items).toHaveLength(2);
    expect(items[1]!.getAttribute("data-variant")).toBe("danger");
    expect(document.querySelectorAll('[data-slot="dropdown-menu-separator"]')).toHaveLength(1);
    items[0]!.click();
    await tick();
    expect(heard).toEqual(["new", "export"]);
  });
});
