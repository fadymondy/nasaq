// The Blade icon-rail-sidebar example under real Alpine (nqIconRail).
import { describe, expect, it } from "vitest";
import { mount, setup, tick } from "./_float-setup";

setup();

const root = () => document.querySelector<HTMLElement>('[data-slot="icon-rail-sidebar"]')!;
const visible = (el: Element) => (el as HTMLElement).style.display !== "none";
const subs = () => [...root().querySelectorAll<HTMLElement>('[data-slot="icon-rail-sub"]')].filter((el) => !el.closest('[data-slot="sheet-portal"]'));
const rail = () => root().querySelector('[data-slot="icon-rail"]')!;
const buttons = () => [...rail().querySelectorAll<HTMLElement>("[data-rail-button]")];

describe("icon-rail-sidebar (Blade example)", () => {
  it("marks the owning section active, shows only its sub-sidebar and opens its parent", async () => {
    await mount("icon-rail-sidebar");
    expect(buttons().map((b) => b.getAttribute("aria-current"))).toEqual([null, "page", null]);
    expect(subs().filter(visible).map((s) => s.dataset.section)).toEqual(["people"]);
    const active = subs().find(visible)!.querySelector('[aria-current="page"]')!;
    expect(active.textContent).toContain("Roles");
    expect(root().querySelector('[data-slot="icon-rail-content"]')!.textContent).toContain("Page content");
  });

  it("picking another section swaps the sub-sidebar; picking the active one toggles it", async () => {
    await mount("icon-rail-sidebar");
    let changed = "";
    root().addEventListener("nq-section-change", (e) => (changed = (e as CustomEvent).detail.id));
    buttons()[0]!.click();
    await tick();
    expect(changed).toBe("home");
    expect(subs().filter(visible).map((s) => s.dataset.section)).toEqual(["home"]);
    buttons()[0]!.click();
    await tick();
    expect(subs().filter(visible)).toHaveLength(0);
    buttons()[0]!.click();
    await tick();
    expect(subs().filter(visible)).toHaveLength(1);
  });

  it("choosing a page moves the active mark and fires nq-select", async () => {
    await mount("icon-rail-sidebar");
    buttons()[0]!.click();
    await tick();
    let got: unknown = null;
    root().addEventListener("nq-select", (e) => (got = (e as CustomEvent).detail));
    const inbox = [...subs().find(visible)!.querySelectorAll<HTMLElement>('[data-slot="sidebar-item"]')].find((a) => a.textContent!.includes("Inbox"))!;
    inbox.click();
    await tick();
    expect(got).toEqual({ id: "inbox", sectionId: "home" });
    expect(inbox.getAttribute("aria-current")).toBe("page");
  });

  it("a section without a sub-sidebar is a plain link and ArrowDown moves between rail buttons", async () => {
    await mount("icon-rail-sidebar");
    expect(buttons()[2]!.getAttribute("href")).toBe("#help");
    expect(buttons()[2]!.hasAttribute("aria-controls")).toBe(false);
    buttons()[0]!.focus();
    buttons()[0]!.parentElement!.parentElement!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(buttons()[1]);
  });
});
