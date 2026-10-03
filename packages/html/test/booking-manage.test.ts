// The Blade example (php/examples/booking-manage.blade.php) under real Alpine: reschedule picks a time and fires "reschedule",
// cancel asks first and fires "cancel-booking", and fail(message) puts the page back.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms));

beforeAll(() => {
  Alpine.plugin(nasaq);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).Alpine = Alpine;
  Alpine.start();
});

afterEach(() => {
  for (const el of [...document.body.children]) {
    Alpine.destroyTree(el as HTMLElement);
    el.remove();
  }
});

async function mount(html: string) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

const btn = (label: string) => [...document.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent!.trim() === label)!;
const visible = (el: Element) => (el as HTMLElement).style.display !== "none";

describe("booking-manage (Blade example)", () => {
  it("shows the ticket, the policy and both actions", async () => {
    const host = await mount(rendered("booking-manage"));
    const ticket = host.querySelector('[data-slot="booking-ticket"]')!;
    expect(ticket.getAttribute("data-status")).toBe("confirmed");
    expect(ticket.textContent).toContain("NQ-4821");
    expect(host.querySelector('a[download="NQ-4821.ics"]')!.getAttribute("href")).toContain("BEGIN%3AVCALENDAR");
    expect(host.querySelector('a[href^="https://calendar.google.com"]')).not.toBeNull();
    const policy = [...host.querySelectorAll('[data-slot="booking-policy"]')].filter(visible);
    expect(policy).toHaveLength(1);
    expect(policy[0]!.textContent).toContain("free up to 24 hours");
    expect(visible(btn("Reschedule"))).toBe(true);
    expect(visible(btn("Cancel booking"))).toBe(true);
    expect(host.querySelector('[data-slot="alert"]') && visible(host.querySelector('[data-slot="alert"]')!)).toBe(false);
  });

  it("moves the booking to the chosen time and fires reschedule", async () => {
    const host = await mount(rendered("booking-manage"));
    const root = host.querySelector<HTMLElement>('[data-slot="booking-manage"]')!;
    const events: { start: string; fail(m?: string): void }[] = [];
    root.addEventListener("reschedule", (e) => events.push((e as CustomEvent).detail));
    btn("Reschedule").click();
    await tick(300);
    const dlg = document.querySelector<HTMLElement>('[data-slot="dialog-content"]')!;
    expect(dlg.textContent).toContain("Choose a new time");
    const move = [...dlg.querySelectorAll("button")].find((b) => b.textContent!.trim() === "Move my booking")!;
    expect(move.disabled).toBe(true);
    dlg.querySelectorAll<HTMLButtonElement>('[data-slot="booking-slot"]')[0]!.click();
    await tick();
    expect(move.disabled).toBe(false);
    move.click();
    await tick(300);
    expect(events).toHaveLength(1);
    expect(events[0]!.start).toMatch(/^2026-10-04T\d\d:00$/);
    expect(visible(document.querySelector('[data-slot="dialog-content"]')!)).toBe(false);
    events[0]!.fail("Slot is gone");
    await tick(300);
    const again = document.querySelector<HTMLElement>('[data-slot="dialog-content"]')!;
    expect(visible(again)).toBe(true);
    expect(again.textContent).toContain("Slot is gone");
  });

  it("asks before cancelling, fires cancel-booking and can be put back", async () => {
    const host = await mount(rendered("booking-manage"));
    const root = host.querySelector<HTMLElement>('[data-slot="booking-manage"]')!;
    let fail: ((m?: string) => void) | undefined;
    root.addEventListener("cancel-booking", (e) => (fail = (e as CustomEvent).detail.fail));
    btn("Cancel booking").click();
    await tick(300);
    const dlg = document.querySelector<HTMLElement>('[data-slot="alert-dialog-content"]')!;
    expect(dlg.textContent).toContain("Cancel this booking?");
    expect(root.querySelector('[data-slot="booking-ticket"]')!.getAttribute("data-status")).toBe("confirmed");
    [...dlg.querySelectorAll("button")].find((b) => b.textContent!.trim() === "Yes, cancel it")!.click();
    await tick();
    expect(root.querySelector('[data-slot="booking-ticket"]')!.getAttribute("data-status")).toBe("cancelled");
    expect(visible(host.querySelector('[data-slot="alert"]')!)).toBe(true);
    expect(visible(btn("Reschedule"))).toBe(false);
    fail!("Offline");
    await tick();
    expect(root.querySelector('[data-slot="booking-ticket"]')!.getAttribute("data-status")).toBe("confirmed");
    expect([...host.querySelectorAll('p[role="alert"]')].some((p) => p.textContent === "Offline" && visible(p))).toBe(true);
  });
});
