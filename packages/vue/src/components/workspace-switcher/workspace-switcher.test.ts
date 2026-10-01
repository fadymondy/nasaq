import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { NqWorkspaceSwitcher } from ".";

const workspaces = [
  { id: "3x1", name: "3x1", description: "Pro · 12 members" },
  { id: "personal", name: "Fady Mondy", description: "Personal" },
];

afterEach(() => {
  document.body.innerHTML = "";
});

describe("NqWorkspaceSwitcher", () => {
  it("shows the active workspace with its description", () => {
    const w = mount(NqWorkspaceSwitcher, { props: { workspaces, modelValue: "3x1" }, attachTo: document.body });
    const trigger = w.find('[data-slot="workspace-switcher"]');
    expect(trigger.text()).toContain("3x1");
    expect(trigger.text()).toContain("Pro · 12 members");
    w.unmount();
  });

  it("lists workspaces, marks the current one and emits update:modelValue", async () => {
    const w = mount(NqWorkspaceSwitcher, { props: { workspaces, modelValue: "3x1", onCreate: () => {} }, attachTo: document.body });
    await w.find('[data-slot="workspace-switcher"]').trigger("click", { button: 0, ctrlKey: false });
    await flushPromises();
    const items = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')];
    const labels = items.map((i) => i.textContent?.trim() ?? "");
    for (const name of ["3x1", "Fady Mondy", "Add workspace"]) expect(labels.some((l) => l.includes(name))).toBe(true);
    expect(items[0]!.getAttribute("aria-current")).toBe("true");
    items[1]!.click();
    await flushPromises();
    expect(w.emitted("update:modelValue")![0]).toEqual(["personal"]);
    w.unmount();
  });
});
