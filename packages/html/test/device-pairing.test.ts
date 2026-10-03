// The Blade device-pairing example under real Alpine: approval, code entry, code display and handoff.
import { describe, expect, it } from "vitest";
import { mount, setup, tick } from "./_float-setup";

setup();
const slot = (host: HTMLElement, name: string) => host.querySelector<HTMLElement>(`[data-slot="${name}"]`)!;
const button = (scope: HTMLElement, text: string) => [...scope.querySelectorAll<HTMLElement>("button, a")].find((b) => b.textContent?.replace(/\s+/g, " ").trim().includes(text))!;
const visible = (el: Element) => (el as HTMLElement).style.display !== "none";

describe("device-pairing (Blade example)", () => {
  it("shows the pending approval with the frozen countdown", async () => {
    const host = await mount("device-pairing");
    await tick(50);
    const card = slot(host, "device-approval");
    expect(card.getAttribute("data-status")).toBe("pending");
    expect(card.querySelector('[data-slot="device-code"]')!.textContent).toBe("WDJB-MJHT");
    expect(card.textContent).toContain("Expires in 10:00");
    expect(card.textContent).toContain("203.0.113.7");
    expect(visible(card.querySelector('[role="status"]')!)).toBe(false);
  });

  it("approves and denies through events, showing a failure from the listener", async () => {
    const host = await mount("device-pairing");
    const card = slot(host, "device-approval");
    const seen: string[] = [];
    for (const n of ["nq-device-approve", "nq-device-deny"]) card.addEventListener(n, () => seen.push(n));
    button(card, "Deny").click();
    await tick(450);
    expect(seen).toEqual(["nq-device-deny"]);
    expect(card.textContent).toContain("Could not deny right now.");
    button(card, "Approve").click();
    await tick(450);
    expect(seen).toEqual(["nq-device-deny", "nq-device-approve"]);
  });

  it("moves to the outcome screen when status changes", async () => {
    const host = await mount("device-pairing");
    const card = slot(host, "device-approval");
    (window as unknown as { Alpine: { $data(el: Element): { status: string } } }).Alpine.$data(card).status = "approved";
    await tick(50);
    expect(card.getAttribute("data-status")).toBe("approved");
    expect(card.textContent).toContain("Device approved");
  });

  it("pre-fills and validates the code entry, then sends the normalised code", async () => {
    const host = await mount("device-pairing");
    const form = slot(host, "device-code-entry");
    const boxes = form.querySelectorAll<HTMLInputElement>('[data-slot="otp-input-box"]');
    expect(boxes).toHaveLength(8);
    expect([...boxes].map((b) => b.value).join("")).toBe("WDJB");
    let sent = "";
    form.addEventListener("nq-device-code", (e) => (sent = (e as CustomEvent).detail.code));
    form.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    await tick(100);
    expect(sent).toBe("");
    expect(form.querySelector('p[role="alert"]')!.textContent).toBe("Enter all 8 characters.");
  });

  it("shows the grouped code and a waiting state on the display", async () => {
    const host = await mount("device-pairing");
    const card = slot(host, "device-code-display");
    await tick(50);
    expect(card.getAttribute("data-status")).toBe("pending");
    expect(card.querySelector('[data-slot="device-code"]')!.textContent).toBe("WDJB-MJHT");
    expect(card.querySelector('[data-slot="device-code-status"]')!.textContent).toContain("Waiting for approval");
    expect(card.querySelector('[data-slot="device-code-status"]')!.textContent).toContain("Expires in 10:00");
  });

  it("renders the handoff state and fallbacks", async () => {
    const host = await mount("device-pairing");
    const card = slot(host, "device-handoff");
    expect(card.getAttribute("data-state")).toBe("failed");
    expect(card.querySelector("h1")!.textContent).toBe("Open Mahaam Desktop");
    expect(card.querySelector('[role="alert"]')!.textContent).toContain("We could not open Mahaam Desktop");
    expect(card.querySelector('a[href="mahaam://auth/callback?token=abc"]')!.textContent).toContain("Try again");
    expect(card.textContent).toContain("WDJB-MJHT");
    let cancelled = false;
    card.addEventListener("nq-device-cancel", () => (cancelled = true));
    button(card, "Cancel sign-in").click();
    await tick();
    expect(cancelled).toBe(true);
  });
});
