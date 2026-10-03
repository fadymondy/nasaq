import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { NasaqProvider } from "../../provider";
import { NqPosRegister, posDrawerSummary, posQuickTenders, posSettle, posVariance } from ".";

afterEach(() => {
  document.body.innerHTML = "";
});

const products = [
  { id: "esp", name: "Espresso", price: 1200, taxBps: 1500, category: "drinks", stock: 2, barcode: "6281000000011" },
  { id: "tea", name: "Mint tea", price: 800, category: "drinks" },
  { id: "cake", name: "Cheesecake", price: 2000, category: "food" },
];
const categories = [
  { id: "drinks", label: "Drinks" },
  { id: "food", label: "Food" },
];
const session = { id: "s1", cashier: "Lina", openedAt: "2026-09-01T08:00:00.000Z", openingFloat: 5000 };

describe("pos maths", () => {
  it("settles split tenders and gives change only from cash", () => {
    expect(posSettle(1000, [{ method: "card", amount: 400 }])).toMatchObject({ remaining: 600, settled: false });
    const s = posSettle(1000, [
      { method: "card", amount: 400 },
      { method: "cash", amount: 1000 },
    ]);
    expect(s.settled).toBe(true);
    expect(s.change).toBe(400);
  });
  it("summarises the drawer and variance", () => {
    const d = posDrawerSummary(5000, [{ method: "cash", total: 1000 }]);
    expect(d.expectedCash).toBe(6000);
    expect(posVariance(6000, 5900)).toBe(-100);
    expect(posQuickTenders(1000, "USD").length).toBeGreaterThan(0);
  });
});

describe("NqPosRegister", () => {
  it("shows the closed register and opens it with a float", async () => {
    const w = mount(NqPosRegister, { props: { products, categories, cashier: "Lina" }, attachTo: document.body });
    expect(w.attributes("data-slot")).toBe("pos-register");
    expect(w.attributes("data-state")).toBe("closed");
    const buttons = w.findAll("button");
    await buttons.find((b) => b.text() === "Open register")!.trigger("click");
    await nextTick();
    expect(w.attributes("data-state")).toBe("open");
    expect(w.emitted("update:session")![0]![0]).toMatchObject({ cashier: "Lina", openingFloat: 0 });
    w.unmount();
  });

  it("adds to the basket, honours stock and filters by category", async () => {
    const w = mount(NqPosRegister, { props: { products, categories, defaultSession: session }, attachTo: document.body });
    expect(w.attributes("data-state")).toBe("open");
    const tile = () => w.findAll("ul button").find((b) => b.text().includes("Espresso"))!;
    await tile().trigger("click");
    await tile().trigger("click");
    await nextTick();
    expect(tile().attributes("disabled")).toBeDefined();
    const line = w.find('[data-slot="pos-line"]');
    expect(line.exists()).toBe(true);
    expect(line.find("output").text()).toBe("2");
    await w.findAll("button").find((b) => b.text() === "Food")!.trigger("click");
    await nextTick();
    expect(w.text()).toContain("Cheesecake");
    expect(w.findAll("ul li button").some((b) => b.text().includes("Mint tea"))).toBe(false);
    w.unmount();
  });

  it("scans a barcode with Enter", async () => {
    const w = mount(NqPosRegister, { props: { products, defaultSession: session }, attachTo: document.body });
    const input = w.find("input");
    await input.setValue("6281000000011");
    await input.trigger("keydown", { key: "Enter" });
    await nextTick();
    expect(w.find('[data-slot="pos-line"]').text()).toContain("Espresso");
    expect((input.element as HTMLInputElement).value).toBe("");
    w.unmount();
  });

  it("parks and resumes a basket", async () => {
    const w = mount(NqPosRegister, { props: { products, defaultSession: session }, attachTo: document.body });
    await w.findAll("ul button").find((b) => b.text().includes("Mint tea"))!.trigger("click");
    await nextTick();
    await w.find('button[aria-label="Hold sale"]').trigger("click");
    await nextTick();
    const form = document.body.querySelector("form")!;
    form.dispatchEvent(new Event("submit", { cancelable: true }));
    await nextTick();
    expect(w.emitted("park")).toHaveLength(1);
    expect(w.emitted("update:parkedSales")![0]![0]).toHaveLength(1);
    expect(w.find('[data-slot="pos-line"]').exists()).toBe(false);
    w.unmount();
  });

  it("charges cash and reports the sale", async () => {
    const onCheckout = vi.fn();
    const w = mount(NqPosRegister, { props: { products, defaultSession: session, onCheckout }, attachTo: document.body });
    await w.findAll("ul button").find((b) => b.text().includes("Mint tea"))!.trigger("click");
    await nextTick();
    const charge = w.findAll("button").find((b) => b.text().startsWith("Charge"))!;
    await charge.trigger("click");
    await nextTick();
    const quick = [...document.body.querySelectorAll("button")].find((b) => b.textContent?.trim() === "Exact")!;
    quick.click();
    await nextTick();
    const form = document.body.querySelector("form")!;
    form.dispatchEvent(new Event("submit", { cancelable: true }));
    await vi.waitFor(() => expect(onCheckout).toHaveBeenCalledTimes(1));
    expect(onCheckout.mock.calls[0]![0]).toMatchObject({ number: "POS-1001", method: "cash", customerId: null });
    await vi.waitFor(() => expect(document.body.textContent).toContain("POS-1001"));
    w.unmount();
  });

  it("speaks Arabic", async () => {
    const host = mount(
      { components: { NasaqProvider, NqPosRegister }, template: '<NasaqProvider default-locale="ar"><NqPosRegister :products="p" :default-session="s" /></NasaqProvider>', data: () => ({ p: products, s: session }) },
      { attachTo: document.body },
    );
    await nextTick();
    expect(host.find('[data-slot="pos-register"]').exists()).toBe(true);
    expect(host.text()).toMatch(/[؀-ۿ]/);
    host.unmount();
  });
});
