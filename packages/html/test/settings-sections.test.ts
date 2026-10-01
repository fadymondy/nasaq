// The Blade settings-sections example under real Alpine.
import { describe, expect, it } from "vitest";
import { mount, setup, tick } from "./_float-setup";

setup();
const nav = (host: HTMLElement) => [...host.querySelectorAll<HTMLElement>("nav button")];
const bar = (host: HTMLElement) => host.querySelector<HTMLElement>('[data-slot="settings-save-bar"]')!;
const search = (host: HTMLElement) => host.querySelector<HTMLInputElement>('input[type="search"]')!;
const section = (host: HTMLElement, id: string) => host.querySelector<HTMLElement>(`[data-section="${id}"]`)!;

describe("settings-sections (Blade example)", () => {
  it("renders the grouped nav with the first page active and the others hidden", async () => {
    const host = await mount("settings-sections");
    expect(host.querySelector("nav")!.getAttribute("aria-label")).toBe("Settings sections");
    const [notifications, security] = nav(host);
    expect(notifications!.getAttribute("aria-current")).toBe("page");
    expect(notifications!.getAttribute("data-active")).toBe("true");
    expect(security!.getAttribute("aria-current")).toBeNull();
    expect(security!.getAttribute("data-active")).toBe("false");
    expect(section(host, "notifications").hidden).toBe(false);
    expect(section(host, "security").hidden).toBe(true);
    expect(section(host, "notifications").getAttribute("role")).toBe("region");
    expect(notifications!.getAttribute("aria-controls")).toBe(section(host, "notifications").id);
  });

  it("switches page from the nav", async () => {
    const host = await mount("settings-sections");
    const [notifications, security] = nav(host);
    security!.click();
    await tick();
    expect(section(host, "security").hidden).toBe(false);
    expect(section(host, "notifications").hidden).toBe(true);
    expect(security!.getAttribute("aria-current")).toBe("page");
    expect(notifications!.getAttribute("aria-current")).toBeNull();
  });

  it("searches single settings, jumps to the hit and clears", async () => {
    const host = await mount("settings-sections");
    const results = host.querySelector<HTMLElement>('[data-slot="settings-sections-results"]')!;
    expect(results.style.display).toBe("none");
    nav(host)[1]!.click();
    await tick();
    const input = search(host);
    input.value = "email";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await tick();
    expect(results.style.display).not.toBe("none");
    expect(results.querySelector('[role="status"]')!.textContent).toBe("1 result");
    const hit = results.querySelector<HTMLButtonElement>("ul button")!;
    expect(hit.textContent).toContain("Email digest");
    expect(hit.textContent).toContain("General › Notifications");
    hit.click();
    await tick(80);
    expect(section(host, "notifications").hidden).toBe(false);
    expect(search(host).value).toBe("");
    expect(host.querySelector('[data-setting-id="email"]')!.getAttribute("data-highlight")).toBe("true");
  });

  it("reports no match", async () => {
    const host = await mount("settings-sections");
    const input = search(host);
    input.value = "zzz";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await tick();
    expect(host.querySelector('[data-slot="settings-sections-results"] [role="status"]')!.textContent).toBe("No settings match");
  });

  it("shows the save bar while a change is unsaved, saves it and discards", async () => {
    const host = await mount("settings-sections");
    expect(bar(host).hidden).toBe(true);
    const toggle = host.querySelector<HTMLElement>('[data-slot="switch"]')!;
    toggle.click();
    await tick();
    expect(bar(host).hidden).toBe(false);
    expect(bar(host).getAttribute("data-state")).toBe("idle");
    expect(bar(host).textContent).toContain("1 unsaved change");

    const [discard, save] = [...bar(host).querySelectorAll<HTMLButtonElement>("button")];
    save!.click();
    await tick(10);
    expect(bar(host).getAttribute("data-state")).toBe("saving");
    expect(save!.getAttribute("aria-busy")).toBe("true");
    await tick(400);
    expect(bar(host).getAttribute("data-state")).toBe("saved");
    expect(bar(host).textContent).toContain("All changes saved");

    toggle.click();
    await tick();
    expect(bar(host).getAttribute("data-state")).toBe("idle");
    expect(bar(host).hidden).toBe(false);
    discard!.click();
    await tick();
    expect(bar(host).hidden).toBe(true);
    expect(toggle.getAttribute("aria-checked")).toBe("true");
  });
});
