// The Blade login-form example under real Alpine.
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

describe("login-form (Blade example)", () => {
  it("renders the fields, the buttons and a hidden summary", async () => {
    const host = await mount("login-form");
    const form = host.querySelector("form")!;
    expect(form.getAttribute("data-slot")).toBe("login-form");
    expect(form.getAttribute("data-state")).toBe("idle");
    expect(input(host, "email").type).toBe("email");
    expect(input(host, "email").getAttribute("dir")).toBe("ltr");
    expect(input(host, "email").autocomplete).toBe("username");
    expect(input(host, "password").autocomplete).toBe("current-password");
    expect(host.querySelector('button[type="submit"]')!.textContent!.trim()).toBe("Sign in");
    expect(host.querySelector('[data-slot="login-form-magic-link"]')!.textContent).toContain("Email me a sign-in link");
    expect(host.querySelectorAll('[data-slot="oauth-button"]')).toHaveLength(2);
    expect(host.textContent).toContain("Forgot password?");
    expect(visible(summary(host))).toBe(false);
    // WebAuthn is absent in jsdom: the passkey button and the divider stay hidden.
    expect(visible(host.querySelector('[data-slot="login-form-passkey"]'))).toBe(false);
  });

  it("validates the email and password, lists the problems and focuses the first one", async () => {
    const host = await mount("login-form");
    let sent = 0;
    host.querySelector("form")!.addEventListener("nq-login", () => sent++);
    await submit(host);
    expect(visible(summary(host))).toBe(true);
    expect(summary(host).textContent).toContain("Fix these to sign in");
    expect(summary(host).textContent).toContain("Email: Enter your email address.");
    expect(summary(host).textContent).toContain("Password: Enter your password.");
    expect(input(host, "email").getAttribute("aria-invalid")).toBe("true");
    set(host, "email", "nope");
    await tick();
    expect(input(host, "email").getAttribute("aria-invalid")).toBeNull();
    await submit(host);
    expect(summary(host).textContent).toContain("Enter a valid email address.");
    expect(sent).toBe(0);
  });

  it("dispatches nq-login and shows the server error", async () => {
    const host = await mount("login-form");
    set(host, "email", "ada@example.com");
    set(host, "password", "wrong");
    await submit(host, 450);
    expect(visible(summary(host))).toBe(true);
    expect(summary(host).textContent).toContain("Incorrect email or password.");
  });

  it("hands over the values and succeeds quietly", async () => {
    const host = await mount("login-form");
    const seen: unknown[] = [];
    host.querySelector("form")!.addEventListener("nq-login", (e) => {
      const { email, password, remember, waitUntil } = (e as CustomEvent).detail;
      seen.push({ email, password, remember });
      waitUntil(Promise.resolve());
    });
    set(host, "email", " ada@example.com ");
    set(host, "password", "correct-horse");
    host.querySelector<HTMLElement>('[data-slot="checkbox"]')!.click();
    await tick();
    await submit(host, 100);
    expect(seen).toEqual([{ email: "ada@example.com", password: "correct-horse", remember: true }]);
    expect(visible(summary(host))).toBe(false);
  });

  it("shows the generic error when the handler rejects", async () => {
    const host = await mount("login-form");
    host.querySelector("form")!.addEventListener("nq-login", (e) => (e as CustomEvent).detail.waitUntil(Promise.reject(new Error("x"))));
    set(host, "email", "ada@example.com");
    set(host, "password", "pw");
    await submit(host, 100);
    expect(summary(host).textContent).toContain("Something went wrong. Try again.");
  });

  it("sends a magic link, shows the sent panel with a resend timer, and goes back", async () => {
    const host = await mount("login-form");
    set(host, "email", "ada@example.com");
    host.querySelector<HTMLButtonElement>('[data-slot="login-form-magic-link"]')!.click();
    await tick(450);
    const form = host.querySelector("form")!;
    expect(form.getAttribute("data-state")).toBe("sent");
    expect(host.querySelector('[data-slot="login-form-sent-title"]')!.textContent).toBe("Check your email");
    expect(host.querySelector("p > bdi")!.textContent).toBe("ada@example.com");
    const resend = host.querySelector<HTMLButtonElement>('[data-slot="login-form-resend"]')!;
    expect(resend.disabled).toBe(true);
    expect(resend.textContent).toContain("Send again in 0:30");
    const change = [...host.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent!.trim() === "Use a different email")!;
    change.click();
    await tick();
    expect(form.getAttribute("data-state")).toBe("idle");
  });
});
