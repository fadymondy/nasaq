import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { NasaqProvider } from "../../provider";
import { NqLoyaltyCard, NqPointsHistory, NqPromoCodeField, NqPromoCodeManager, NqVisitHistory, evaluatePromo, loyaltyTier, normalizePromoCode, type PromoCode } from ".";

afterEach(() => {
  document.body.innerHTML = "";
});

const tiers = [
  { id: "b", name: "Bronze", minPoints: 0 },
  { id: "s", name: "Silver", minPoints: 1000 },
];
const promos: PromoCode[] = [
  { id: "p1", code: "WELCOME10", type: "percent", value: 1000, used: 3, active: true },
  { id: "p2", code: "OLD", type: "fixed", value: 500, used: 1, endsOn: "2026-01-01", active: true },
];
const wrap = (locale: string, inner: string, setup: () => Record<string, unknown> = () => ({})) =>
  mount({ components: { NqLoyaltyCard, NqPointsHistory, NqPromoCodeField, NqPromoCodeManager, NqVisitHistory, NasaqProvider }, template: `<NasaqProvider default-locale="${locale}">${inner}</NasaqProvider>`, setup }, { attachTo: document.body });

describe("loyalty helpers", () => {
  it("finds tiers and checks promos", () => {
    expect(loyaltyTier(1200, tiers).tier?.name).toBe("Silver");
    expect(normalizePromoCode(" welcome10 ")).toBe("WELCOME10");
    const r = evaluatePromo(promos[0]!, { subtotal: 5000, today: "2026-09-29" });
    expect(r.valid && r.discount).toBe(500);
  });
});

describe("loyalty card", () => {
  it("shows name, balance and tier", () => {
    const c = wrap("en", `<NqLoyaltyCard name="Sara" :balance="1840" :tiers="tiers" member-code="NSQ-4821" />`, () => ({ tiers }));
    const t = c.text();
    expect(t).toContain("Sara");
    expect(t).toContain("1,840");
    expect(t).toContain("Silver");
    c.unmount();
  });
  it("renders Arabic", () => {
    const c = wrap("ar", `<NqLoyaltyCard name="سارة" :balance="1840" />`);
    expect(c.text()).toContain("سارة");
    c.unmount();
  });
});

describe("promo field", () => {
  it("shows the applied code", () => {
    const c = wrap("en", `<NqPromoCodeField :applied="{ code: 'WELCOME10', discount: 500 }" currency="USD" :on-remove="() => {}" />`);
    expect(c.find("[data-slot=promo-code-field][data-state=applied]").text()).toContain("WELCOME10");
    expect(c.text()).toContain("$5.00");
    c.unmount();
  });
  it("shows a server error", async () => {
    const c = wrap("en", `<NqPromoCodeField :on-apply="async () => ({ error: 'Nope' })" />`);
    await c.find("input").setValue("abc123");
    await c.find("form").trigger("submit");
    await new Promise((r) => setTimeout(r, 10));
    expect(c.text()).toContain("Nope");
    c.unmount();
  });
});

describe("history and manager", () => {
  it("lists points newest first", () => {
    const entries = [
      { id: "1", kind: "earn", points: 100, date: "2026-09-01", note: "Old" },
      { id: "2", kind: "redeem", points: -50, date: "2026-09-10", note: "New" },
    ];
    const c = wrap("en", `<NqPointsHistory :entries="entries" />`, () => ({ entries }));
    const li = c.findAll("li");
    expect(li[0]!.text()).toContain("New");
    c.unmount();
  });
  it("lists visits with totals", () => {
    const visits = [{ id: "v", date: "2026-09-20T10:00:00", place: "Downtown", spend: 4500, points: 45, status: "completed" }];
    const c = wrap("en", `<NqVisitHistory :visits="visits" currency="USD" />`, () => ({ visits }));
    expect(c.text()).toContain("Downtown");
    expect(c.text()).toContain("$45.00");
    c.unmount();
  });
  it("lists promo codes with their standing", () => {
    const c = wrap("en", `<NqPromoCodeManager :promos="promos" currency="USD" today="2026-09-29" :on-save="async () => {}" :on-delete="async () => {}" />`, () => ({ promos }));
    const t = c.text();
    expect(t).toContain("WELCOME10");
    expect(t).toContain("OLD");
    expect(t).toContain("10%");
    c.unmount();
  });
});
