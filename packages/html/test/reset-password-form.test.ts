// The Blade reset-password-form example under real Alpine.
import { describe, expect, it } from "vitest";
import { mount, setup, tick } from "./_float-setup";

setup();
const input = (host: HTMLElement, name: string) => host.querySelector<HTMLInputElement>(`input[name="${name}"]`)!;
const set = (host: HTMLElement, name: string, value: string) => {
  const el = input(host, name);
  el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
};
const submit = async (host: HTMLElement, ms = 30) => {
  host.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
  await tick(ms);
};
const visible = (el: Element | null) => !!el && (el as HTMLElement).style.display !== "none";
const summary = (host: HTMLElement) => host.querySelector<HTMLElement>('[data-slot="auth-error-summary"]')!;
const root = (host: HTMLElement) => host.querySelector<HTMLElement>('[data-slot="reset-password-form"]')!;
const STRONG = "Correct-Horse-9!";

describe("reset-password-form (Blade example)", () => {
  it("renders the idle form with the strength meter and the checklist", async () => {
    const host = await mount("reset-password-form");
    expect(root(host).getAttribute("data-state")).toBe("idle");
    expect(input(host, "password").autocomplete).toBe("new-password");
    expect(host.querySelectorAll('[data-slot="password-input-rules"] li')).toHaveLength(5);
    expect(host.querySelectorAll('[data-slot="password-input-strength"]')).toHaveLength(1);
    expect(host.querySelector('button[type="submit"]')!.textContent!.trim()).toBe("Reset password");
    expect(visible(summary(host))).toBe(false);
    expect(visible(host.querySelector("h2")!.parentElement!.parentElement)).toBe(false);
  });

  it("requires every rule and a matching confirmation before it dispatches", async () => {
    const host = await mount("reset-password-form");
    let sent = 0;
    root(host).addEventListener("nq-reset-password", () => sent++);
    set(host, "password", "short");
    await tick();
    await submit(host);
    expect(summary(host).textContent).toContain("New password: Use at least 12 characters.");
    set(host, "password", "alllowercaseletters");
    await tick();
    await submit(host);
    expect(summary(host).textContent).toContain("Meet every requirement below.");
    set(host, "password", STRONG);
    set(host, "confirm", "different");
    await tick();
    await submit(host);
    expect(summary(host).textContent).toContain("Confirm new password: The passwords do not match.");
    expect(sent).toBe(0);
  });

  it("shows Password changed with a sign-in link", async () => {
    const host = await mount("reset-password-form");
    set(host, "password", STRONG);
    set(host, "confirm", STRONG);
    await tick();
    await submit(host, 450);
    expect(root(host).getAttribute("data-state")).toBe("success");
    expect(host.querySelector('[data-slot="reset-password-title"]')!.textContent).toBe("Password changed");
    const link = host.querySelector<HTMLAnchorElement>('a[href="/login"]')!;
    expect(visible(link.parentElement)).toBe(true);
    expect(visible(host.querySelector('a[href="/forgot-password"]')!.parentElement)).toBe(false);
  });

  it("shows the expired state when the handler says so", async () => {
    const host = await mount("reset-password-form");
    set(host, "password", "Link-expired-9!!!");
    set(host, "confirm", "Link-expired-9!!!");
    await tick();
    await submit(host, 450);
    expect(root(host).getAttribute("data-state")).toBe("expired");
    expect(host.querySelector('[data-slot="reset-password-title"]')!.textContent).toBe("This link has expired");
    expect(visible(host.querySelector('a[href="/forgot-password"]')!.parentElement)).toBe(true);
    expect(visible(host.querySelector('a[href="/login"]')!.parentElement)).toBe(false);
  });
});
