// The Blade version-history example under real Alpine.
import { describe, expect, it } from "vitest";
import { mount, setup, tick } from "./_float-setup";

setup();
const dialogs = () => [...document.querySelectorAll<HTMLElement>('[role="alertdialog"]')].filter((d) => !d.hasAttribute("hidden") && d.style.display !== "none");
const row = (host: HTMLElement, n: number) => host.querySelector<HTMLButtonElement>(`[data-version-row="${n}"] button`)!;

describe("version-history (Blade example)", () => {
  it("lists versions newest first, current marked, nothing selected", async () => {
    const host = await mount("version-history");
    const rows = [...host.querySelectorAll("[data-version-row]")].map((r) => r.getAttribute("data-version-row"));
    expect(rows).toEqual(["3", "2", "1"]);
    expect(host.querySelector('[data-version-row="3"]')!.textContent).toContain("Current");
    expect(row(host, 2).getAttribute("aria-pressed")).toBe("false");
    expect(host.textContent).toContain("Choose a version");
  });

  it("selects a version, shows its preview and the diff against the previous one", async () => {
    const host = await mount("version-history");
    const root = host.querySelector<HTMLElement>('[data-slot="version-history"]')!;
    const ids: unknown[] = [];
    root.addEventListener("nq-version-select", (e) => ids.push((e as CustomEvent).detail.id));
    row(host, 2).click();
    await tick();
    expect(ids).toEqual(["v2"]);
    expect(row(host, 2).getAttribute("aria-pressed")).toBe("true");
    const h2 = [...host.querySelectorAll<HTMLElement>("h2")].find((h) => h.parentElement!.parentElement!.style.display !== "none")!;
    expect(h2.textContent).toBe("Version 2");
    [...host.querySelectorAll<HTMLElement>('[role="tab"]')].find((t) => t.textContent!.trim() === "Changes")!.click();
    await tick();
    const added = host.querySelectorAll('[data-slot="version-diff"] [data-diff="add"]');
    expect(added).toHaveLength(2);
    expect([...added].some((a) => a.textContent!.includes("currency"))).toBe(true);
  });

  it("restores after the confirmation", async () => {
    const host = await mount("version-history");
    const root = host.querySelector<HTMLElement>('[data-slot="version-history"]')!;
    const ids: string[] = [];
    root.addEventListener("nq-version-restore", (e) => ids.push((e as CustomEvent).detail.id));
    row(host, 1).click();
    await tick();
    const trigger = host.querySelector<HTMLButtonElement>('[data-slot="alert-dialog-trigger"]')!;
    expect(trigger.style.display).not.toBe("none");
    trigger.click();
    await tick();
    expect(dialogs()).toHaveLength(1);
    expect(dialogs()[0]!.textContent).toContain("Restore version 1?");
    document.querySelector<HTMLButtonElement>('[data-slot="version-restore-confirm"]')!.click();
    await tick(900);
    expect(ids).toEqual(["v1"]);
    expect(dialogs()).toHaveLength(0);
  });

  it("hides restore on the current version", async () => {
    const host = await mount("version-history");
    row(host, 3).click();
    await tick();
    expect(host.querySelector<HTMLElement>('[data-slot="alert-dialog-trigger"]')!.style.display).toBe("none");
  });
});
