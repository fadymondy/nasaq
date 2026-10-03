// The Blade desktop-os-shell example under real Alpine (nqDesktopShell).
import { describe, expect, it } from "vitest";
import { mount, setup, tick } from "./_float-setup";

setup();

const dock = (id: string) => document.querySelector<HTMLElement>(`[data-dock-app][data-app="${id}"]`)!;
const wins = () => [...document.querySelectorAll<HTMLElement>('[data-slot="desktop-window"]')];
const launchpad = () => document.querySelector<HTMLElement>('[data-slot="desktop-launchpad"]')!;

describe("desktop-os-shell (Blade example)", () => {
  it("lists pinned apps in the dock and opens a window from an icon", async () => {
    await mount("desktop-os-shell");
    expect(document.querySelectorAll("[data-dock-app]").length).toBe(2);
    expect(wins().length).toBe(0);
    dock("files").click();
    await tick();
    expect(wins().length).toBe(1);
    expect(wins()[0]!.getAttribute("aria-label")).toBe("Files");
    expect(wins()[0]!.hasAttribute("data-focused")).toBe(true);
    expect(wins()[0]!.textContent).toContain("Your files");
    expect(dock("files").hasAttribute("data-running")).toBe(true);
  });

  it("a single-window app is focused, not duplicated, and minimises from its own icon", async () => {
    await mount("desktop-os-shell");
    dock("files").click();
    await tick();
    dock("files").click();
    await tick();
    expect(wins().length).toBe(1);
    expect(wins()[0]!.hidden).toBe(true);
    dock("files").click();
    await tick();
    expect(wins()[0]!.hidden).toBe(false);
  });

  it("maximises and restores, and closes", async () => {
    await mount("desktop-os-shell");
    let count = -1;
    document.addEventListener("nq-windows-change", (e) => (count = (e as CustomEvent).detail.windows.length));
    dock("notes").click();
    await tick();
    const win = () => wins()[0]!;
    win().querySelector<HTMLElement>('[data-action="maximise"]')!.click();
    await tick();
    expect(win().hasAttribute("data-maximised")).toBe(true);
    win().querySelector<HTMLElement>('[data-action="maximise"]')!.click();
    await tick();
    expect(win().hasAttribute("data-maximised")).toBe(false);
    win().querySelector<HTMLElement>('[data-action="close"]')!.click();
    await tick();
    expect(wins().length).toBe(0);
    expect(count).toBe(0);
  });

  it("the launchpad filters apps and opens the match with Enter", async () => {
    await mount("desktop-os-shell");
    expect(launchpad().style.display).toBe("none");
    document.querySelector<HTMLElement>('[data-action="launchpad"]')!.click();
    await tick();
    expect(launchpad().style.display).not.toBe("none");
    expect(document.querySelectorAll("[data-launchpad-app]").length).toBe(3);
    const input = launchpad().querySelector<HTMLInputElement>("input")!;
    input.value = "mail";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await tick();
    expect(document.querySelectorAll("[data-launchpad-app]").length).toBe(1);
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await tick();
    expect(launchpad().style.display).toBe("none");
    expect(wins()[0]!.getAttribute("aria-label")).toBe("Mail");
    expect(dock("mail")).toBeTruthy();
  });

  it("renders the menu bar menus and fires nq-desktop-menu", async () => {
    await mount("desktop-os-shell");
    const triggers = [...document.querySelectorAll<HTMLElement>('[data-slot="menubar-trigger"]')];
    expect(triggers.map((t) => t.textContent)).toEqual(["System", "File"]);
    let id = "";
    document.addEventListener("nq-desktop-menu", (e) => (id = (e as CustomEvent).detail.id));
    triggers[1]!.click();
    await tick();
    document.querySelector<HTMLElement>('[data-id="file.new"]')!.click();
    await tick();
    expect(id).toBe("file.new");
  });

  it("the system power menu lists its actions and asks before Shut Down, firing only on Confirm", async () => {
    await mount("desktop-os-shell");
    const events: string[] = [];
    const listener = (e: Event) => events.push((e as CustomEvent).detail.id);
    document.addEventListener("nq-desktop-menu", listener);
    document.querySelector<HTMLElement>('[data-slot="menubar-trigger"]')!.click();
    await tick();
    const ids = [...document.querySelectorAll<HTMLElement>('[data-id^="system."]')].map((i) => i.dataset.id);
    expect(ids).toEqual(["system.about", "system.settings", "system.sleep", "system.restart", "system.shutDown", "system.logOut"]);
    expect(document.querySelector('[data-id="system.about"]')!.textContent).toContain("About Nasaq");
    expect(document.querySelector('[data-id="system.sleep"]')!.hasAttribute("data-confirm")).toBe(false);
    // Sleep never asks.
    document.querySelector<HTMLElement>('[data-id="system.sleep"]')!.click();
    await tick();
    expect(events).toEqual(["system.sleep"]);
    // Shut Down asks first; Cancel stops it.
    const dialog = () => document.querySelector<HTMLElement>('[data-slot="confirm-dialog"]')!;
    const choose = (label: string) =>
      [...dialog().querySelectorAll<HTMLElement>("button")].find((b) => b.textContent!.trim() === label && b.style.display !== "none")!.click();
    document.querySelector<HTMLElement>('[data-slot="menubar-trigger"]')!.click();
    await tick();
    document.querySelector<HTMLElement>('[data-id="system.shutDown"]')!.click();
    await tick();
    expect(dialog().hasAttribute("data-open")).toBe(true);
    expect(dialog().querySelector('[data-slot="alert-dialog-title"]')!.textContent).toBe("Shut down now?");
    choose("Cancel");
    await tick();
    expect(events).toEqual(["system.sleep"]);
    // Confirm lets it through.
    document.querySelector<HTMLElement>('[data-slot="menubar-trigger"]')!.click();
    await tick();
    document.querySelector<HTMLElement>('[data-id="system.shutDown"]')!.click();
    await tick();
    choose("Shut Down");
    await tick();
    expect(events).toEqual(["system.sleep", "system.shutDown"]);
    document.removeEventListener("nq-desktop-menu", listener);
  });
});
