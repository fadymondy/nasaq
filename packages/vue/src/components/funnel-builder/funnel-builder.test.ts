import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EMPTY_FUNNEL, NqFunnelBuilder, type FunnelDefinition, type FunnelSource } from ".";

afterEach(() => {
  document.documentElement.lang = "en";
  document.documentElement.dir = "ltr";
  document.body.innerHTML = "";
});

const sources: FunnelSource[] = [
  { id: "home", kind: "page", label: "Home page", detail: "/" },
  { id: "signup", kind: "event", label: "Signed up", detail: "user_signed_up" },
];
const two: FunnelDefinition = {
  name: "Signup",
  window: { amount: 7, unit: "day" },
  steps: [
    { id: "home#1", sourceId: "home", kind: "page", label: "Home page", detail: "/" },
    { id: "signup#2", sourceId: "signup", kind: "event", label: "Signed up" },
  ],
};

describe("NqFunnelBuilder", () => {
  it("renders the card with the empty state", () => {
    const w = mount(NqFunnelBuilder, { props: { sources, onSave: async () => {}, class: "extra" } });
    expect(w.attributes("data-slot")).toBe("funnel-builder");
    expect(w.classes()).toContain("extra");
    expect(w.text()).toContain("Funnel builder");
    expect(w.text()).toContain("No steps yet");
    expect(EMPTY_FUNNEL.window.unit).toBe("day");
  });

  it("blocks saving without a name or two steps", async () => {
    const onSave = vi.fn(async () => {});
    const w = mount(NqFunnelBuilder, { props: { sources, onSave } });
    await w.find("form").trigger("submit");
    expect(onSave).not.toHaveBeenCalled();
    expect(w.text()).toContain("Give the funnel a name.");
    expect(w.text()).toContain("A funnel needs at least two steps.");
  });

  it("saves a valid funnel and shows the success message", async () => {
    const onSave = vi.fn(async () => {});
    const w = mount(NqFunnelBuilder, { props: { sources, onSave, defaultValue: two } });
    expect(w.findAll('[data-slot="funnel-builder-step"]')).toHaveLength(2);
    await w.find("form").trigger("submit");
    await flushPromises();
    expect(onSave).toHaveBeenCalledOnce();
    expect(w.text()).toContain("Funnel saved.");
  });

  it("reorders and removes steps", async () => {
    const onChange = vi.fn();
    const w = mount(NqFunnelBuilder, { props: { sources, onSave: async () => {}, defaultValue: two, onChange } });
    await w.find('[aria-label="Move Home page down"]').trigger("click");
    expect(onChange.mock.calls[0]![0].steps[0].label).toBe("Signed up");
    await w.find('[aria-label="Remove Signed up"]').trigger("click");
    expect(w.findAll('[data-slot="funnel-builder-step"]')).toHaveLength(1);
  });

  it("shows an error returned by onSave", async () => {
    const w = mount(NqFunnelBuilder, { props: { sources, defaultValue: two, onSave: async () => ({ error: "Name taken" }) } });
    await w.find("form").trigger("submit");
    await flushPromises();
    expect(w.text()).toContain("Name taken");
  });

  it("renders Arabic", () => {
    document.documentElement.lang = "ar";
    const w = mount(NqFunnelBuilder, { props: { sources, onSave: async () => {} } });
    expect(w.text()).toContain("منشئ القمع");
  });
});
