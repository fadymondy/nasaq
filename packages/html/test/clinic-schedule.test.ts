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

const visible = (el: Element | null) => !!el && (el as HTMLElement).style.display !== "none";

describe("clinic-schedule (Blade example)", () => {
  it("shows the day, the summary, the visit in progress and the next patient", async () => {
    const host = await mount(rendered("clinic-schedule"));
    const root = host.querySelector<HTMLElement>('[data-slot="clinic-schedule"]')!;
    expect(root.querySelector('[data-slot="scheduler"]')!.getAttribute("data-view")).toBe("day");
    const blocks = [...root.querySelectorAll<HTMLElement>('[data-slot="scheduler-event"]')];
    expect(blocks).toHaveLength(6);
    expect(blocks[1]!.textContent).toContain("Omar Nasser · In visit");
    expect(root.textContent).toContain("Today at a glance");
    expect(root.querySelector('[data-slot="clinic-current"]')!.textContent).toContain("Omar Nasser");
    const next = root.querySelector('[data-slot="clinic-next"]')!;
    expect(next.textContent).toContain("Sara Khalil");
    expect(next.textContent).toContain("Follow-up");
    expect(next.textContent).toContain("Room 2");
    // The next card shows only the badge for the next patient's status.
    const badges = [...next.querySelectorAll<HTMLElement>('[data-slot="booking-status-badge"]')].filter((b) => visible(b.parentElement));
    expect(badges.map((b) => b.dataset.status)).toEqual(["checked_in"]);
  });

  it("counts per status and warns about the overlap", async () => {
    const host = await mount(rendered("clinic-schedule"));
    const legend = [...host.querySelectorAll<HTMLElement>("ul[aria-label] > li")].filter((li) => visible(li));
    expect(legend.map((li) => li.querySelector<HTMLElement>('[data-slot="booking-status-badge"]')!.dataset.status)).toEqual(["requested", "confirmed", "checked_in", "in_visit", "done", "cancelled"]);
    const alert = host.querySelector<HTMLElement>('[data-slot="alert"]')!;
    expect(visible(alert)).toBe(true);
    expect(alert.textContent).toContain("1 pair of appointments overlaps.");
    expect(host.querySelector('[data-slot="clinic-schedule"] dl')!.textContent).toMatch(/Booked\s*6/);
  });

  it("follows the scheduler's day and reports select", async () => {
    const host = await mount(rendered("clinic-schedule"));
    const root = host.querySelector<HTMLElement>('[data-slot="clinic-schedule"]')!;
    const picked: string[] = [];
    root.addEventListener("select", (e) => picked.push((e as CustomEvent).detail.id));
    root.querySelectorAll<HTMLElement>('[data-slot="scheduler-event"]')[0]!.click();
    const open = [...root.querySelectorAll<HTMLButtonElement>("button")].filter((b) => b.textContent!.trim() === "Open");
    open.find((b) => visible(b.closest('[data-slot="clinic-next"]')))!.click();
    expect(picked).toEqual(["a1", "a3"]);
    // Next day: no appointments.
    const nextDay = root.querySelector<HTMLElement>('[data-slot="scheduler-toolbar"] button[aria-label="Next day"]')!;
    nextDay.click();
    await tick();
    expect(visible(root.querySelector('p.mt-3'))).toBe(true);
    expect(visible(root.querySelector('[data-slot="clinic-current"]')!.parentElement)).toBe(false);
    expect(visible(root.querySelector('[data-slot="alert"]'))).toBe(false);
    expect(root.querySelector('[data-slot="clinic-next"]')!.textContent).toContain("No one is waiting.");
  });
});
