// The Blade user-menu example under real Alpine: it reuses nqDropdownMenu, nqThemePref and nqLocalePref (no module of its own).
import { describe, expect, it } from "vitest";
import { mount, setup, tick } from "./_float-setup";

setup();

const trigger = () => document.querySelector<HTMLElement>('[data-slot="user-menu"]')!;
const popup = () => document.querySelector<HTMLElement>('[data-slot="dropdown-menu-content"]')!;

describe("user-menu (Blade example)", () => {
  it("shows the name and email and is closed to start", async () => {
    await mount("user-menu");
    expect(trigger().textContent).toContain("Fady Mondy");
    expect(trigger().textContent).toContain("hello@example.com");
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
    expect(popup().style.display).toBe("none");
  });

  it("opens with the account items, Theme, Language and Sign out", async () => {
    await mount("user-menu");
    trigger().click();
    await tick();
    expect(trigger().getAttribute("aria-expanded")).toBe("true");
    const text = popup().textContent ?? "";
    for (const word of ["Account", "Billing", "Theme", "Language", "Sign out"]) expect(text).toContain(word);
  });

  it("Sign out dispatches nq-sign-out and closes the menu", async () => {
    await mount("user-menu");
    let fired = 0;
    window.addEventListener("nq-sign-out", () => fired++, { once: true });
    trigger().click();
    await tick();
    popup().querySelector<HTMLElement>('[data-user-menu="sign-out"]')!.click();
    await tick();
    expect(fired).toBe(1);
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
  });
});
