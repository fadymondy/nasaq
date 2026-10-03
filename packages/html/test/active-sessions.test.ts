// The Blade active-sessions example under real Alpine.
import { describe, expect, it } from "vitest";
import { mount, setup, tick } from "./_float-setup";

setup();
const rows = (host: HTMLElement) => [...host.querySelectorAll<HTMLElement>('[data-slot="session-row"]')];
const dialogs = () => [...document.querySelectorAll<HTMLElement>('[role="alertdialog"]')].filter((d) => !d.hasAttribute("hidden") && d.style.display !== "none");
const confirm = (dialog: HTMLElement) => [...dialog.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.getAttribute("data-slot") !== "alert-dialog-cancel")!;

describe("active-sessions (Blade example)", () => {
  it("lists the current device first, marked, with place, IP and relative time", async () => {
    const host = await mount("active-sessions");
    expect(host.querySelector('[data-slot="active-sessions"] h2')!.textContent).toBe("Active sessions");
    expect(host.querySelector("ul")!.getAttribute("aria-label")).toBe("Signed-in devices");
    const r = rows(host);
    expect(r).toHaveLength(3);
    expect(r[0]!.hasAttribute("data-current")).toBe(true);
    expect(r[0]!.textContent).toContain("Chrome on macOS");
    expect(r[0]!.textContent).toContain("This device");
    expect(r[1]!.hasAttribute("data-current")).toBe(false);
    expect(r[1]!.querySelector("[dir=ltr]")!.textContent).toBe("41.33.80.2");
    expect(r[1]!.querySelector("time")!.getAttribute("datetime")).toBeTruthy();
    expect(r[0]!.querySelector('[data-slot="alert-dialog-trigger"]')).toBeNull();
    expect(r[1]!.querySelector('[data-slot="alert-dialog-trigger"]')!.textContent!.trim()).toBe("Sign out: Safari on iPhone");
  });

  it("signs a device out after the confirmation and hides its row", async () => {
    const host = await mount("active-sessions");
    const root = host.querySelector<HTMLElement>('[data-slot="active-sessions"]')!;
    const ids: string[] = [];
    root.addEventListener("nq-session-revoke", (e) => ids.push((e as CustomEvent).detail.id));
    rows(host)[1]!.querySelector<HTMLButtonElement>('[data-slot="alert-dialog-trigger"]')!.click();
    await tick();
    expect(dialogs()).toHaveLength(1);
    expect(dialogs()[0]!.textContent).toContain("Sign out this device?");
    confirm(dialogs()[0]!).click();
    await tick(900);
    expect(ids).toEqual(["2"]);
    expect(rows(host)[1]!.style.display).toBe("none");
    expect(dialogs()).toHaveLength(0);
  });

  it("keeps the confirmation open and shows the error when signing out fails", async () => {
    const host = await mount("active-sessions");
    const root = host.querySelector<HTMLElement>('[data-slot="active-sessions"]')!;
    root.addEventListener("nq-session-revoke", (e) => (e as CustomEvent).detail.waitUntil(Promise.resolve({ error: "Could not sign out" })));
    rows(host)[1]!.querySelector<HTMLButtonElement>('[data-slot="alert-dialog-trigger"]')!.click();
    await tick();
    confirm(dialogs()[0]!).click();
    await tick(900);
    expect(dialogs()).toHaveLength(1);
    const alert = host.querySelector<HTMLElement>('[data-slot="alert"]')!;
    expect(alert.textContent).toContain("Could not sign out");
    expect(alert.style.display).not.toBe("none");
    expect(rows(host)[1]!.style.display).not.toBe("none");
  });

  it("signs out every other device and then hides the header action", async () => {
    const host = await mount("active-sessions");
    const action = host.querySelector<HTMLElement>('[data-slot="card-action"]')!;
    expect(action.style.display).not.toBe("none");
    action.querySelector<HTMLButtonElement>('[data-slot="alert-dialog-trigger"]')!.click();
    await tick();
    confirm(dialogs()[0]!).click();
    await tick(900);
    expect(rows(host).map((r) => r.style.display)).toEqual(["", "none", "none"]);
    expect(action.style.display).toBe("none");
  });
});
