import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FeatureFlag } from "../feature-flags";
import { NqFeatureFlagDetail, NqFlagAuditHistory, type FlagAuditEntry } from ".";

afterEach(() => {
  document.documentElement.lang = "en";
  document.documentElement.dir = "ltr";
  document.body.innerHTML = "";
});

const environments = [
  { id: "dev", label: "Development" },
  { id: "prod", label: "Production" },
];
const fields = [{ id: "plan", label: "Plan", kind: "select" as const, options: [{ value: "pro", label: "Pro" }] }];
const flag: FeatureFlag = {
  key: "new-checkout",
  name: "New checkout",
  description: "The single-page checkout.",
  environments: { dev: { enabled: true, rollout: 100 }, prod: { enabled: true, rollout: 25 } },
  variants: [
    { key: "control", weight: 50 },
    { key: "single-page", weight: 50 },
  ],
  rules: [],
  updatedAt: "2026-09-28T10:00:00Z",
};
const audit: FlagAuditEntry[] = [
  { id: "1", action: "created", actor: "Mona", at: "2026-09-20T08:00:00Z" },
  { id: "2", action: "rollout", actor: "Omar", at: "2026-09-25T09:30:00Z", environment: "Production", from: "10", to: "25" },
];

describe("NqFeatureFlagDetail", () => {
  it("renders the header, state and tabs", () => {
    const w = mount(NqFeatureFlagDetail, { props: { flag, environments, fields, class: "extra" }, attachTo: document.body });
    expect(w.attributes("data-slot")).toBe("feature-flag-detail");
    expect(w.classes()).toContain("extra");
    expect(w.text()).toContain("New checkout");
    expect(w.text()).toContain("new-checkout");
    expect(w.text()).toContain("Rolling out");
    expect(w.findAll('[role="tab"]').map((x) => x.text())).toEqual(["Environments", "Targeting", "Variants", "History"]);
    expect(w.findAll('[data-slot="flag-environment"]')).toHaveLength(2);
    expect(w.find('[role="switch"]').attributes("aria-label")).toBe("Development: Enabled");
    w.unmount();
  });

  it("hides the kill switch without onKill and shows the killed banner with Restore", async () => {
    const w = mount(NqFeatureFlagDetail, { props: { flag, environments, fields }, attachTo: document.body });
    expect(w.text()).not.toContain("Kill switch");
    await w.setProps({ flag: { ...flag, killed: true }, onRestore: vi.fn(async () => {}) });
    expect(w.text()).toContain("This flag is killed");
    expect(w.text()).toContain("Restore");
    expect(w.text()).toContain("Killed");
    w.unmount();
  });

  it("calls onToggle from the switch and shows an error", async () => {
    const onToggle = vi.fn(async () => ({ error: "Nope" }));
    const w = mount(NqFeatureFlagDetail, { props: { flag, environments, fields, onToggle }, attachTo: document.body });
    await w.find('[role="switch"]').trigger("click");
    await flushPromises();
    expect(onToggle).toHaveBeenCalledWith("dev", false);
    expect(w.text()).toContain("Nope");
    w.unmount();
  });

  it("switches are read only without callbacks", () => {
    const w = mount(NqFeatureFlagDetail, { props: { flag, environments, fields }, attachTo: document.body });
    expect(w.find('[role="switch"]').attributes("disabled")).toBeDefined();
    w.unmount();
  });

  it("shows the variant shares and validates keys", async () => {
    const onVariantsChange = vi.fn(async () => {});
    const w = mount(NqFeatureFlagDetail, { props: { flag, environments, fields, onVariantsChange }, attachTo: document.body });
    await w.findAll('[role="tab"]')[2]!.trigger("mousedown");
    await w.findAll('[role="tab"]')[2]!.trigger("click");
    await flushPromises();
    const rows = w.findAll('[data-slot="flag-variant"]');
    expect(rows).toHaveLength(2);
    expect(rows[0]!.text()).toContain("50%");
    const key = rows[0]!.find("input");
    await key.setValue("Bad Key");
    expect(w.text()).toContain("Keys are lowercase");
    w.unmount();
  });

  it("renders Arabic strings", () => {
    document.documentElement.lang = "ar";
    const w = mount(NqFeatureFlagDetail, { props: { flag, environments, fields, labels: { tabHistory: "السجل" } }, attachTo: document.body });
    expect(w.text()).toContain("السجل");
    w.unmount();
  });
});

describe("NqFlagAuditHistory", () => {
  it("lists entries newest first", () => {
    const w = mount(NqFlagAuditHistory, { props: { entries: audit }, attachTo: document.body });
    const items = w.findAll('[data-slot="timeline-item"]');
    expect(w.attributes("data-slot")).toBe("flag-audit-history");
    expect(items[0]!.text()).toContain("Changed rollout in Production from 10% to 25%");
    expect(items[1]!.text()).toContain("Created the flag");
    w.unmount();
  });

  it("shows an empty state", () => {
    const w = mount(NqFlagAuditHistory, { props: { entries: [] }, attachTo: document.body });
    expect(w.text()).toContain("No changes recorded yet");
    w.unmount();
  });
});
