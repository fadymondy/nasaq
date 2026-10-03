// The Blade two-factor-challenge example under real Alpine.
import { describe, expect, it } from "vitest";
import { mount, setup, tick } from "./_float-setup";

setup();
const boxes = (host: HTMLElement) => [...host.querySelectorAll<HTMLInputElement>('[data-slot="otp-input-box"]')];
const form = (host: HTMLElement) => host.querySelector<HTMLFormElement>("form")!;
const alertP = (host: HTMLElement) => host.querySelector<HTMLElement>('p[role="alert"]');
const recovery = (host: HTMLElement) => host.querySelector<HTMLInputElement>('input[name="code"]:not([type="hidden"])');
const switchBtn = (host: HTMLElement) => [...host.querySelectorAll<HTMLButtonElement>("button")].find((b) => /instead/.test(b.textContent ?? "") && !b.matches('[data-slot="two-factor-passkey"]'))!;
const paste = async (host: HTMLElement, code: string) => {
  const event = new Event("paste", { bubbles: true, cancelable: true });
  Object.defineProperty(event, "clipboardData", { value: { getData: () => code } });
  boxes(host)[0]!.dispatchEvent(event);
  await tick();
};

describe("two-factor-challenge (Blade example)", () => {
  it("renders the authenticator step with six boxes, the trust checkbox and the method switch", async () => {
    const host = await mount("two-factor-challenge");
    expect(form(host).getAttribute("data-slot")).toBe("two-factor-challenge");
    expect(form(host).getAttribute("data-method")).toBe("totp");
    expect(boxes(host)).toHaveLength(6);
    expect(host.querySelector("p")!.textContent).toContain("6-digit code");
    expect(host.querySelector('[role="group"]')!.getAttribute("aria-label")).toBe("Authenticator code");
    expect(host.querySelector('input[name="trustDevice"], [name="trustDevice"]')).not.toBeNull();
    expect(switchBtn(host).textContent).toContain("Use a recovery code instead");
    expect(host.querySelector('a[href="/login"]')!.textContent).toBe("Back to sign in");
  });

  it("asks for every digit when submitted early", async () => {
    const host = await mount("two-factor-challenge");
    let sent = 0;
    form(host).addEventListener("nq-two-factor", () => sent++);
    host.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    await tick(100);
    expect(alertP(host)!.textContent).toBe("Enter all 6 digits.");
    expect(alertP(host)!.style.display).toBe("");
    expect(boxes(host)[0]!.getAttribute("aria-invalid")).toBe("true");
    expect(sent).toBe(0);
  });

  it("submits on paste with the method and trust flag, and a wrong code clears the boxes", async () => {
    const host = await mount("two-factor-challenge");
    const seen: unknown[] = [];
    form(host).addEventListener("nq-two-factor", (e) => seen.push((e as CustomEvent).detail));
    const trust = host.querySelector<HTMLElement>('[name="trustDevice"]')!;
    (trust.closest("label")!.querySelector('[role="checkbox"], button, input') as HTMLElement).click();
    await tick();
    await paste(host, "999999");
    await tick(450);
    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({ code: "999999", method: "totp", trustDevice: true });
    expect(alertP(host)!.textContent).toBe("That code is not right, or it expired.");
    expect(boxes(host).every((b) => b.value === "")).toBe(true);
  });

  it("switches to a recovery code, validates it and submits it", async () => {
    const host = await mount("two-factor-challenge");
    switchBtn(host).click();
    await tick(100);
    expect(form(host).getAttribute("data-method")).toBe("recovery");
    expect(boxes(host)).toHaveLength(0);
    expect(recovery(host)!.getAttribute("dir")).toBe("ltr");
    expect(host.querySelector("p")!.textContent).toContain("recovery codes");
    const seen: unknown[] = [];
    form(host).addEventListener("nq-two-factor", (e) => seen.push((e as CustomEvent).detail));
    host.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    await tick(100);
    expect(host.textContent).toContain("Enter a recovery code.");
    expect(recovery(host)!.getAttribute("aria-invalid")).toBe("true");
    expect(seen).toHaveLength(0);
    const input = recovery(host)!;
    input.value = " abcd-1234 ";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await tick();
    host.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    await tick(450);
    expect(seen[0]).toMatchObject({ code: "abcd-1234", method: "recovery" });
    expect(host.textContent).not.toContain("That code is not right");
  });

  it("shows the passkey button only when the browser supports WebAuthn", async () => {
    const host = await mount("two-factor-challenge");
    const btn = host.querySelector<HTMLElement>('[data-slot="two-factor-passkey"]')!;
    expect(btn).not.toBeNull();
    expect(btn.style.display).toBe(typeof PublicKeyCredential === "undefined" ? "none" : "");
  });
});
