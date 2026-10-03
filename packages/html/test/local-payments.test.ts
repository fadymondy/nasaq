// The Blade local-payments example (packages/php/examples/rendered/local-payments.html) under real Alpine.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = (ms = 40) => new Promise((r) => setTimeout(r, ms));

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

async function mount() {
  const host = document.createElement("div");
  host.innerHTML = rendered("local-payments");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data = (el: Element) => Alpine.$data(el as HTMLElement) as any;
const card = (h: HTMLElement) => h.querySelector<HTMLElement>('[data-slot="local-payments"]')!;
const queue = (h: HTMLElement) => h.querySelector<HTMLElement>('[data-slot="payment-verification-queue"]')!;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const table = (h: HTMLElement) => Alpine.$data(queue(h).querySelector<HTMLElement>('[data-slot="data-table"]')!) as any;

describe("local-payments (Alpine)", () => {
  it("renders the method, its details and the USD total", async () => {
    const h = await mount();
    expect(card(h).getAttribute("data-status")).toBe("unpaid");
    expect(card(h).textContent).toContain("shop@instapay");
    expect(card(h).textContent).toContain("$12,500.00");
    expect(card(h).querySelector('[data-slot="copy-button"]')).toBeTruthy();
  });

  it("does not submit without a reference or receipt and says why", async () => {
    const h = await mount();
    let fired = 0;
    h.addEventListener("nq-local-payment-submit", () => fired++);
    await data(card(h)).submit();
    await tick();
    expect(fired).toBe(0);
    expect(data(card(h)).refMessage).toBe("Enter the transfer reference.");
    expect(data(card(h)).receiptInvalid).toBe(true);
    expect(card(h).querySelector('[data-slot="field-error"]')!.textContent).toContain("Enter the transfer reference.");
  });

  it("sends the normalised input, and a claimed submit switches to Receipt sent", async () => {
    const h = await mount();
    const seen: Array<Record<string, unknown>> = [];
    h.addEventListener("nq-local-payment-submit", ((e: CustomEvent) => {
      seen.push(e.detail.input);
      e.detail.waitUntil(Promise.resolve());
    }) as EventListener);
    const c = data(card(h));
    c.reference = " ab-1234 ";
    c.files = [{ id: "f1", file: new File(["x"], "receipt.png", { type: "image/png" }) }];
    await c.submit();
    await tick();
    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({ methodId: "instapay", reference: "AB-1234", amount: 1250000, fee: 0, total: 1250000 });
    expect((seen[0]!.receipt as File).name).toBe("receipt.png");
    expect(c.done).toBe(true);
    expect(card(h).querySelector('[data-slot="payment-verification-status"]')).toBeTruthy();
  });

  it("shows the message when the submit is rejected and stays on the form", async () => {
    const h = await mount();
    h.addEventListener("nq-local-payment-submit", ((e: CustomEvent) => e.detail.reject("Bank is offline")) as EventListener);
    const c = data(card(h));
    c.reference = "AB1234CD";
    c.files = [{ id: "f1", file: new File(["x"], "receipt.png", { type: "image/png" }) }];
    await c.submit();
    await tick();
    expect(c.done).toBe(false);
    expect(c.error).toBe("Bank is offline");
    expect(card(h).querySelector<HTMLElement>('p[role="alert"][x-text="error"]')!.textContent).toBe("Bank is offline");
  });
});

describe("payment verification queue (Alpine)", () => {
  it("verifies only open rows and claims the event", async () => {
    const h = await mount();
    const seen: string[] = [];
    h.addEventListener("nq-payment-verify", ((e: CustomEvent) => {
      seen.push(e.detail.submission.id);
      e.detail.resolve();
    }) as EventListener);
    const rows = table(h).pageRows;
    expect(rows.map((r: { id: string }) => r.id)).toEqual(["s1", "s2"]);
    table(h).act("verify", rows[1]);
    table(h).act("verify", rows[0]);
    await tick();
    expect(seen).toEqual(["s1"]);
    expect(data(queue(h)).busy).toBe(null);
  });

  it("shows the error when verify fails", async () => {
    const h = await mount();
    h.addEventListener("nq-payment-verify", ((e: CustomEvent) => e.detail.reject("Not found at the bank")) as EventListener);
    table(h).act("verify", table(h).pageRows[0]);
    await tick();
    expect(data(queue(h)).error).toBe("Not found at the bank");
  });

  it("rejects with a reason from the dialog", async () => {
    const h = await mount();
    const seen: Array<{ id: string; reason: string }> = [];
    h.addEventListener("nq-payment-reject", ((e: CustomEvent) => {
      seen.push({ id: e.detail.submission.id, reason: e.detail.reason });
      e.detail.resolve();
    }) as EventListener);
    const q = data(queue(h));
    table(h).act("reject", table(h).pageRows[0]);
    expect(q.rejecting.id).toBe("s1");
    expect(q.rejectText()).toBe("Mona Adel will be asked to send a new receipt.");
    await q.confirmReject();
    expect(seen).toEqual([]);
    q.reason = "  Amount differs ";
    await q.confirmReject();
    await tick();
    expect(seen).toEqual([{ id: "s1", reason: "Amount differs" }]);
    expect(q.rejecting).toBe(null);
  });
});
