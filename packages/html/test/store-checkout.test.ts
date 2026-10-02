// The Blade store-checkout example (packages/php/examples/rendered/store-checkout.html) under real Alpine.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";
import { storeCheckout } from "../src/alpine/store-checkout";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = (ms = 40) => new Promise((r) => setTimeout(r, ms));

beforeAll(() => {
  Alpine.plugin(nasaq);
  // The generated index adds the module; registering it here keeps the test independent of the coordinator's gen-index.
  storeCheckout(Alpine as never);
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
  host.innerHTML = rendered("store-checkout");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}
const root = (h: HTMLElement) => h.querySelector<HTMLElement>('[data-slot="store-checkout"]')!;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data = (h: HTMLElement) => Alpine.$data(root(h)) as any;
const states = (h: HTMLElement) => [...h.querySelectorAll<HTMLElement>('[data-slot="store-checkout-section"]')].map((s) => s.getAttribute("data-state"));
const visible = (el: Element | null) => !!el && (el as HTMLElement).style.display !== "none";
const listen = (el: HTMLElement, name: string, handler?: (detail: Record<string, unknown>) => void) => {
  const seen: Array<Record<string, unknown>> = [];
  el.addEventListener(name, (e) => {
    const detail = ((e as CustomEvent).detail ?? {}) as Record<string, unknown>;
    seen.push(detail);
    handler?.(detail);
  });
  return seen;
};

/** Gets through contact, address and delivery to the payment section (cash on delivery chosen). */
async function toPayment(h: HTMLElement) {
  const d = data(h);
  d.state.data.contact.email = "mona@example.com";
  await tick();
  d.next();
  await tick();
  d.next();
  await tick();
  d.state.data.shippingMethodId = "standard";
  await tick();
  d.next();
  await tick();
  d.state.data.payment = { ...d.state.data.payment, kind: "cod" };
  await tick();
  return d;
}

describe("store-checkout (Alpine)", () => {
  it("renders four sections, the first open, with the summary", async () => {
    const h = await mount();
    expect(root(h).getAttribute("data-status")).toBe("editing");
    expect(states(h)).toEqual(["open", "locked", "locked", "locked"]);
    const summary = h.querySelector('[data-slot="store-order-summary"]')!;
    expect(summary.textContent).toContain("Everyday cotton tee");
    expect(summary.textContent).toContain("$82");
    expect(h.querySelector('[data-slot="store-place-order"]')!.textContent).toContain("Place order");
  });

  it("blocks Continue on a missing email, then opens the address section", async () => {
    const h = await mount();
    const d = data(h);
    d.next();
    await tick();
    expect(states(h)[0]).toBe("open");
    expect(d.emailError).not.toBe("");
    const error = h.querySelector('[data-section="contact"] [data-slot="field-error"]') as HTMLElement;
    expect(visible(error)).toBe(true);
    const input = h.querySelector<HTMLInputElement>('input[name="email"]')!;
    input.value = "mona@example.com";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await tick();
    d.next();
    await tick();
    expect(states(h).slice(0, 2)).toEqual(["done", "open"]);
    expect(h.querySelector('[data-section="contact"]')!.textContent).toContain("mona@example.com");
  });

  it("changes the address fields with the country", async () => {
    const h = await mount();
    const d = data(h);
    d.savedChoice = "__new";
    await tick();
    d.state.data.shipping.country = "QA";
    await tick();
    const form = h.querySelector<HTMLElement>('[data-section="address"] [data-slot="store-address-form"]')!;
    expect(form.getAttribute("data-country")).toBe("QA");
    expect(visible(form.querySelector('input[name="shipping.postalCode"]')!.closest(".contents"))).toBe(false);
    d.state.data.shipping.country = "US";
    await tick();
    expect(visible(form.querySelector('input[name="shipping.postalCode"]')!.closest(".contents"))).toBe(true);
  });

  it("totals follow the shipping method and cash on delivery", async () => {
    const h = await mount();
    const d = await toPayment(h);
    expect(states(h)).toEqual(["done", "done", "done", "open"]);
    expect(d.summary.payable).toBe(8200 + 500 + 250);
    expect(h.querySelector('[data-slot="store-order-summary"]')!.textContent).toContain("Cash on delivery fee");
  });

  it("places the order and shows the confirmation", async () => {
    const h = await mount();
    const d = await toPayment(h);
    const place = listen(root(h), "nq-store-checkout-place");
    const placed = listen(root(h), "nq-store-checkout-placed");
    h.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await tick(80);
    expect(place).toHaveLength(1);
    expect((place[0]!.draft as { attempt: number }).attempt).toBe(1);
    expect(placed).toHaveLength(1);
    expect(root(h).getAttribute("data-status")).toBe("placed");
    const confirmation = h.querySelector('[data-slot="store-order-confirmation"]') as HTMLElement;
    expect(visible(confirmation)).toBe(true);
    expect(confirmation.textContent).toContain("#1001");
    expect(d.isPlaced).toBe(true);
  });

  it("shows a failure from a claimed place event, then retries", async () => {
    const h = await mount();
    await toPayment(h);
    let count = 0;
    listen(root(h), "nq-store-checkout-place", (detail) => {
      count += 1;
      if (count === 1) (detail.resolve as (r: unknown) => void)({ error: "Card declined" });
      else (detail.resolve as (r: unknown) => void)({ orderNumber: "#2002" });
    });
    const form = h.querySelector("form")!;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await tick(80);
    expect(root(h).getAttribute("data-status")).toBe("failed");
    expect(h.querySelector('[data-slot="alert"]')!.textContent).toContain("Card declined");
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await tick(80);
    expect(h.querySelector('[data-slot="store-order-confirmation"]')!.textContent).toContain("#2002");
  });

  it("keeps the transfer reference of an embedded local payment", async () => {
    const h = await mount();
    const d = data(h);
    root(h).dispatchEvent(new CustomEvent("nq-local-payment-submit", { bubbles: true, detail: { input: { methodId: "instapay", reference: "TR-1" } } }));
    await tick();
    expect(d.state.data.payment.localReference).toBe("TR-1");
  });
});
