import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NqOnboardingChecklist } from ".";

afterEach(() => {
  document.documentElement.lang = "en";
  document.documentElement.dir = "ltr";
  document.body.innerHTML = "";
});

const items = () => [
  { id: "profile", title: "Complete your profile", done: true },
  { id: "invite", title: "Invite a teammate", description: "Work is better together.", actionLabel: "Invite", onAction: vi.fn() },
  { id: "connect", title: "Connect GitHub", actionLabel: "Connect" },
];

describe("NqOnboardingChecklist", () => {
  it("shows progress and highlights the next item", () => {
    const w = mount(NqOnboardingChecklist, { props: { items: items(), class: "extra" } });
    expect(w.attributes("data-slot")).toBe("onboarding-checklist");
    expect(w.attributes("role")).toBe("region");
    expect(w.classes()).toContain("extra");
    expect(w.find('[data-slot="onboarding-checklist-count"]').text()).toBe("1 of 3 done");
    const lis = w.findAll("li");
    expect(lis[0]!.attributes("data-done")).toBeDefined();
    expect(lis[1]!.attributes("data-next")).toBeDefined();
    expect(lis[2]!.attributes("data-next")).toBeUndefined();
    expect(w.find('[role="progressbar"]').attributes("aria-valuenow")).toBe("33");
  });

  it("runs an item action and calls onDismiss", async () => {
    const list = items();
    const onDismiss = vi.fn();
    const w = mount(NqOnboardingChecklist, { props: { items: list, onDismiss } });
    await w.findAll("li")[1]!.find("button").trigger("click");
    await flushPromises();
    expect(list[1]!.onAction).toHaveBeenCalledOnce();
    await w.find('[aria-label="Dismiss the checklist"]').trigger("click");
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it("celebrates once everything is done and fires onComplete once", async () => {
    const onComplete = vi.fn();
    const w = mount(NqOnboardingChecklist, { props: { items: items(), onComplete, onDismiss: () => {} } });
    expect(onComplete).not.toHaveBeenCalled();
    await w.setProps({ items: items().map((i) => ({ ...i, done: true })) });
    expect(onComplete).toHaveBeenCalledOnce();
    expect(w.attributes("data-complete")).toBeDefined();
    expect(w.text()).toContain("You are all set");
    expect(w.find("ol").exists()).toBe(false);
  });

  it("renders Arabic", () => {
    document.documentElement.lang = "ar";
    const w = mount(NqOnboardingChecklist, { props: { items: items() } });
    expect(w.text()).toContain("ابدأ من هنا");
  });
});
