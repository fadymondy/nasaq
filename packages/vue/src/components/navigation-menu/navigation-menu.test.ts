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

const Two = defineComponent({
  components: { NqNavigationMenu, NqNavigationMenuContent, NqNavigationMenuItem, NqNavigationMenuList, NqNavigationMenuTrigger },
  template: `<NqNavigationMenu><NqNavigationMenuList>
    <NqNavigationMenuItem value="a"><NqNavigationMenuTrigger>A</NqNavigationMenuTrigger><NqNavigationMenuContent><p id="pa">Panel A</p></NqNavigationMenuContent></NqNavigationMenuItem>
    <NqNavigationMenuItem value="b"><NqNavigationMenuTrigger>B</NqNavigationMenuTrigger><NqNavigationMenuContent><p id="pb">Panel B</p></NqNavigationMenuContent></NqNavigationMenuItem>
  </NqNavigationMenuList></NqNavigationMenu>`,
});

async function press(trigger: { trigger: (e: string, o?: object) => Promise<void> }) {
  await trigger.trigger("pointerdown", { button: 0, pointerType: "mouse" });
  await trigger.trigger("click");
  await flushPromises();
  await new Promise((r) => setTimeout(r, 30));
}

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
    expect(document.querySelector('[data-slot="navigation-menu-popup"]')).not.toBeNull();
    expect(document.querySelector('[data-slot="navigation-menu-link-item"] a')?.getAttribute("href")).toBe("/docs");
    w.unmount();
  });

  it("renders ONE shared popup that holds every panel and carries the React popup classes and size vars", async () => {
    const w = mount(Two, { attachTo: document.body });
    await flushPromises();
    const [a, b] = w.findAll('[data-slot="navigation-menu-trigger"]');
    await press(a!);
    const popups = document.querySelectorAll<HTMLElement>('[data-slot="navigation-menu-popup"]');
    expect(popups).toHaveLength(1);
    const popup = popups[0]!;
    expect(popup.className).toContain("h-[var(--popup-height)]");
    expect(popup.className).toContain("w-[var(--popup-width)]");
    expect(popup.className).toContain("data-ending-style:scale-95");
    expect(popup.style.getPropertyValue("--popup-width")).toContain("--reka-navigation-menu-viewport-width");
    expect(popup.hasAttribute("data-open")).toBe(true);
    expect(popup.style.display).not.toBe("none");
    await press(b!);
    expect(document.querySelectorAll('[data-slot="navigation-menu-popup"]')).toHaveLength(1);
    expect(popup.querySelectorAll('[data-slot="navigation-menu-content"]')).toHaveLength(2);
    expect(popup.contains(document.querySelector("#pb"))).toBe(true);
    w.unmount();
  });

  it("slides panels with data-activation-direction and data-starting/ending-style, and hides the popup on close", async () => {
    const style = document.createElement("style");
    style.textContent = '[data-slot="navigation-menu-content"],[data-slot="navigation-menu-popup"]{transition-duration:120ms}';
    document.head.append(style);
    const seen = new Set<string>();
    const watcher = new MutationObserver((records) => {
      for (const r of records) {
        const el = r.target as Element;
        if (r.attributeName && el.hasAttribute(r.attributeName) && r.attributeName.startsWith("data-") && /starting|ending/.test(r.attributeName)) {
          seen.add(`${el.getAttribute("data-slot")}:${r.attributeName}`);
        }
      }
    });
    watcher.observe(document.body, { attributes: true, subtree: true });
    const w = mount(Two, { attachTo: document.body });
    await flushPromises();
    const [a, b] = w.findAll('[data-slot="navigation-menu-trigger"]');
    await press(a!);
    await new Promise((r) => setTimeout(r, 200));
    expect(seen.has("navigation-menu-popup:data-starting-style")).toBe(true);
    expect(seen.has("navigation-menu-content:data-starting-style")).toBe(true);
    await press(b!);
    const [ca, cb] = [...document.querySelectorAll<HTMLElement>('[data-slot="navigation-menu-content"]')];
    // B comes from the end side (right in LTR); A leaves towards the start with the same direction attribute.
    expect(cb!.getAttribute("data-activation-direction")).toBe("right");
    expect(ca!.getAttribute("data-activation-direction")).toBe("right");
    expect(seen.has("navigation-menu-content:data-ending-style")).toBe(true);
    await press(a!);
    expect(cb!.getAttribute("data-activation-direction")).toBe("left");
    expect(ca!.getAttribute("data-activation-direction")).toBe("left");
    // Closing: the popup gets data-ending-style, stays through the transition, then hides.
    seen.clear();
    await press(a!);
    expect(seen.has("navigation-menu-popup:data-ending-style")).toBe(true);
    await new Promise((r) => setTimeout(r, 300));
    const popup = document.querySelector<HTMLElement>('[data-slot="navigation-menu-popup"]')!;
    expect(popup.style.display).toBe("none");
    expect(popup.hasAttribute("data-closed")).toBe(true);
    watcher.disconnect();
    w.unmount();
    style.remove();
  });
});
