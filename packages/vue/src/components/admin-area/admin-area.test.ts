import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NasaqProvider } from "../../provider";
import { defaultAdminSections, NqAdminArea, NqAdminPage } from ".";

afterEach(() => {
  document.body.innerHTML = "";
  document.documentElement.lang = "en";
  document.documentElement.dir = "ltr";
});

describe("defaultAdminSections", () => {
  it("lists the five sections with their ids and localised labels", () => {
    const en = defaultAdminSections();
    expect(en.map((s) => s.id)).toEqual(["overview", "people", "tenants", "security", "settings"]);
    expect(en[2]!.groups![0]!.items[2]!.children!.map((c) => c.id)).toEqual(["invoices", "coupons"]);
    expect(defaultAdminSections("ar")[1]!.label).toBe("الأشخاص");
  });
});

describe("NqAdminArea", () => {
  it("renders the frame, the rail, the environment tag and the account button", () => {
    const w = mount(NqAdminArea, {
      props: { activeItem: "users", user: { name: "Sara Alharbi", email: "sara@example.com" }, environment: "Production", class: "h-80" },
      slots: { default: "<main>Page</main>" },
      attachTo: document.body,
    });
    expect(w.attributes("data-slot")).toBe("admin-area");
    expect(w.classes()).toEqual(expect.arrayContaining(["flex", "h-80"]));
    expect(w.find('[data-slot="icon-rail"]').findAll("[data-rail-button]")).toHaveLength(5);
    // active-item moves the rail to the People section.
    expect(w.text()).toContain("Invitations");
    expect(w.find('[data-slot="badge"]').text()).toBe("Production");
    expect(w.find('button[aria-label="Your account: Sara Alharbi"]').exists()).toBe(true);
    expect(w.find("main").text()).toBe("Page");
    expect(w.find('[data-slot="admin-impersonation"]').exists()).toBe(false);
    w.unmount();
  });

  it("pins the impersonation banner and exits through onStopImpersonating", async () => {
    const stop = vi.fn();
    const w = mount(NqAdminArea, { props: { impersonating: { name: "Omar" }, onStopImpersonating: stop }, attachTo: document.body });
    const banner = w.find('[data-slot="admin-impersonation"]');
    expect(banner.attributes("role")).toBe("status");
    expect(banner.text()).toContain("You are viewing the app as Omar.");
    await banner.find("button").trigger("click");
    expect(stop).toHaveBeenCalled();
    w.unmount();
  });

  it("speaks Arabic under an Arabic provider", () => {
    const w = mount(
      { components: { NqAdminArea, NasaqProvider }, template: `<NasaqProvider locale="ar"><NqAdminArea :user="{ name: 'سارة', email: 's@x.com' }" /></NasaqProvider>` },
      { attachTo: document.body },
    );
    expect(w.find('[data-slot="icon-rail"]').attributes("aria-label")).toBe("الأقسام");
    expect(w.find('button[aria-label="حسابك: سارة"]').exists()).toBe(true);
    w.unmount();
  });
});

describe("NqAdminPage", () => {
  it("renders breadcrumb, title, description, actions and content", () => {
    const w = mount(NqAdminPage, {
      props: { title: "Users", description: "Everyone", breadcrumbs: [{ label: "People", href: "/p" }, { label: "Users" }] },
      slots: { actions: "<button>New</button>", default: "<p>Body</p>" },
    });
    expect(w.attributes("data-slot")).toBe("admin-page");
    expect(w.find("h1").text()).toBe("Users");
    expect(w.find("nav").attributes("aria-label")).toBe("Breadcrumb");
    expect(w.find('[data-slot="breadcrumb-link"]').attributes("href")).toBe("/p");
    expect(w.find('[data-slot="breadcrumb-page"]').text()).toBe("Users");
    expect(w.text()).toContain("Everyone");
    expect(w.text()).toContain("New");
    expect(w.text()).toContain("Body");
  });

  it("omits the breadcrumb and actions when not given", () => {
    const w = mount(NqAdminPage, { props: { title: "Plain" } });
    expect(w.find("nav").exists()).toBe(false);
    expect(w.find("p").exists()).toBe(false);
  });
});
