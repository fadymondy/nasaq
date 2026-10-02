// The Blade forgot-password-form example under real Alpine.
import { describe, expect, it } from "vitest";
import { mount, setup, tick } from "./_float-setup";

setup();
const input = (host: HTMLElement) => host.querySelector<HTMLInputElement>('input[name="email"]')!;
const set = (host: HTMLElement, value: string) => {
  const el = input(host);
  el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
};
const submit = async (host: HTMLElement, ms = 30) => {
  host.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
  await tick(ms);
};
const visible = (el: Element | null) => !!el && (el as HTMLElement).style.display !== "none";
const summary = (host: HTMLElement) => host.querySelector<HTMLElement>('[data-slot="auth-error-summary"]')!;

describe("forgot-password-form (Blade example)", () => {
  it("renders the idle form", async () => {
    const host = await mount("forgot-password-form");
    const root = host.querySelector('[data-slot="forgot-password-form"]')!;
    expect(root.getAttribute("data-state")).toBe("idle");
    expect(input(host).getAttribute("dir")).toBe("ltr");
    expect(input(host).autocomplete).toBe("email");
    expect(host.querySelector('button[type="submit"]')!.textContent!.trim()).toBe("Send reset link");
    expect(visible(summary(host))).toBe(false);
  });

  it("validates the email before it dispatches", async () => {
    const host = await mount("forgot-password-form");
    let sent = 0;
    host.querySelector('[data-slot="forgot-password-form"]')!.addEventListener("nq-forgot-password", () => sent++);
    await submit(host);
    expect(summary(host).textContent).toContain("Email: Enter your email address.");
    expect(input(host).getAttribute("aria-invalid")).toBe("true");
    set(host, "nope");
    await tick();
    await submit(host);
    expect(summary(host).textContent).toContain("Enter a valid email address.");
    expect(sent).toBe(0);
  });

  it("shows the sent panel with a resend timer, resends, and goes back", async () => {
    const host = await mount("forgot-password-form");
    const root = host.querySelector('[data-slot="forgot-password-form"]')!;
    set(host, " ada@example.com ");
    await submit(host, 450);
    expect(root.getAttribute("data-state")).toBe("sent");
    expect(host.querySelector('[data-slot="forgot-password-sent-title"]')!.textContent).toBe("Check your inbox");
    expect(host.querySelector("p > bdi")!.textContent).toBe("ada@example.com");
    const resend = host.querySelector<HTMLButtonElement>('[data-slot="forgot-password-resend"]')!;
    expect(resend.disabled).toBe(true);
    expect(resend.textContent).toContain("Resend in 0:30");
    [...host.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent!.trim() === "Use a different email")!.click();
    await tick();
    expect(root.getAttribute("data-state")).toBe("idle");
  });

  it("falls back to nq-forgot-password for the resend once the timer is over", async () => {
    const host = await mount("forgot-password-form");
    const root = host.querySelector<HTMLElement>('[data-slot="forgot-password-form"]')!;
    const seen: string[] = [];
    root.addEventListener("nq-forgot-password", (e) => {
      seen.push((e as CustomEvent).detail.email);
      (e as CustomEvent).detail.waitUntil(Promise.resolve());
    });
    set(host, "ada@example.com");
    await submit(host, 450);
    expect(root.getAttribute("data-state")).toBe("sent");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (window as any).Alpine.$data(root);
    data.cooldown = 0;
    await tick();
    host.querySelector<HTMLButtonElement>('[data-slot="forgot-password-resend"]')!.click();
    await tick(450);
    expect(seen).toEqual(["ada@example.com", "ada@example.com"]);
    expect(data.resendDone).toBe(true);
    expect(data.cooldown).toBe(30);
  });
});
