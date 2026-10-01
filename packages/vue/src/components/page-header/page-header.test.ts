import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NqPageHeader } from ".";

describe("NqPageHeader", () => {
  it("renders title, description, meta and actions with the React slots", () => {
    const w = mount(NqPageHeader, {
      props: { title: "Customers", description: "All of them." },
      slots: { meta: "<span>Updated</span>", actions: "<button>New</button>" },
    });
    expect(w.find("header").attributes("data-slot")).toBe("page-header");
    expect(w.find("h1").attributes("data-slot")).toBe("page-header-title");
    expect(w.find("h1").text()).toBe("Customers");
    expect(w.find('[data-slot="page-header-description"]').text()).toBe("All of them.");
    expect(w.find('[data-slot="page-header-meta"]').text()).toBe("Updated");
    expect(w.find('[data-slot="page-header-actions"]').text()).toBe("New");
  });

  it("draws breadcrumbs with the current page last", () => {
    const w = mount(NqPageHeader, { props: { title: "T", breadcrumbs: [{ label: "Sales", href: "/sales" }, { label: "Customers" }] } });
    expect(w.find('[data-slot="page-header-breadcrumbs"]').exists()).toBe(true);
    expect(w.find('[data-slot="breadcrumb-link"]').attributes("href")).toBe("/sales");
    expect(w.find('[data-slot="breadcrumb-page"]').text()).toBe("Customers");
  });

  it("back link mirrors its arrow, runs onBack and speaks Arabic", async () => {
    let called = 0;
    const w = mount(NqPageHeader, { props: { title: "T", backHref: "/x", onBack: () => called++ } });
    const back = w.find('[data-slot="page-header-back"]');
    expect(back.text()).toBe("Back");
    expect(back.find("svg").classes()).toContain("rtl:-scale-x-100");
    await back.trigger("click");
    expect(called).toBe(1);
    const ar = mount(NqPageHeader, { props: { title: "T", backHref: "/x", labels: { back: "رجوع" } } });
    expect(ar.find('[data-slot="page-header-back"]').text()).toBe("رجوع");
  });

  it("has no back link, meta or actions by default and honours as=h2", () => {
    const w = mount(NqPageHeader, { props: { title: "T", as: "h2" } });
    expect(w.find('[data-slot="page-header-back"]').exists()).toBe(false);
    expect(w.find('[data-slot="page-header-meta"]').exists()).toBe(false);
    expect(w.find("h2").exists()).toBe(true);
  });
});
