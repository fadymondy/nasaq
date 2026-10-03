import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NasaqProvider } from "../../provider";
import { h } from "vue";
import { NqProviderSwitcher, type ProviderCapability } from ".";

const CAPS: ProviderCapability[] = [
  { capability: "data", label: "Data", description: "Where records live", active: "postgres", options: ["postgres", { id: "sqlite", label: "SQLite", description: "File" }], isDefault: true },
  { capability: "queue", active: "redis", options: ["redis", "nats"], isDefault: false, locked: true },
];

afterEach(() => {
  document.body.innerHTML = "";
});

describe("NqProviderSwitcher", () => {
  it("renders a row per capability with the status chip and the active backend", async () => {
    const w = mount(NqProviderSwitcher, { props: { capabilities: CAPS, onSelect: () => {} }, attachTo: document.body });
    await flushPromises();
    expect(w.find('[data-slot="provider-switcher"]').classes()).toEqual(expect.arrayContaining(["rounded-card", "bg-card"]));
    const rows = w.findAll('[data-slot="provider-switcher-row"]');
    expect(rows.map((r) => r.attributes("data-capability"))).toEqual(["data", "queue"]);
    expect(rows[0]!.text()).toContain("Default");
    expect(rows[0]!.text()).toContain("Where records live");
    expect(rows[1]!.text()).toContain("Overridden");
    const triggers = w.findAll('[data-slot="provider-switcher-select"]');
    expect(triggers[0]!.attributes("aria-label")).toBe("Backend for Data");
    expect(triggers[0]!.text()).toBe("postgres");
    // locked row is disabled
    expect(triggers[1]!.attributes("disabled")).toBeDefined();
    w.unmount();
  });

  it("is read-only without a select handler", async () => {
    const w = mount(NqProviderSwitcher, { props: { capabilities: CAPS }, attachTo: document.body });
    await flushPromises();
    expect(w.find('[data-slot="provider-switcher-select"]').attributes("disabled")).toBeDefined();
    w.unmount();
  });

  it("shows the empty message, in Arabic under an Arabic provider", () => {
    const w = mount({ render: () => h(NasaqProvider, { locale: "ar", target: "scope" }, () => h(NqProviderSwitcher, { capabilities: [] })) });
    expect(w.text()).toContain("لا توجد قدرات قابلة للتبديل.");
  });

  it("calls select with the capability and backend and marks the row busy until it settles", async () => {
    let done!: () => void;
    const onSelect = vi.fn(() => new Promise<void>((r) => (done = r)));
    const w = mount(NqProviderSwitcher, { props: { capabilities: CAPS, onSelect }, attachTo: document.body });
    await flushPromises();
    const trigger = w.find('[data-slot="provider-switcher-select"]');
    await trigger.trigger("pointerdown", { button: 0, ctrlKey: false, pointerType: "mouse" });
    await flushPromises();
    const items = [...document.querySelectorAll<HTMLElement>('[data-slot="select-item"]')];
    expect(items.map((i) => i.textContent)).toEqual(expect.arrayContaining([expect.stringContaining("SQLite")]));
    items[1]!.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, button: 0, pointerType: "mouse" }));
    items[1]!.click();
    await flushPromises();
    expect(onSelect).toHaveBeenCalledWith("data", "sqlite");
    expect(w.find('[data-slot="provider-switcher-row"]').attributes("aria-busy")).toBe("true");
    done();
    await flushPromises();
    expect(w.find('[data-slot="provider-switcher-row"]').attributes("aria-busy")).toBeUndefined();
    w.unmount();
  });
});
