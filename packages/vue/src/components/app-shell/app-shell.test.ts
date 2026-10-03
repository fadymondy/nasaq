import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import { defineComponent } from "vue";
import {
  NqAppBreadcrumbs,
  NqAppCrumb,
  NqAppHeader,
  NqAppMain,
  NqAppNav,
  NqAppNavItem,
  NqAppPageHeader,
  NqAppShell,
  NqSidebar,
  NqSidebarGroup,
  NqSidebarItem,
  NqSidebarStatus,
  NqSidebarTrigger,
} from ".";

const Demo = defineComponent({
  components: { NqAppShell, NqSidebar, NqSidebarItem, NqSidebarGroup, NqSidebarStatus, NqAppHeader, NqSidebarTrigger, NqAppMain, NqAppBreadcrumbs, NqAppCrumb, NqAppPageHeader },
  props: { variant: { type: String, default: "plain" }, defaultCollapsed: Boolean },
  template: `<NqAppShell :variant="variant" :default-collapsed="defaultCollapsed">
    <template #sidebar>
      <NqSidebar>
        <NqSidebarGroup label="Workspace">
          <NqSidebarItem active href="/a">Overview</NqSidebarItem>
          <NqSidebarItem href="/b">Inbox</NqSidebarItem>
        </NqSidebarGroup>
        <NqSidebarStatus href="/status">All systems normal</NqSidebarStatus>
      </NqSidebar>
    </template>
    <NqAppHeader><NqSidebarTrigger />
      <NqAppBreadcrumbs><NqAppCrumb href="/">Acme</NqAppCrumb><NqAppCrumb current>Site</NqAppCrumb></NqAppBreadcrumbs>
    </NqAppHeader>
    <NqAppMain><NqAppPageHeader title="Overview" description="Last 7 days" /></NqAppMain>
  </NqAppShell>`,
});

beforeEach(() => localStorage.clear());

describe("NqAppShell", () => {
  it("renders the shell, sidebar column, skip link and main target", () => {
    const w = mount(Demo, { attachTo: document.body });
    const shell = w.find('[data-slot="app-shell"]');
    expect(shell.attributes("data-navigation")).toBe("sidebar");
    expect(shell.classes()).toContain("bg-background");
    expect(w.find('a[href="#app-main"]').exists()).toBe(true);
    expect(w.find("#app-main").attributes("data-slot")).toBe("app-main");
    const aside = w.find('[data-slot="app-sidebar"]');
    expect(aside.exists()).toBe(true);
    expect(aside.attributes("data-collapsed")).toBeUndefined();
    expect(w.find('[data-slot="sidebar-resize-handle"]').attributes("role")).toBe("separator");
    w.unmount();
  });

  it("marks the active item with aria-current", () => {
    const w = mount(Demo);
    const items = w.findAll('[data-slot="sidebar-item"]');
    expect(items[0]!.attributes("aria-current")).toBe("page");
    expect(items[0]!.classes()).toContain("bg-nq-selected");
    expect(items[1]!.attributes("aria-current")).toBeUndefined();
    w.unmount();
  });

  it("collapses to a rail with the toggle and remembers it", async () => {
    const w = mount(Demo, { attachTo: document.body });
    const toggle = w.find('button[aria-label="Toggle sidebar"]');
    await toggle.trigger("click");
    await flushPromises();
    expect(w.find('[data-slot="app-sidebar"]').attributes("data-collapsed")).toBe("");
    expect(localStorage.getItem("nasaq-sidebar")).toBe("collapsed");
    // Collapsed items drop their label and keep an accessible name.
    expect(w.find('[data-slot="sidebar-item"]').attributes("aria-label")).toBe("Overview");
    expect(w.find('[data-slot="sidebar-status"]').attributes("aria-label")).toBe("All systems normal");
    w.unmount();
  });

  it("toggles with Ctrl+B", async () => {
    const w = mount(Demo, { attachTo: document.body });
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "b", code: "KeyB", ctrlKey: true, bubbles: true }));
    await flushPromises();
    expect(w.find('[data-slot="app-sidebar"]').attributes("data-collapsed")).toBe("");
    w.unmount();
  });

  it("resizes with the keyboard and clamps", async () => {
    const w = mount(Demo, { attachTo: document.body });
    const handle = w.find('[data-slot="sidebar-resize-handle"]');
    expect(handle.attributes("aria-valuenow")).toBe("256");
    await handle.trigger("keydown", { key: "ArrowRight" });
    expect(handle.attributes("aria-valuenow")).toBe("272");
    await handle.trigger("keydown", { key: "End" });
    expect(handle.attributes("aria-valuenow")).toBe("420");
    expect(localStorage.getItem("nasaq-sidebar-width")).toBe("420");
    w.unmount();
  });

  it("wraps the page in a panel for the inset variant", () => {
    const w = mount(Demo, { props: { variant: "inset" } });
    expect(w.find('[data-slot="app-shell-panel"]').exists()).toBe(true);
    expect(w.find('[data-slot="app-shell"]').classes()).toContain("md:bg-sidebar");
    w.unmount();
  });

  it("renders breadcrumbs with only the last step visible on phones", () => {
    const w = mount(Demo);
    const li = w.findAll('[data-slot="app-breadcrumbs"] li');
    expect(li).toHaveLength(2);
    expect(li[0]!.classes()).toContain("max-md:hidden");
    expect(li[1]!.classes()).not.toContain("max-md:hidden");
    expect(w.find('[data-slot="app-breadcrumbs"] [aria-current="page"]').text()).toBe("Site");
    w.unmount();
  });

  it("renders the page header title and description", () => {
    const w = mount(Demo);
    expect(w.find('[data-slot="app-page-header"] h1').text()).toBe("Overview");
    expect(w.text()).toContain("Last 7 days");
    w.unmount();
  });
});

describe("NqAppNav", () => {
  const Nav = defineComponent({
    components: { NqAppNav, NqAppNavItem },
    template: `<NqAppNav :mobile-items="2">
      <NqAppNavItem active href="/1">One</NqAppNavItem>
      <NqAppNavItem href="/2">Two</NqAppNavItem>
      <NqAppNavItem href="/3">Three</NqAppNavItem>
      <NqAppNavItem href="/4">Four</NqAppNavItem>
    </NqAppNav>`,
  });

  it("renders desktop tabs and a mobile bar with a More overflow", () => {
    const w = mount(Nav);
    const tabs = w.find('[data-slot="app-nav"]');
    expect(tabs.findAll('[data-slot="app-nav-item"]')).toHaveLength(4);
    expect(tabs.find('[aria-current="page"]').text()).toBe("One");
    const bar = w.find('[data-slot="app-nav-bar"]');
    expect(bar.findAll('[data-slot="app-nav-item"]')).toHaveLength(2);
    expect(bar.find('[data-slot="app-nav-more"]').text()).toBe("More");
    w.unmount();
  });
});
