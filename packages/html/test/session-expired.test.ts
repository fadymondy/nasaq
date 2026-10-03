// The Blade session-expired example under real Alpine.
import { describe, expect, it } from "vitest";
import { mount, setup, tick } from "./_float-setup";

setup();
const root = (host: HTMLElement) => host.querySelector<HTMLElement>('[data-slot="session-expired"]')!;
const field = (host: HTMLElement, name: string) => host.querySelector<HTMLInputElement>(`input[name="${name}"]`)!;
const button = (host: HTMLElement, text: string) => [...host.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.includes(text))!;
const summary = (host: HTMLElement) => host.querySelector<HTMLElement>('[data-slot="auth-error-summary"]')!;

describe("session-expired (Blade example)", () => {
  it("renders the notice, the person and the form", async () => {
    const host = await mount("session-expired");
    expect(root(host).getAttribute("data-reason")).toBe("expired");
    expect(host.querySelector('[data-slot="alert-title"]')!.textContent).toContain("Your session expired");
    expect(host.querySelector('[data-slot="session-expired-user"]')!.textContent).toContain("Nour Adel");
    expect(host.querySelector('[data-slot="session-expired-user"]')!.textContent).toContain("nour@example.com");
    expect(field(host, "password")).not.toBeNull();
    expect(host.querySelectorAll('input[name="code"]').length).toBeGreaterThan(0);
    expect(button(host, "Sign in again")).toBeDefined();
    expect(button(host, "Sign out")).toBeDefined();
  });

  it("validates the password and the code before it asks the listener", async () => {
    const host = await mount("session-expired");
    let fired = 0;
    root(host).addEventListener("nq-session-expired", () => fired++);
    button(host, "Sign in again").click();
    await tick(100);
    expect(fired).toBe(0);
    expect(summary(host).style.display).toBe("");
    expect(summary(host).textContent).toContain("Enter your password.");
    expect(summary(host).textContent).toContain("Enter all 6 digits of the code.");
  });

  it("shows the listener's error for a wrong password", async () => {
    const host = await mount("session-expired");
    let seen: { password?: string } | undefined;
    root(host).addEventListener("nq-session-expired", (e) => (seen = (e as CustomEvent).detail));
    const pw = field(host, "password");
    pw.value = "wrong";
    pw.dispatchEvent(new Event("input", { bubbles: true }));
    const code = host.querySelector<HTMLInputElement>('input[name="code"]')!;
    code.value = "123456";
    code.dispatchEvent(new Event("input", { bubbles: true }));
    await tick();
    button(host, "Sign in again").click();
    await tick(450);
    expect(seen?.password).toBe("wrong");
    expect(summary(host).textContent).toContain("That password is not right.");
  });

  it("fires the sign-out event", async () => {
    const host = await mount("session-expired");
    let out = 0;
    root(host).addEventListener("nq-session-sign-out", (e) => e.stopPropagation(), { capture: false });
    root(host).addEventListener("nq-session-sign-out", () => out++);
    button(host, "Sign out").click();
    await tick();
    expect(out).toBe(1);
  });
});
