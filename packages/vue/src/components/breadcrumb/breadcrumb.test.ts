import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent } from "vue";
import { NqBreadcrumb, NqBreadcrumbItem, NqBreadcrumbLink, NqBreadcrumbList, NqBreadcrumbPage, NqBreadcrumbSeparator } from ".";

const Demo = defineComponent({
  components: { NqBreadcrumb, NqBreadcrumbItem, NqBreadcrumbLink, NqBreadcrumbList, NqBreadcrumbPage, NqBreadcrumbSeparator },
  props: { label: { type: String, default: undefined } },
  template: `<NqBreadcrumb :aria-label="label"><NqBreadcrumbList>
    <NqBreadcrumbItem class="hidden"><NqBreadcrumbLink href="/">3x1</NqBreadcrumbLink></NqBreadcrumbItem>
    <NqBreadcrumbSeparator />
    <NqBreadcrumbItem><NqBreadcrumbPage>Nasaq</NqBreadcrumbPage></NqBreadcrumbItem>
    <NqBreadcrumbSeparator>/</NqBreadcrumbSeparator>
  </NqBreadcrumbList></NqBreadcrumb>`,
});

describe("NqBreadcrumb", () => {
  it("renders the landmark, list, link and current page with the React markup", () => {
    const w = mount(Demo);
    const nav = w.find('[data-slot="breadcrumb"]');
    expect(nav.element.tagName).toBe("NAV");
    expect(nav.attributes("aria-label")).toBe("Breadcrumb");
    expect(w.find("ol").classes()).toEqual(expect.arrayContaining(["flex", "gap-1.5", "text-muted-foreground"]));
    const item = w.find('[data-slot="breadcrumb-item"]');
    expect(item.classes()).toEqual(expect.arrayContaining(["min-w-0", "gap-1.5", "hidden"]));
    expect(w.find('[data-slot="breadcrumb-link"]').attributes("href")).toBe("/");
    const page = w.find('[data-slot="breadcrumb-page"]');
    expect(page.attributes("aria-current")).toBe("page");
    expect(page.classes()).toContain("text-foreground");
  });

  it("separators are presentational; the default one is a mirrored chevron, a custom one is wrapped", () => {
    const w = mount(Demo);
    const [chevron, custom] = w.findAll('[data-slot="breadcrumb-separator"]');
    expect(chevron!.attributes("role")).toBe("presentation");
    expect(chevron!.attributes("aria-hidden")).toBe("true");
    expect(chevron!.find("svg").classes()).toContain("rtl:-scale-x-100");
    expect(custom!.find("span").classes()).toContain("rtl:-scale-x-100");
    expect(custom!.text()).toBe("/");
  });

  it("keeps an explicit aria-label", () => {
    const w = mount(Demo, { props: { label: "مسار التنقل" } });
    expect(w.find("nav").attributes("aria-label")).toBe("مسار التنقل");
  });
});
