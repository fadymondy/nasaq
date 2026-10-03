// The Blade sign-in-flow example under real Alpine.
import { describe, expect, it } from "vitest";
import { mount, setup, tick } from "./_float-setup";

setup();
const root = (host: HTMLElement) => host.querySelector<HTMLElement>('[data-slot="sign-in-flow"]')!;
const field = (host: HTMLElement, name: string) => host.querySelector<HTMLInputElement>(`input[name="${name}"]`)!;
const button = (host: HTMLElement, text: string) => [...host.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.includes(text))!;
const type = (el: HTMLInputElement, value: string) => {
  el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
};

describe("sign-in-flow (Blade example)", () => {
  it("starts on the email step", async () => {
    const host = await mount("sign-in-flow");
    expect(root(host).getAttribute("data-step")).toBe("email");
    expect(field(host, "email")).not.toBeNull();
    expect(button(host, "Continue")).toBeDefined();
  });

  it("validates the email before it asks the listener", async () => {
    const host = await mount("sign-in-flow");
    let fired = 0;
    root(host).addEventListener("nq-sign-in-identify", () => fired++);
    button(host, "Continue").click();
    await tick(100);
    expect(fired).toBe(0);
    expect(host.querySelector('[data-slot="auth-error-summary"]')!.textContent).toContain("Enter your email address.");
  });

  it("moves to the password step with the address as a chip, and Change goes back", async () => {
    const host = await mount("sign-in-flow");
    type(field(host, "email"), "nour@example.com");
    button(host, "Continue").click();
    await tick(500);
    expect(root(host).getAttribute("data-step")).toBe("password");
    expect(host.querySelector('[data-slot="sign-in-flow-identity"]')!.textContent).toContain("nour@example.com");
    expect(field(host, "password")).not.toBeNull();
    expect(host.querySelector('[data-slot="sign-in-flow-forgot-link"]')).not.toBeNull();
    button(host, "Change").click();
    await tick(100);
    expect(root(host).getAttribute("data-step")).toBe("email");
  });

  it("shows the listener's error for a wrong password", async () => {
    const host = await mount("sign-in-flow");
    type(field(host, "email"), "nour@example.com");
    button(host, "Continue").click();
    await tick(500);
    type(field(host, "password"), "wrong");
    host.querySelector<HTMLFormElement>('[data-slot="sign-in-flow-password"]')!.requestSubmit();
    await tick(400);
    expect(host.querySelector('[data-slot="auth-error-summary"]')!.textContent).toContain("Wrong email or password.");
  });

  it("opens the forgot-password request in place", async () => {
    const host = await mount("sign-in-flow");
    type(field(host, "email"), "nour@example.com");
    button(host, "Continue").click();
    await tick(500);
    (host.querySelector('[data-slot="sign-in-flow-forgot-link"]') as HTMLElement).click();
    await tick(500);
    expect(root(host).getAttribute("data-step")).toBe("forgot");
    expect(field(host, "email").value).toBe("nour@example.com");
  });

  const toCode = async (length?: number) => {
    const host = await mount("sign-in-flow");
    root(host).addEventListener("nq-sign-in-identify", (e) => (e as CustomEvent).detail.waitUntil(Promise.resolve({ step: "code", length })));
    type(field(host, "email"), "nour@example.com");
    button(host, "Continue").click();
    await tick(500);
    return host;
  };

  it("sizes the code boxes from the length the listener sends", async () => {
    const host = await toCode(4);
    expect(root(host).getAttribute("data-step")).toBe("code");
    expect(host.querySelectorAll('[data-slot="otp-input-box"]').length).toBe(4);
    expect(host.querySelector('[data-slot="verify-otp-form"]')!.textContent).toContain("4-digit");
  });

  it("falls back to the code-length default (6) without a listener length", async () => {
    const host = await toCode();
    expect(host.querySelectorAll('[data-slot="otp-input-box"]').length).toBe(6);
  });

  it("asks for all the digits of a custom length", async () => {
    const host = await toCode(4);
    const boxes = [...host.querySelectorAll<HTMLInputElement>('[data-slot="otp-input-box"]')];
    type(boxes[0]!, "12");
    await tick(50);
    host.querySelector<HTMLFormElement>('[data-slot="verify-otp-form"]')!.requestSubmit();
    await tick(100);
    expect(host.querySelector('[data-slot="verify-otp-form"]')!.textContent).toContain("Enter all 4 digits.");
  });

  it("builds a new step wrapper on every step change so the entrance animation replays", async () => {
    const host = await mount("sign-in-flow");
    const first = host.querySelector('[data-slot="sign-in-flow-step"]');
    expect(first).not.toBeNull();
    type(field(host, "email"), "nour@example.com");
    button(host, "Continue").click();
    await tick(500);
    const second = host.querySelector('[data-slot="sign-in-flow-step"]');
    expect(root(host).getAttribute("data-step")).toBe("password");
    expect(second).not.toBeNull();
    expect(second).not.toBe(first);
    expect(host.querySelectorAll('[data-slot="sign-in-flow-step"]').length).toBe(1);
    button(host, "Change").click();
    await tick(100);
    expect(host.querySelector('[data-slot="sign-in-flow-step"]')).not.toBe(second);
  });

  it("sizes the second factor from the password result", async () => {
    const host = await mount("sign-in-flow");
    type(field(host, "email"), "nour@example.com");
    button(host, "Continue").click();
    await tick(500);
    root(host).addEventListener("nq-sign-in-password", (e) => (e as CustomEvent).detail.waitUntil(Promise.resolve({ twoFactor: true, length: 8 })));
    type(field(host, "password"), "right");
    host.querySelector<HTMLFormElement>('[data-slot="sign-in-flow-password"]')!.requestSubmit();
    await tick(500);
    expect(root(host).getAttribute("data-step")).toBe("two-factor");
    expect(host.querySelectorAll('[data-slot="otp-input-box"]').length).toBe(8);
  });
});
