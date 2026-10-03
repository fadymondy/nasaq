// The Blade verify-otp-form example under real Alpine.
import { describe, expect, it } from "vitest";
import { mount, setup, tick } from "./_float-setup";

setup();
const boxes = (host: HTMLElement) => [...host.querySelectorAll<HTMLInputElement>('[data-slot="otp-input-box"]')];
const form = (host: HTMLElement) => host.querySelector<HTMLFormElement>("form")!;
const message = (host: HTMLElement) => host.querySelector<HTMLElement>('p[role="alert"]')!;
const type = async (host: HTMLElement, code: string) => {
  // Paste fills every box, like a real one-time-code paste.
  const first = boxes(host)[0]!;
  const event = new Event("paste", { bubbles: true, cancelable: true });
  Object.defineProperty(event, "clipboardData", { value: { getData: () => code } });
  first.dispatchEvent(event);
  await tick();
};

describe("verify-otp-form (Blade example)", () => {
  it("renders the masked destination, six boxes, the hidden code field and the resend countdown", async () => {
    const host = await mount("verify-otp-form");
    expect(form(host).getAttribute("data-slot")).toBe("verify-otp-form");
    expect(host.querySelector("p > bdi")!.textContent).toBe("f•••y@example.com");
    expect(host.querySelector("p")!.textContent).toContain("Enter the 6-digit code we sent to");
    expect(boxes(host)).toHaveLength(6);
    expect(host.querySelector('[role="group"]')!.getAttribute("aria-label")).toBe("Verification code");
    expect(host.querySelector('input[name="code"]')).not.toBeNull();
    const resend = host.querySelector<HTMLButtonElement>('[data-slot="verify-otp-resend"]')!;
    expect(resend.disabled).toBe(true);
    expect(resend.textContent).toContain("Resend in 0:30");
    expect(host.querySelector('a[href="/login"]')!.textContent).toBe("Use a different email");
    expect(message(host).style.display).toBe("none");
  });

  it("asks for every digit when the form is submitted early", async () => {
    const host = await mount("verify-otp-form");
    let sent = 0;
    form(host).addEventListener("nq-verify-otp", () => sent++);
    host.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    await tick(100);
    expect(message(host).textContent).toBe("Enter all 6 digits.");
    expect(message(host).style.display).toBe("");
    expect(boxes(host)[0]!.getAttribute("aria-invalid")).toBe("true");
    expect(sent).toBe(0);
  });

  it("submits on paste, and a wrong code clears the boxes with an error", async () => {
    const host = await mount("verify-otp-form");
    const seen: string[] = [];
    form(host).addEventListener("nq-verify-otp", (e) => seen.push((e as CustomEvent).detail.code));
    await type(host, "999999");
    await tick(450);
    expect(seen).toEqual(["999999"]);
    expect(message(host).textContent).toBe("That code is not right.");
    expect(boxes(host).every((b) => b.value === "")).toBe(true);
    expect(boxes(host)[0]!.getAttribute("aria-invalid")).toBe("true");
  });

  it("accepts the right code without an error", async () => {
    const host = await mount("verify-otp-form");
    await type(host, "123456");
    await tick(450);
    expect(message(host).textContent).toBe("");
    expect(message(host).style.display).toBe("none");
    expect(boxes(host).map((b) => b.value).join("")).toBe("123456");
  });

  it("resends once the countdown is over and restarts it", async () => {
    const host = await mount("verify-otp-form");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (window as any).Alpine.$data(form(host));
    data.cooldown = 0;
    await tick();
    const resend = host.querySelector<HTMLButtonElement>('[data-slot="verify-otp-resend"]')!;
    expect(resend.disabled).toBe(false);
    resend.click();
    await tick(450);
    expect(data.resendSent).toBe(true);
    expect(data.cooldown).toBe(30);
    expect(host.querySelector('span[role="status"]')!.textContent).toBe("We sent a new code.");
  });
});
