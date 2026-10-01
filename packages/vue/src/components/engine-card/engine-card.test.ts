import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { NqEngineCard, NqEngineCardGrid, engineTone } from ".";
import { NasaqProvider } from "../../provider";

const NOW = "2026-09-29T10:00:00Z";
const hydration = { engine: "hydration", state: "cooldown", totalMl: 750, dailyCapMl: 5000, unitMl: 250, unitsLogged: 3, unitsTotal: 20, nextAllowedAt: "2026-09-29T10:00:30Z" } as const;

describe("NqEngineCard", () => {
  it("renders the hydration card with state attributes and the countdown on the button", () => {
    const w = mount(NqEngineCard, { props: { snapshot: hydration, now: NOW, onAction: async () => undefined, class: "extra" } });
    expect(w.attributes("data-slot")).toBe("engine-card");
    expect(w.attributes("data-engine")).toBe("hydration");
    expect(w.attributes("data-state")).toBe("cooldown");
    expect(w.attributes("data-tone")).toBe("info");
    expect(w.classes()).toContain("extra");
    expect(w.find("h3").text()).toBe("Hydration");
    expect(w.attributes("aria-labelledby")).toBe(w.find("h3").attributes("id"));
    expect(w.find('[data-slot="engine-card-state"]').text()).toContain("Cooling down");
    expect(w.find('[data-slot="meter"]').attributes("aria-valuenow")).toBe("3");
    expect(w.findAll('[data-slot="engine-card-units"] li')).toHaveLength(20);
    const btn = w.find('[data-slot="button"]');
    expect(btn.text()).toContain("Wait");
    expect(btn.attributes("disabled")).toBeDefined();
  });

  it("runs the action, shows the server error, and clears it on the next run", async () => {
    const onAction = vi.fn().mockResolvedValueOnce({ error: "Too soon" }).mockResolvedValueOnce(undefined);
    const w = mount(NqEngineCard, { props: { snapshot: { ...hydration, state: "idle", nextAllowedAt: undefined }, now: NOW, onAction } });
    await w.find('[data-slot="button"]').trigger("click");
    await flushPromises();
    expect(onAction).toHaveBeenCalledWith({ engine: "hydration", kind: "log_unit" });
    expect(w.find('[data-slot="engine-card-error"]').text()).toBe("Too soon");
    await w.find('[data-slot="button"]').trigger("click");
    await flushPromises();
    expect(w.find('[data-slot="engine-card-error"]').exists()).toBe(false);
  });

  it("draws no footer without an action or link, and a details link with one", () => {
    const quiet = mount(NqEngineCard, { props: { snapshot: hydration, now: NOW } });
    expect(quiet.find('[data-slot="card-footer"]').exists()).toBe(false);
    const linked = mount(NqEngineCard, { props: { snapshot: hydration, now: NOW, detailHref: "/engines/hydration" } });
    const a = linked.find('[data-slot="engine-card-details"]');
    expect(a.attributes("href")).toBe("/engines/hydration");
    expect(a.find("svg").classes()).toContain("rtl:-scale-x-100");
  });

  it("lists medication doses and offers Log dose only for open or missed ones", async () => {
    const onAction = vi.fn().mockResolvedValue(undefined);
    const snapshot = {
      engine: "medication",
      graceMinutes: 60,
      doses: [
        { id: "a", name: "Morning", scheduledFor: "2026-09-29T08:00:00Z", status: "logged" },
        { id: "b", name: "Noon", scheduledFor: "2026-09-29T09:30:00Z", status: "grace_open" },
      ],
    } as const;
    const w = mount(NqEngineCard, { props: { snapshot, now: NOW, onAction } });
    expect(w.attributes("data-state")).toBe("grace_open");
    expect(w.findAll('[data-slot="engine-card-doses"] li')).toHaveLength(2);
    const log = w.findAll('[data-slot="engine-card-doses"] [data-slot="button"]');
    expect(log).toHaveLength(1);
    await log[0]!.trigger("click");
    expect(onAction).toHaveBeenCalledWith({ engine: "medication", kind: "log_dose", doseId: "b" });
  });

  it("speaks Arabic and shows the skeleton while loading", () => {
    const w = mount({ components: { NasaqProvider, NqEngineCard }, template: '<NasaqProvider locale="ar"><NqEngineCard :snapshot="s" :now="now" /></NasaqProvider>', data: () => ({ s: hydration, now: NOW }) });
    expect(w.text()).toContain("شرب الماء");
    const loading = mount(NqEngineCard, { props: { snapshot: hydration, loading: true } });
    expect(loading.attributes("aria-busy")).toBe("true");
    expect(loading.find('[data-slot="engine-card-skeleton"]').exists()).toBe(true);
  });

  it("maps every state to a tone and grids its children", () => {
    expect(engineTone({ engine: "contraceptive", state: "overdue", daysOverdue: 2 })).toBe("danger");
    const g = mount(NqEngineCardGrid, { slots: { default: "<i />" } });
    expect(g.attributes("data-slot")).toBe("engine-card-grid");
  });
});
