import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent } from "vue";
import {
  NqNavigationMenu,
  NqNavigationMenuContent,
  NqNavigationMenuItem,
  NqNavigationMenuLabel,
  NqNavigationMenuLink,
  NqNavigationMenuLinkItem,
  NqNavigationMenuLinkList,
  NqNavigationMenuList,
  NqNavigationMenuTrigger,
} from ".";

const Demo = defineComponent({
  components: {
    NqNavigationMenu, NqNavigationMenuContent, NqNavigationMenuItem, NqNavigationMenuLabel, NqNavigationMenuLink,
    NqNavigationMenuLinkItem, NqNavigationMenuLinkList, NqNavigationMenuList, NqNavigationMenuTrigger,
  },
  template: `<NqNavigationMenu aria-label="Main"><NqNavigationMenuList>
    <NqNavigationMenuItem value="res"><NqNavigationMenuTrigger>Resources</NqNavigationMenuTrigger>
      <NqNavigationMenuContent class="w-72"><NqNavigationMenuLabel>Learn</NqNavigationMenuLabel><NqNavigationMenuLinkList>
        <NqNavigationMenuLinkItem href="/docs" title="Documentation" description="Guides and API reference." />
      </NqNavigationMenuLinkList></NqNavigationMenuContent></NqNavigationMenuItem>
    <NqNavigationMenuItem><NqNavigationMenuLink href="/pricing" active>Pricing</NqNavigationMenuLink></NqNavigationMenuItem>
  </NqNavigationMenuList></NqNavigationMenu>`,
});

describe("NqNavigationMenu", () => {
  it("renders the bar with the React classes, a chevron trigger and a top-level link", () => {
    const w = mount(Demo, { attachTo: document.body });
    expect(w.find('[data-slot="navigation-menu"]').classes()).toEqual(expect.arrayContaining(["relative", "flex", "w-max"]));
    expect(w.find('[data-slot="navigation-menu-list"]').classes()).toContain("list-none");
    const trigger = w.find('[data-slot="navigation-menu-trigger"]');
    expect(trigger.classes()).toEqual(expect.arrayContaining(["h-control", "rounded-control", "gap-1.5"]));
    expect(trigger.attributes("aria-expanded")).toBe("false");
    expect(trigger.find("svg").exists()).toBe(true);
    const link = w.find('[data-slot="navigation-menu-link"]');
    expect(link.attributes("href")).toBe("/pricing");
    expect(link.classes()).toContain("data-active:bg-nq-selected");
    w.unmount();
  });

  it("opens the panel from the trigger and marks it open", async () => {
    const w = mount(Demo, { attachTo: document.body });
    const trigger = w.find('[data-slot="navigation-menu-trigger"]');
    await trigger.trigger("pointerdown", { button: 0, pointerType: "mouse" });
    await trigger.trigger("click");
    await flushPromises();
    await new Promise((r) => setTimeout(r, 30));
    expect(trigger.attributes("aria-expanded")).toBe("true");
    expect(trigger.attributes("data-popup-open")).toBeDefined();
    const content = document.querySelector('[data-slot="navigation-menu-content"]');
    expect(content).not.toBeNull();
    expect(content!.className).toContain("w-72");
    expect(document.querySelector('[data-slot="navigation-menu-viewport"]')).not.toBeNull();
    expect(document.querySelector('[data-slot="navigation-menu-link-item"] a')?.getAttribute("href")).toBe("/docs");
    w.unmount();
  });
});
