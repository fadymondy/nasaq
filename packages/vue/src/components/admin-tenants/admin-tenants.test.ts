import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NasaqProvider } from "../../provider";
import { NqAdminPlans, NqAdminWorkspaces, adminTenantsAttempt, type AdminPlan, type AdminWorkspace } from ".";

afterEach(() => {
  document.body.innerHTML = "";
  document.documentElement.lang = "en";
  document.documentElement.dir = "ltr";
});

const plans: AdminPlan[] = [
  { id: "free", name: "Free", priceMonthly: 0, seats: 3, storageGb: 1, features: [], visible: true, subscribers: 1 },
  { id: "team", name: "Team", priceMonthly: 29, seats: 15, storageGb: null, features: ["Audit log"], visible: false, subscribers: 2, featured: true },
];
const workspaces: AdminWorkspace[] = [
  { id: "w1", name: "Acme Co", slug: "acme", owner: { name: "Sara", email: "sara@acme.test" }, planId: "team", status: "active", seatsUsed: 12, createdAt: "2026-03-02" },
  { id: "w2", name: "Globex", slug: "globex", owner: { name: "Omar", email: "omar@globex.test" }, planId: "free", status: "trial", seatsUsed: 3, createdAt: "2026-09-20", trialEndsAt: "2026-10-04" },
  { id: "w3", name: "Initech", slug: "initech", owner: { name: "Lina", email: "lina@initech.test" }, planId: "free", status: "suspended", seatsUsed: 2, createdAt: "2026-01-11" },
];

describe("adminTenantsAttempt", () => {
  it("returns null on success, the error text on { error }, and an empty string on a throw", async () => {
    expect(await adminTenantsAttempt(() => undefined)).toBeNull();
    expect(await adminTenantsAttempt(() => ({ error: "No" }))).toBe("No");
    expect(await adminTenantsAttempt(() => Promise.reject(new Error("x")))).toBe("");
  });
});

describe("NqAdminWorkspaces", () => {
  it("renders the stats, the rows with plan, seats and status", () => {
    const w = mount(NqAdminWorkspaces, { props: { workspaces, plans }, attachTo: document.body });
    expect(w.attributes("data-slot")).toBe("admin-workspaces");
    expect(w.findAll('[data-slot="stat-card"]')).toHaveLength(4);
    expect(w.text()).toContain("Acme Co");
    expect(w.text()).toContain("12 of 15 seats");
    expect(w.text()).toContain("Trial ends");
    expect(w.find('[data-slot="meter"]').exists()).toBe(true);
    w.unmount();
  });

  it("hides the stats on request and shows the empty state", () => {
    const w = mount(NqAdminWorkspaces, { props: { workspaces: [], plans, hideStats: true }, attachTo: document.body });
    expect(w.find('[data-slot="stat-card"]').exists()).toBe(false);
    expect(w.text()).toContain("No workspaces yet");
    w.unmount();
  });

  it("offers row actions per status and reactivates a suspended workspace", async () => {
    const onSetSuspended = vi.fn().mockResolvedValue(undefined);
    const w = mount(NqAdminWorkspaces, { props: { workspaces, plans, onSetSuspended, onChangePlan: vi.fn(), onOpen: vi.fn() }, attachTo: document.body });
    const row = w.findAll("tbody tr").find((r) => r.text().includes("Initech"))!;
    await row.trigger("contextmenu");
    await flushPromises();
    const item = [...document.body.querySelectorAll('[role="menuitem"]')].find((i) => i.textContent?.includes("Reactivate")) as HTMLElement;
    expect(item).toBeTruthy();
    expect([...document.body.querySelectorAll('[role="menuitem"]')].map((i) => i.textContent?.trim())).toEqual(expect.arrayContaining(["Open workspace", "Change plan…"]));
    item.click();
    await flushPromises();
    expect(onSetSuspended).toHaveBeenCalledWith(expect.objectContaining({ id: "w3" }), false);
    expect(w.text()).toContain("Initech was reactivated.");
    w.unmount();
  });

  it("speaks Arabic under an Arabic provider", () => {
    const w = mount(
      { components: { NqAdminWorkspaces, NasaqProvider }, setup: () => ({ workspaces, plans }), template: `<NasaqProvider locale="ar"><NqAdminWorkspaces :workspaces="workspaces" :plans="plans" /></NasaqProvider>` },
      { attachTo: document.body },
    );
    expect(w.text()).toContain("مساحات العمل");
    expect(w.text()).toContain("الإيراد الشهري");
    w.unmount();
  });
});

describe("NqAdminPlans", () => {
  it("renders a card per plan with limits, the hidden badge and the subscriber count", () => {
    const w = mount(NqAdminPlans, { props: { plans }, attachTo: document.body });
    expect(w.findAll('[data-slot="plan-card"]')).toHaveLength(2);
    expect(w.text()).toContain("Up to 3 seats");
    expect(w.text()).toContain("Unlimited storage");
    expect(w.text()).toContain("Hidden");
    expect(w.text()).toContain("2 workspaces");
    expect(w.find("button").exists()).toBe(false);
    w.unmount();
  });

  it("validates the plan dialog, then saves a new plan", async () => {
    const onSavePlan = vi.fn().mockResolvedValue(undefined);
    const w = mount(NqAdminPlans, { props: { plans, onSavePlan }, attachTo: document.body });
    await w.findAll("button").find((b) => b.text().includes("New plan"))!.trigger("click");
    await flushPromises();
    const form = document.body.querySelector("form")!;
    form.dispatchEvent(new Event("submit", { cancelable: true }));
    await flushPromises();
    expect(document.body.textContent).toContain("Enter a plan name.");
    expect(onSavePlan).not.toHaveBeenCalled();
    const name = document.body.querySelector("form input") as HTMLInputElement;
    name.value = "Pro";
    name.dispatchEvent(new Event("input"));
    form.dispatchEvent(new Event("submit", { cancelable: true }));
    await flushPromises();
    expect(onSavePlan).toHaveBeenCalledWith(expect.objectContaining({ name: "Pro", priceMonthly: 0, seats: null, storageGb: null, visible: true, currency: "USD" }));
    expect(w.text()).toContain("Pro was created.");
    w.unmount();
  });

  it("keeps the dialog open and shows the error when saving fails", async () => {
    const onSavePlan = vi.fn().mockResolvedValue({ error: "Name taken" });
    const w = mount(NqAdminPlans, { props: { plans, onSavePlan }, attachTo: document.body });
    await w.findAll("button").find((b) => b.text().includes("Edit plan"))!.trigger("click");
    await flushPromises();
    document.body.querySelector("form")!.dispatchEvent(new Event("submit", { cancelable: true }));
    await flushPromises();
    expect(document.body.textContent).toContain("Name taken");
    expect(document.body.querySelector("form")).toBeTruthy();
    w.unmount();
  });
});
