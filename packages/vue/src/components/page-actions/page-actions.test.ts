import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";
import { CommandRegistry, provideCommands } from "../commands";
import { NqPageActions } from ".";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("NqPageActions", () => {
  it("renders a primary button and a more menu trigger", async () => {
    let hit = 0;
    const w = mount(NqPageActions, {
      props: { primary: { id: "p.new", label: "New issue", onSelect: () => hit++ }, actions: [{ id: "p.export", label: "Export" }] },
      attachTo: document.body,
    });
    expect(w.find('[data-slot="page-actions"]').exists()).toBe(true);
    const buttons = w.findAll("button");
    expect(buttons).toHaveLength(2);
    expect(buttons[0]!.attributes("aria-label")).toBe("More actions");
    await buttons[1]!.trigger("click");
    expect(hit).toBe(1);
    w.unmount();
  });

  it("omits the menu when there are no extra actions", () => {
    const w = mount(NqPageActions, { props: { primary: { id: "p.new", label: "New" } } });
    expect(w.findAll("button")).toHaveLength(1);
  });

  it("opens the menu with groups, a separator and a danger item", async () => {
    const w = mount(NqPageActions, {
      props: {
        actions: [
          { id: "a", label: "Export", shortcut: "Mod E" },
          { id: "b", label: "Delete", danger: true, group: "danger" },
        ],
      },
      attachTo: document.body,
    });
    const trigger = w.find('button[aria-label="More actions"]');
    await trigger.trigger("click", { button: 0, ctrlKey: false });
    await flushPromises();
    const items = document.querySelectorAll('[data-slot="dropdown-menu-item"]');
    expect(items).toHaveLength(2);
    expect(document.querySelectorAll('[data-slot="dropdown-menu-separator"]')).toHaveLength(1);
    expect(items[1]!.getAttribute("data-variant")).toBe("danger");
    expect(items[0]!.querySelector('[data-slot="kbd"]')).not.toBeNull();
    w.unmount();
  });

  it("registers actions in the command palette under context", async () => {
    const registry = new CommandRegistry();
    const Host = defineComponent({
      setup() {
        provideCommands(registry);
        return () => h(NqPageActions, { primary: { id: "p.new", label: "New", shortcut: "C" }, actions: [{ id: "p.del", label: "Delete", danger: true }] });
      },
    });
    const w = mount(Host, { attachTo: document.body });
    await flushPromises();
    const cmds = registry.getSnapshot().commands;
    expect(cmds.map((c) => c.id).sort()).toEqual(["p.del", "p.new"]);
    expect(cmds.find((c) => c.id === "p.del")!.searchOnly).toBe(true);
    w.unmount();
  });
});
