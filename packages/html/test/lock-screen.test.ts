// The Blade lock-screen example under real Alpine.
import { describe, expect, it } from "vitest";
import { mount, setup, tick } from "./_float-setup";

setup();
const root = (host: HTMLElement) => host.querySelector<HTMLElement>('[data-slot="lock-screen"]')!;
const key = (host: HTMLElement, digit: string) => host.querySelector<HTMLButtonElement>(`[data-slot="lock-screen-pad"] button[aria-label="Digit ${digit}"]`)!;
const type = async (host: HTMLElement, digits: string) => {
  for (const d of digits) {
    key(host, d).click();
    await tick(10);
  }
};
const plain = (host: HTMLElement) => host.querySelector<HTMLElement>('p[role="alert"]')!;
const button = (host: HTMLElement, text: string) => [...host.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.includes(text))!;

describe("lock-screen (Blade example)", () => {
  it("renders the frozen clock, the person and the PIN keypad", async () => {
    const host = await mount("lock-screen");
    await tick(50);
    expect(root(host).getAttribute("data-method")).toBe("pin");
    expect(host.querySelector("time")!.textContent).toBe("09:00");
    expect(host.querySelector('[data-slot="lock-screen-clock"] p')!.textContent).toBe("Tuesday, September 29");
    expect(host.querySelector("h1")!.textContent).toBe("Nour Adel");
    expect(host.querySelectorAll('[data-slot="lock-screen-pad"] span.size-3')).toHaveLength(6);
    expect(host.querySelectorAll('[data-slot="lock-screen-pad"] button')).toHaveLength(11);
    expect(button(host, "Use PIN").style.display).toBe("none");
    expect(button(host, "Use password").style.display).toBe("");
    expect(plain(host).style.display).toBe("none");
  });

  it("fills the dots as digits land and counts wrong PINs, then locks out", async () => {
    const host = await mount("lock-screen");
    let seen: unknown;
    root(host).addEventListener("nq-lock-unlock", (e) => (seen = (e as CustomEvent).detail));
    await type(host, "123");
    expect(host.querySelectorAll('[data-slot="lock-screen-pad"] span[data-filled]')).toHaveLength(3);
    await type(host, "999");
    await tick(450);
    expect(seen).toMatchObject({ method: "pin", secret: "123999" });
    expect(plain(host).style.display).toBe("");
    expect(plain(host).textContent).toBe("That PIN is not right. 2 tries left.");
    expect(host.querySelectorAll('[data-slot="lock-screen-pad"] span[data-filled]')).toHaveLength(0);
    await type(host, "111111");
    await tick(450);
    expect(plain(host).textContent).toBe("That PIN is not right. 1 tries left.");
    await type(host, "222222");
    await tick(450);
    expect(plain(host).textContent).toBe("Too many attempts. Try again in 0:30.");
    expect(key(host, "1").disabled).toBe(true);
  });

  it("unlocks quietly with the right PIN", async () => {
    const host = await mount("lock-screen");
    await type(host, "123456");
    await tick(450);
    expect(plain(host).style.display).toBe("none");
    expect(key(host, "1").disabled).toBe(false);
  });

  it("switches to the password form and validates it", async () => {
    const host = await mount("lock-screen");
    button(host, "Use password").click();
    await tick(100);
    expect(root(host).getAttribute("data-method")).toBe("password");
    expect(host.querySelector('[data-slot="lock-screen-pad"]')).toBeNull();
    host.querySelector<HTMLButtonElement>('[data-slot="lock-screen-password"] button[type="submit"]')!.click();
    await tick(100);
    const alert = host.querySelector<HTMLElement>('[data-slot="alert"][data-tone="danger"]')!;
    expect(alert.style.display).toBe("");
    expect(alert.textContent).toContain("Enter your password.");
    const input = host.querySelector<HTMLInputElement>('[data-slot="lock-screen-password"] input[name="secret"]')!;
    input.value = "wrong";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await tick();
    host.querySelector<HTMLButtonElement>('[data-slot="lock-screen-password"] button[type="submit"]')!.click();
    await tick(450);
    expect(host.querySelector<HTMLElement>('[data-slot="alert"][data-tone="danger"]')!.textContent).toContain("That is not right. Try again.");
  });

  it("fires sign-out and the switch-account menu events", async () => {
    const host = await mount("lock-screen");
    const events: { type: string; detail: unknown }[] = [];
    for (const name of ["nq-lock-sign-out", "nq-lock-switch-account"]) root(host).addEventListener(name, (e) => events.push({ type: name, detail: (e as CustomEvent).detail.account ?? null }));
    button(host, "Not you? Sign out").click();
    await tick();
    expect(events[0]!.type).toBe("nq-lock-sign-out");
    host.querySelector<HTMLButtonElement>('[data-slot="lock-screen-switch"]')!.click();
    await tick(100);
    const items = [...document.querySelectorAll<HTMLElement>('[data-slot="dropdown-menu-item"]')];
    expect(items.map((i) => i.textContent!.replace(/\s+/g, " ").trim())).toEqual(["OK Omar Khalid omar@example.com", "Sign in to another account"]);
    items[0]!.click();
    await tick();
    expect(events[1]).toMatchObject({ type: "nq-lock-switch-account", detail: { name: "Omar Khalid", email: "omar@example.com" } });
  });
});
