// The Blade register-form example under real Alpine.
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
const fill = (host: HTMLElement, name: string, email: string, password: string, confirm: string) => {
  set(host, "name", name);
  set(host, "email", email);
  set(host, "password", password);
  set(host, "confirm", confirm);
};

describe("register-form (Blade example)", () => {
  it("renders the fields, the hint, the terms links and the providers", async () => {
    const host = await mount("register-form");
    expect(host.querySelector("form")!.getAttribute("data-slot")).toBe("register-form");
    expect(input(host, "name").autocomplete).toBe("name");
    expect(input(host, "email").getAttribute("dir")).toBe("ltr");
    expect(input(host, "password").autocomplete).toBe("new-password");
    expect(input(host, "confirm").autocomplete).toBe("new-password");
    expect(host.textContent).toContain("At least 8 characters.");
    expect(host.querySelectorAll('[data-slot="oauth-button"]')).toHaveLength(2);
    expect(host.querySelector('[data-slot="oauth-divider"]')!.textContent).toContain("or sign up with email");
    expect(host.querySelector("a[href='/terms']")!.textContent).toBe("Terms");
    expect(host.querySelector('button[type="submit"]')!.textContent!.trim()).toBe("Create account");
    expect(visible(summary(host))).toBe(false);
  });

  it("validates every field, including the terms, before it dispatches", async () => {
    const host = await mount("register-form");
    let sent = 0;
    host.querySelector("form")!.addEventListener("nq-register", () => sent++);
    await submit(host);
    const text = summary(host).textContent!;
    expect(text).toContain("Full name: Enter your name.");
    expect(text).toContain("Email: Enter your email address.");
    expect(text).toContain("Password: Use at least 8 characters.");
    expect(input(host, "name").getAttribute("aria-invalid")).toBe("true");
    fill(host, "Ada", "ada@example.com", "longenough1", "different1");
    await tick();
    await submit(host);
    expect(summary(host).textContent).toContain("Confirm password: The passwords do not match.");
    expect(summary(host).textContent).toContain("Accept the terms");
    expect(sent).toBe(0);
  });

  it("dispatches the values and shows a server field error", async () => {
    const host = await mount("register-form");
    fill(host, "Ada", "taken@example.com", "longenough1", "longenough1");
    host.querySelector<HTMLElement>('[data-slot="checkbox"]')!.click();
    await tick();
    await submit(host, 450);
    expect(summary(host).textContent).toContain("This email is already registered.");
    expect(input(host, "email").getAttribute("aria-invalid")).toBe("true");

    const seen: unknown[] = [];
    host.querySelector("form")!.addEventListener("nq-register", (e) => {
      const { name, email, password, acceptTerms, waitUntil } = (e as CustomEvent).detail;
      seen.push({ name, email, password, acceptTerms });
      waitUntil(Promise.resolve());
    });
    set(host, "email", "ada@example.com");
    await tick();
    await submit(host, 100);
    expect(seen).toEqual([{ name: "Ada", email: "ada@example.com", password: "longenough1", acceptTerms: true }]);
    expect(visible(summary(host))).toBe(false);
  });
});
