import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { evaluateFlag, flagState, NqFeatureFlagList, type FeatureFlag } from ".";

afterEach(() => {
  document.documentElement.lang = "en";
  document.documentElement.dir = "ltr";
  document.body.innerHTML = "";
});

const environments = [
  { id: "dev", label: "Development" },
  { id: "prod", label: "Production" },
];
const flags: FeatureFlag[] = [
  { key: "new-checkout", name: "New checkout", environments: { dev: { enabled: true, rollout: 100 }, prod: { enabled: true, rollout: 25 } }, variants: [], rules: [], updatedAt: "2026-09-28T10:00:00Z", updatedBy: "Mona" },
  { key: "dark-mode", name: "Dark mode", killed: true, environments: { dev: { enabled: true, rollout: 100 }, prod: { enabled: false, rollout: 0 } }, variants: [], rules: [], updatedAt: "2026-09-20T10:00:00Z" },
];

describe("flag model", () => {
  it("derives state and evaluates deterministically", () => {
    expect(flagState(flags[0]!, "prod")).toBe("partial");
    expect(flagState(flags[1]!, "dev")).toBe("killed");
    const a = evaluateFlag(flags[0]!, "dev", { userId: "u1" });
    expect(a.on).toBe(true);
  });
});

describe("NqFeatureFlagList", () => {
  it("renders the card, a row per flag and the state", () => {
    const w = mount(NqFeatureFlagList, { props: { flags, environments, class: "extra" }, attachTo: document.body });
    expect(w.attributes("data-slot")).toBe("feature-flag-list");
    expect(w.classes()).toContain("extra");
    expect(w.text()).toContain("Feature flags");
    expect(w.text()).toContain("New checkout");
    expect(w.text()).toContain("new-checkout");
    expect(w.text()).toContain("Rolling out");
    expect(w.text()).toContain("Killed");
    w.unmount();
  });

  it("calls onToggle from the switch", async () => {
    const onToggle = vi.fn(async () => {});
    const w = mount(NqFeatureFlagList, { props: { flags, environments, onToggle }, attachTo: document.body });
    const sw = w.find('[role="switch"]');
    expect(sw.exists()).toBe(true);
    await sw.trigger("click");
    await flushPromises();
    expect(onToggle).toHaveBeenCalled();
    w.unmount();
  });

  it("shows Arabic strings under lang=ar", () => {
    document.documentElement.lang = "ar";
    const w = mount(NqFeatureFlagList, { props: { flags, environments } });
    expect(w.text()).toContain("مفاتيح الميزات");
    w.unmount();
  });
});
