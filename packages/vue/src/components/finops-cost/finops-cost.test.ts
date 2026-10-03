import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NasaqProvider } from "../../provider";
import { finopsBudgetState, finopsRightsize, finopsTotals, NqFinopsCost } from ".";

afterEach(() => {
  document.documentElement.lang = "en";
  document.documentElement.dir = "ltr";
  document.body.innerHTML = "";
});

const servers = [
  { id: "s1", name: "web-1", plan: "CPX31", region: "fsn1", monthlyPrice: 15, usage: { cpu: 10, memory: 15, disk: 40 }, smallerPlan: { name: "CPX21", monthlyPrice: 8 } },
  { id: "s2", name: "db-1", plan: "CPX41", monthlyPrice: 28, usage: { cpu: 50, memory: 50, disk: 40 } },
];
const items = [{ id: "i1", name: "Backups", category: "Storage", amount: 6, period: "monthly" as const }];

describe("finops helpers", () => {
  it("computes totals, hints and budget state", () => {
    expect(finopsTotals(servers, items).total).toBe(49);
    expect(finopsRightsize({ cpu: 10, memory: 10, disk: 10 }, 15, { name: "x", monthlyPrice: 8 }).kind).toBe("downsize");
    expect(finopsBudgetState(95, 100)).toBe("near");
  });
});

describe("NqFinopsCost", () => {
  it("renders tiles, budget, servers and items", () => {
    const w = mount(NqFinopsCost, { props: { servers, items, budget: 60, class: "extra" } });
    expect(w.attributes("data-slot")).toBe("finops-cost");
    expect(w.classes()).toContain("extra");
    expect(w.text()).toContain("$49.00");
    expect(w.find('[data-slot="finops-budget"]').exists()).toBe(true);
    expect(w.find('[data-slot="finops-servers"]').text()).toContain("web-1");
    expect(w.find('[data-slot="finops-items"]').text()).toContain("Backups");
    expect(w.find('[data-slot="finops-servers"]').text()).toContain("Could be smaller");
  });

  it("hides add and remove without handlers and shows add with one", () => {
    expect(mount(NqFinopsCost, { props: { servers, items } }).text()).not.toContain("Add item");
    const w = mount(NqFinopsCost, { props: { servers, items, onAddItem: vi.fn() } });
    expect(w.text()).toContain("Add item");
  });

  it("shows the error and retries", async () => {
    const onRetry = vi.fn();
    const w = mount(NqFinopsCost, { props: { servers, error: "Boom", onRetry } });
    expect(w.text()).toContain("Boom");
    await w.findAll("button").find((b) => b.text() === "Try again" || b.text() === "Retry")?.trigger("click");
    await flushPromises();
  });

  it("is Arabic inside an Arabic provider", () => {
    const w = mount({ components: { NasaqProvider, NqFinopsCost }, setup: () => ({ servers }), template: '<NasaqProvider locale="ar"><NqFinopsCost :servers="servers" /></NasaqProvider>' });
    expect(w.text()).toContain("التكاليف");
    w.unmount();
  });
});
