import { flushPromises, mount } from "@vue/test-utils";
import { Home, Users } from "lucide-vue-next";
import { afterEach, describe, expect, it } from "vitest";
import { NqIconRailSidebar } from ".";

const sections = [
  { id: "home", label: "Home", icon: Home, groups: [{ id: "g", items: [{ id: "dash", label: "Dashboard" }] }] },
  { id: "people", label: "People", icon: Users, groups: [{ id: "g", items: [{ id: "users", label: "Users" }, { id: "roles", label: "Roles" }] }] },
];

afterEach(() => {
  document.body.innerHTML = "";
});

describe("NqIconRailSidebar", () => {
  it("renders the rail and the active section's pages, and the default slot", () => {
    const w = mount(NqIconRailSidebar, { props: { sections, defaultValue: "people" }, slots: { default: "<main>Content</main>" }, attachTo: document.body });
    const rail = w.find('[data-slot="icon-rail"]');
    expect(rail.exists()).toBe(true);
    const buttons = rail.findAll("[data-rail-button]");
    expect(buttons).toHaveLength(2);
    expect(buttons[1]!.attributes("aria-current")).toBe("page");
    expect(w.text()).toContain("Users");
    expect(w.text()).toContain("Roles");
    expect(w.text()).not.toContain("Dashboard");
    expect(w.find("main").text()).toBe("Content");
    w.unmount();
  });

  it("picking a section switches the sub-sidebar and emits update:modelValue", async () => {
    const w = mount(NqIconRailSidebar, { props: { sections, defaultValue: "people" }, attachTo: document.body });
    await w.findAll("[data-rail-button]")[0]!.trigger("click");
    await flushPromises();
    expect(w.emitted("update:modelValue")![0]).toEqual(["home"]);
    expect(w.text()).toContain("Dashboard");
    w.unmount();
  });
});
