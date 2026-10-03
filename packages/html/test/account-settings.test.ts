// The Blade account-settings example under real Alpine.
import { describe, expect, it } from "vitest";
import { mount, setup, tick } from "./_float-setup";

setup();
const nav = (host: HTMLElement) => [...host.querySelectorAll<HTMLElement>("nav button")];
const tabs = (host: HTMLElement) => [...host.querySelectorAll<HTMLElement>('[role="tab"]')];
const panel = (host: HTMLElement, id: string) => host.querySelector<HTMLElement>(`[data-slot="account-settings-content"][data-section="${id}"]`)!;
const dialog = () => document.querySelector<HTMLElement>('[role="alertdialog"]');
const typed = (value: string) => {
  const input = document.querySelector<HTMLInputElement>('[role="alertdialog"] input')!;
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
};
const submitButton = () => document.querySelector<HTMLButtonElement>('[role="alertdialog"] button[type="submit"]')!;

describe("account-settings (Blade example)", () => {
  it("renders the nav with the first item active and every other panel hidden", async () => {
    const host = await mount("account-settings");
    expect(host.querySelector("h1")!.textContent).toBe("Account settings");
    expect(host.querySelector("nav")!.getAttribute("aria-label")).toBe("Settings sections");
    const [profile, security] = nav(host);
    expect(profile!.getAttribute("aria-current")).toBe("page");
    expect(profile!.getAttribute("data-active")).toBe("true");
    expect(security!.getAttribute("aria-current")).toBeNull();
    expect(panel(host, "profile").hidden).toBe(false);
    expect(panel(host, "security").hidden).toBe(true);
    expect(panel(host, "profile").getAttribute("role")).toBe("region");
    expect(profile!.getAttribute("aria-controls")).toBe(panel(host, "profile").id);
    expect(panel(host, "profile").getAttribute("aria-labelledby")).toBe(profile!.id);
    expect(nav(host).at(-1)!.getAttribute("data-tone")).toBe("danger");
  });

  it("switches panel from the nav and keeps the tabs in step", async () => {
    const host = await mount("account-settings");
    nav(host)[1]!.click();
    await tick();
    expect(panel(host, "security").hidden).toBe(false);
    expect(panel(host, "profile").hidden).toBe(true);
    expect(nav(host)[1]!.getAttribute("aria-current")).toBe("page");
    expect(nav(host)[0]!.getAttribute("aria-current")).toBeNull();
    expect(tabs(host)[1]!.getAttribute("aria-selected")).toBe("true");
    expect(tabs(host)[1]!.hasAttribute("data-active")).toBe(true);
    expect(tabs(host)[0]!.getAttribute("aria-selected")).toBe("false");
  });

  it("switches panel from the tabs, with arrow keys moving through them", async () => {
    const host = await mount("account-settings");
    tabs(host)[2]!.click();
    await tick();
    expect(panel(host, "connected").hidden).toBe(false);
    expect(nav(host)[2]!.getAttribute("data-active")).toBe("true");
    const list = host.querySelector<HTMLElement>('[role="tablist"]')!;
    tabs(host)[2]!.focus();
    list.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    await tick();
    expect(panel(host, "notifications").hidden).toBe(false);
  });

  it("asks for the typed phrase before the delete button enables, and closes on success", async () => {
    const host = await mount("account-settings");
    nav(host).at(-1)!.click();
    await tick();
    const zone = host.querySelector<HTMLElement>('[data-slot="danger-zone"]')!;
    expect(zone.getAttribute("data-tone")).toBe("danger");
    zone.querySelector<HTMLButtonElement>('[data-slot="alert-dialog-trigger"]')!.click();
    await tick();
    expect(dialog()).not.toBeNull();
    expect(submitButton().disabled).toBe(true);
    typed("delete");
    await tick();
    expect(submitButton().disabled).toBe(true);
    typed("DELETE");
    await tick();
    expect(submitButton().disabled).toBe(false);
    expect(submitButton().hasAttribute("data-disabled")).toBe(false);
    submitButton().click();
    await tick(800);
    expect(dialog()!.style.display).toBe("none");
  });

  it("keeps the dialog open and shows the error when deleting fails", async () => {
    const host = await mount("account-settings");
    const zone = host.querySelector<HTMLElement>('[data-slot="danger-zone"]')!;
    zone.addEventListener("nq-account-delete", (e) => (e as CustomEvent).detail.waitUntil(Promise.resolve({ error: "Not allowed" })));
    zone.querySelector<HTMLButtonElement>('[data-slot="alert-dialog-trigger"]')!.click();
    await tick();
    typed("DELETE");
    await tick();
    submitButton().click();
    await tick(900);
    expect(dialog()).not.toBeNull();
    const alert = document.querySelector<HTMLElement>('[role="alertdialog"] [data-slot="field-description"]')!;
    expect(alert.textContent).toBe("Not allowed");
    expect(alert.style.display).not.toBe("none");
    expect(document.querySelector('[role="alertdialog"] [data-slot="field"]')!.hasAttribute("data-invalid")).toBe(true);
  });
});
