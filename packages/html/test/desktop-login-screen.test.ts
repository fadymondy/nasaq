// The Blade desktop-login-screen example under real Alpine.
import { describe, expect, it } from "vitest";
import { mount, setup, tick } from "./_float-setup";

setup();
const root = (host: HTMLElement) => host.querySelector<HTMLElement>('[data-slot="desktop-login-screen"]')!;

describe("desktop-login-screen (Blade example)", () => {
  it("renders the frozen clock, greeting, title and the login form", async () => {
    const host = await mount("desktop-login-screen");
    await tick(50);
    expect(host.querySelector("time")!.textContent).toBe("09:00");
    expect(host.querySelector('[data-slot="desktop-login-screen-clock"] p')!.textContent).toBe("Good morning");
    expect(host.querySelector("h1")!.textContent).toBe("ToGO OS");
    expect(host.querySelector('input[name="email"]')).not.toBeNull();
    expect(host.querySelector('input[name="password"]')).not.toBeNull();
  });

  it("fires nq-desktop-login-power from the power buttons", async () => {
    const host = await mount("desktop-login-screen");
    const ids: string[] = [];
    root(host).addEventListener("nq-desktop-login-power", (e) => ids.push((e as CustomEvent).detail.id));
    const buttons = host.querySelectorAll<HTMLButtonElement>('[data-slot="desktop-login-screen-power"] button');
    expect(buttons).toHaveLength(2);
    buttons[1]!.click();
    await tick();
    expect(ids).toEqual(["shutdown"]);
  });

  it("bubbles nq-login from the inner form and shows the listener's error", async () => {
    const host = await mount("desktop-login-screen");
    const set = (name: string, value: string) => {
      const input = host.querySelector<HTMLInputElement>(`input[name="${name}"]`)!;
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    };
    set("email", "a@b.co");
    set("password", "nope");
    await tick();
    host.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    await tick(450);
    expect(host.querySelector<HTMLElement>('[data-slot="alert"][data-tone="danger"]')!.textContent).toContain("Incorrect email or password.");
  });
});
