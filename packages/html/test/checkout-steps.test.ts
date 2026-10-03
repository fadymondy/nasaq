// The Blade checkout-steps example (packages/php/examples/rendered/checkout-steps.html) under real Alpine.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import nasaq from "../src/alpine";
import { detectBrand, formatCardNumber, formatExpiry, isCardNumberValid, planTotal, validatePaymentForm, emptyPaymentForm } from "../src/alpine/checkout-steps";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = (ms = 40) => new Promise((r) => setTimeout(r, ms));

beforeAll(() => {
  Alpine.plugin(nasaq);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).Alpine = Alpine;
  Alpine.start();
});

afterEach(() => {
  vi.unstubAllGlobals();
  for (const el of [...document.body.children]) {
    Alpine.destroyTree(el as HTMLElement);
    el.remove();
  }
});

async function mount() {
  const host = document.createElement("div");
  host.innerHTML = rendered("checkout-steps");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

const root = (h: HTMLElement) => h.querySelector<HTMLElement>('[data-slot="checkout-steps"]')!;
const step = (h: HTMLElement) => root(h).getAttribute("data-step");
const visible = (el: Element) => (el as HTMLElement).style.display !== "none";
const button = (h: HTMLElement, text: string) => {
  const b = [...h.querySelectorAll<HTMLButtonElement>("button")].find((x) => visible(x) && x.textContent?.trim() === text);
  if (!b) throw new Error(`no visible button "${text}"`);
  return b;
};
const type = async (h: HTMLElement, name: string, value: string) => {
  const input = h.querySelector<HTMLInputElement>(`input[name="${name}"]`)!;
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await tick();
  return input;
};

describe("helpers", () => {
  it("planTotal, card format and validation", () => {
    expect(planTotal({ id: "a", name: "A", monthlyPrice: 10 }, "year")).toBe(120);
    expect(formatCardNumber("4111111111111111")).toBe("4111 1111 1111 1111");
    expect(formatExpiry("1230")).toBe("12/30");
    expect(detectBrand("4111111111111111")).toBe("visa");
    expect(isCardNumberValid("4111 1111 1111 1111")).toBe(true);
    const t = { required: "r", invalidCard: "c", invalidExpiry: "e", invalidCvc: "v" };
    expect(Object.keys(validatePaymentForm(emptyPaymentForm, t)).sort()).toEqual(["cvc", "expiry", "holder", "number"]);
  });
});

describe("checkout-steps (Blade example)", () => {
  it("starts on the plan step with the highlighted plan, USD amounts and a VAT line", async () => {
    const h = await mount();
    expect(step(h)).toBe("plan");
    expect(root(h).className).toContain("@container");
    const summary = h.querySelector('[data-slot="checkout-summary"]')!;
    expect(summary.textContent).toContain("Team");
    expect(summary.textContent).toContain("VAT");
    expect(summary.textContent).toContain("$56.35");
    expect(h.querySelectorAll('[data-slot="plan-card"]')).toHaveLength(2);
    expect(visible(button(h, "Selected"))).toBe(true);
    expect(button(h, "Selected").getAttribute("aria-pressed")).toBe("true");
    expect(h.querySelector('[data-slot="stepper-item"][data-status="current"]')).not.toBeNull();
  });

  it("switching to yearly shows the saving and the yearly total", async () => {
    const h = await mount();
    const yearly = [...h.querySelectorAll<HTMLButtonElement>('[data-slot="toggle"]')].find((b) => b.textContent?.includes("Yearly"))!;
    expect(yearly.textContent).toContain("Save 17%");
    yearly.click();
    await tick();
    expect(h.textContent).toContain("Billed $490.00 yearly");
    expect(h.querySelector('[data-slot="checkout-summary"]')!.textContent).toContain("$563.50");
  });

  it("validates billing, then payment, then the terms, then completes through the event", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    const h = await mount();
    const steps: string[] = [];
    root(h).addEventListener("nq-checkout-step", (e) => steps.push((e as CustomEvent).detail.step));

    button(h, "Continue").click();
    await tick();
    expect(step(h)).toBe("billing");
    button(h, "Continue").click();
    await tick();
    expect(step(h)).toBe("billing");
    expect([...h.querySelectorAll<HTMLElement>('[data-slot="field-error"]')].filter(visible).length).toBeGreaterThanOrEqual(4);
    expect(h.textContent).toContain("This field is required.");

    await type(h, "name", "Sara Ahmed");
    await type(h, "email", "not-an-email");
    await type(h, "address", "1 Main St");
    await type(h, "city", "Riyadh");
    button(h, "Continue").click();
    await tick();
    expect(h.textContent).toContain("Enter a valid email address.");
    await type(h, "email", "sara@example.com");
    button(h, "Continue").click();
    await tick();
    expect(step(h)).toBe("payment");

    button(h, "Continue").click();
    await tick();
    expect(step(h)).toBe("payment");

    const number = await type(h, "cc-number", "4111111111111111");
    expect(number.value).toBe("4111 1111 1111 1111");
    const brand = h.querySelector<HTMLElement>('[data-slot="payment-brand"]')!;
    expect(visible(brand)).toBe(true);
    expect(brand.textContent).toBe("Visa");
    await type(h, "cc-name", "Sara Ahmed");
    expect((await type(h, "cc-exp", "1230")).value).toBe("12/30");
    await type(h, "cc-csc", "123");
    button(h, "Continue").click();
    await tick();
    expect(step(h)).toBe("review");
    expect(h.textContent).toContain("Visa ending in");
    expect(h.textContent).toContain("1111");

    button(h, "Pay $56.35").click();
    await tick();
    expect(step(h)).toBe("review");
    expect(h.textContent).toContain("Accept the terms to continue.");

    h.querySelector<HTMLElement>('[role="checkbox"]')!.click();
    await tick();
    button(h, "Pay $56.35").click();
    await tick(80);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, { body: string }])[1].body);
    expect(body).toMatchObject({ planId: "team", interval: "month", currency: "USD", subtotal: 49, tax: 7.35, total: 56.35 });
    expect(body.payment).toMatchObject({ method: "card", brand: "visa", last4: "1111", holder: "Sara Ahmed" });
    expect(JSON.stringify(body)).not.toContain("4111 1111");
    expect(step(h)).toBe("success");
    expect(h.textContent).toContain("SUB-1042");
    expect(h.textContent).toContain("You are all set");
    expect(steps).toEqual(["billing", "payment", "review", "success"]);
  });

  it("stays on review and shows the message when the handler rejects", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new Error("Card declined"))));
    const h = await mount();
    // Jump to review by walking the form quickly through the component's own state.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = Alpine.$data(root(h)) as any;
    data.setStep("review");
    data.accepted = true;
    await tick();
    button(h, "Pay $56.35").click();
    await tick(80);
    expect(step(h)).toBe("review");
    const alert = h.querySelector<HTMLElement>('p[role="alert"]')!;
    expect(visible(alert)).toBe(true);
    expect(alert.textContent).toContain("Card declined");
  });

  it("treats an unhandled nq-checkout-complete as success", async () => {
    const h = document.createElement("div");
    h.innerHTML = rendered("checkout-steps").replace(/x-on:nq-checkout-complete\.prevent="[^"]*"/, "");
    document.body.append(h);
    Alpine.initTree(h);
    await tick();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = Alpine.$data(root(h)) as any;
    data.setStep("review");
    data.accepted = true;
    await tick();
    button(h, "Pay $56.35").click();
    await tick(80);
    expect(step(h)).toBe("success");
  });
});
