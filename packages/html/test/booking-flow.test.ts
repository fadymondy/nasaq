// The Blade example (php/examples/booking-flow.blade.php) under real Alpine: the steps, the doctor filter, the times, the details check,
// the review and the confirmation ticket, plus the "booking-submit" event.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";
import { bookingFlow } from "../src/alpine/booking-flow";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms));

beforeAll(() => {
  Alpine.plugin(nasaq);
  // The generated index may not list this module yet; registering twice is harmless.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  bookingFlow(Alpine as any);
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

async function mount() {
  const host = document.createElement("div");
  host.innerHTML = rendered("booking-flow");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

const visible = (el: Element | null | undefined) => {
  for (let n = el as HTMLElement | null; n && n !== document.body; n = n.parentElement) if (n.style.display === "none") return false;
  return !!el;
};
const btn = (label: string) => [...document.querySelectorAll<HTMLButtonElement>("button")].filter(visible).find((b) => b.textContent!.trim().startsWith(label))!;
const radio = (label: string) => [...document.querySelectorAll<HTMLElement>('[role="radio"]')].filter(visible).find((r) => r.textContent!.includes(label))!;
const flow = (host: HTMLElement) => host.querySelector<HTMLElement>('[data-slot="booking-flow"]')!;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data = (host: HTMLElement) => Alpine.$data(flow(host)) as Record<string, any>;
const heading = () => [...document.querySelectorAll("h2")].find(visible)?.textContent?.trim();

function type(label: string, value: string) {
  const field = [...document.querySelectorAll('[data-slot="field"]')].filter(visible).find((f) => f.textContent!.includes(label))!;
  const input = field.querySelector<HTMLInputElement>("input")!;
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

async function toProvider() {
  radio("Riyadh clinic").click();
  await tick();
  btn("Continue").click();
  await tick();
  radio("Skin consultation").click();
  await tick();
  btn("Continue").click();
  await tick();
}

describe("booking-flow (Blade example)", () => {
  it("starts on the branch step with Continue disabled", async () => {
    const host = await mount();
    expect(flow(host).getAttribute("data-step")).toBe("location");
    expect(heading()).toBe("Where would you like to be seen?");
    expect(btn("Continue").disabled).toBe(true);
    expect(btn("Back").disabled).toBe(true);
    expect(host.querySelectorAll('[data-slot="stepper-item"]')).toHaveLength(8);
    expect(host.textContent).toContain("Nothing chosen yet.");
  });

  it("filters the doctors by the chosen service", async () => {
    const host = await mount();
    await toProvider();
    expect(flow(host).getAttribute("data-step")).toBe("provider");
    expect(radio("Dr. Huda Salem")).toBeTruthy();
    expect(radio("Dr. Omar Nasser")).toBeTruthy();
    expect(radio("First available doctor")).toBeTruthy();
    // The dermatologist offers only s2, the dentist takes any service.
    data(host).serviceId = "s1";
    await tick();
    expect(radio("Dr. Huda Salem")).toBeUndefined();
    expect(radio("Dr. Omar Nasser")).toBeTruthy();
    // One doctor left: "first available" is not offered.
    expect(radio("First available doctor")).toBeUndefined();
  });

  it("walks to the confirmation, fires booking-submit and resets", async () => {
    const host = await mount();
    const steps: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const submitted: { submission: Record<string, any>; done(c?: string): void }[] = [];
    flow(host).addEventListener("step-change", (e) => steps.push((e as CustomEvent).detail.step));
    flow(host).addEventListener("booking-submit", (e) => {
      e.preventDefault();
      submitted.push((e as CustomEvent).detail);
    });
    await toProvider();
    radio("Dr. Huda Salem").click();
    await tick();
    btn("Continue").click();
    await tick(60);
    expect(flow(host).getAttribute("data-step")).toBe("time");
    const slots = [...document.querySelectorAll<HTMLButtonElement>('[data-slot="booking-slot"]')].filter(visible);
    expect(slots.length).toBe(5);
    slots[1]!.click();
    await tick();
    expect(slots[1]!.getAttribute("aria-checked")).toBe("true");
    btn("Continue").click();
    await tick();

    // Details: Continue shows the errors first.
    expect(flow(host).getAttribute("data-step")).toBe("details");
    btn("Continue").click();
    await tick();
    expect(flow(host).getAttribute("data-step")).toBe("details");
    expect([...document.querySelectorAll('[data-slot="field-error"]')].filter(visible).map((e) => e.textContent!.trim())).toContain("This field is required.");
    type("Full name", "Huda Salem");
    type("Mobile number", "+966 50 123 4567");
    await tick();
    btn("Continue").click();
    await tick();
    btn("Continue").click(); // notes
    await tick();
    btn("Continue").click(); // payment
    await tick();
    expect(flow(host).getAttribute("data-step")).toBe("review");
    expect(host.textContent).toContain("Huda Salem");
    expect(host.textContent).toContain("Pay at the visit");

    btn("Confirm booking").click();
    await tick();
    expect(submitted).toHaveLength(1);
    expect(submitted[0]!.submission.serviceId).toBe("s2");
    expect(submitted[0]!.submission.providerId).toBe("p2");
    expect(flow(host).getAttribute("data-state")).toBeNull();
    submitted[0]!.done("NQ-4821");
    await tick();
    expect(flow(host).getAttribute("data-state")).toBe("confirmed");
    const ticket = host.querySelector('[data-slot="booking-ticket"]')!;
    expect(ticket.getAttribute("data-status")).toBe("requested");
    expect(ticket.textContent).toContain("NQ-4821");
    expect(ticket.textContent).toContain("Skin consultation");
    expect(steps).toContain("review");

    let reset = 0;
    flow(host).addEventListener("reset", () => reset++);
    btn("Book another visit").click();
    await tick();
    expect(reset).toBe(1);
    expect(flow(host).getAttribute("data-step")).toBe("location");
    expect(data(host).record).toBeNull();
  });

  it("stays on the review step when the host fails the submit", async () => {
    const host = await mount();
    flow(host).addEventListener("booking-submit", (e) => {
      e.preventDefault();
      (e as CustomEvent).detail.fail("Slot taken.");
    });
    const d = data(host);
    for (const patch of [{ locationId: "l1" }, { serviceId: "s1" }, { providerId: "p1" }]) {
      Object.assign(d, patch);
      await tick();
    }
    await tick();
    d.startKey = "2026-09-30T10:00";
    d.details.name = "Huda";
    d.details.phone = "+966501234567";
    d.index = 7;
    await tick();
    btn("Confirm booking").click();
    await tick();
    expect(flow(host).getAttribute("data-step")).toBe("review");
    expect(host.textContent).toContain("Slot taken.");
    expect(d.record).toBeNull();
  });
});
