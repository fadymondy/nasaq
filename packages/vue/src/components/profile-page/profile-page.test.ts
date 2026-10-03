import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { NqProfileAccount, NqProfileApps, NqProfilePage, type ProfileData } from ".";

afterEach(() => {
  document.body.innerHTML = "";
});

const NOW = new Date("2026-09-29T09:00:00Z");
const profile: ProfileData = {
  name: "Laylah Haddad",
  handle: "@laylah",
  headline: "Product designer",
  joined: "2024-03-12",
  email: "laylah@example.com",
  availability: "open",
  location: "Riyadh",
  links: [{ kind: "github", label: "GitHub", href: "https://github.com/laylah" }],
  about: "Hello **world**",
  experience: [
    { id: "j1", role: "Lead", company: "Tamkeen", start: "2022-01-01" },
    { id: "j2", role: "Designer", company: "Nour", start: "2019-06-01", end: "2021-12-31" },
  ],
  skills: [{ name: "Figma", group: "Design", level: 5 }],
  projects: [
    { slug: "a", title: "Alpha", description: "First", category: "Product", featured: true },
    { slug: "b", title: "Beta", description: "Second", category: "Product" },
    { slug: "c", title: "Gamma", description: "Third", category: "Open source" },
  ],
  testimonials: [{ quote: "Great", name: "Omar" }],
};
const mk = (props: Record<string, unknown> = {}) => mount(NqProfilePage, { props: { profile, now: NOW, ...props }, attachTo: document.body });

describe("NqProfilePage", () => {
  it("shows the identity column, sections with counts and the contact call to action", () => {
    const w = mk();
    expect(w.attributes("data-slot")).toBe("profile-page");
    expect(w.get("h1").text()).toBe("Laylah Haddad");
    expect(w.text()).toContain("@laylah");
    expect(w.text()).toContain("Joined March 2024");
    expect(w.findAll('[data-slot="profile-section"]').length).toBeGreaterThanOrEqual(5);
    expect(w.find('[data-slot="profile-contact"]').exists()).toBe(true);
    expect(w.text()).toContain("Current");
    expect(w.get('a[href="mailto:laylah@example.com"]').text()).toContain("Get in touch");
  });

  it("filters projects by category", async () => {
    const w = mk();
    const cards = () => w.findAll('[data-slot="project-card"]');
    expect(cards()).toHaveLength(2);
    const tab = w.findAll('[role="tab"]').find((t) => t.text() === "Open source")!;
    await tab.trigger("mousedown");
    await tab.trigger("focus");
    await tab.trigger("click");
    expect(cards().length).toBeLessThanOrEqual(2);
  });

  it("owner view replaces contact, shows apps and account and leaves the call to action out", async () => {
    const w = mk({ owner: true, apps: [], appsHref: "/apps", account: [{ label: "Email", value: "l@example.com" }] });
    expect(w.find('[data-slot="profile-contact"]').exists()).toBe(false);
    expect(w.text()).toContain("Edit profile");
    expect(w.text()).toContain("No apps yet");
    expect(w.text()).toContain("Browse apps");
    expect(w.text()).toContain("Only you can see this.");
    await w.findAll("button").find((b) => b.text() === "Edit profile")!.trigger("click");
    expect(w.emitted("edit")).toHaveLength(1);
  });

  it("emits contact from the button when asked", async () => {
    const w = mk({ contactButton: true });
    await w.findAll("button").find((b) => b.text().includes("Get in touch"))!.trigger("click");
    expect(w.emitted("contact")!.length).toBeGreaterThan(0);
  });

  it("speaks Arabic", () => {
    const w = mount(NqProfileAccount, { props: { details: [{ label: "a", value: "b" }], labels: { account: "الحساب" } } });
    expect(w.text()).toContain("الحساب");
  });

  it("an app is one link", () => {
    const w = mount(NqProfileApps, { props: { apps: [{ id: "m", name: "Mahaam", href: "https://m.app", plan: "Pro", role: "Owner", org: "3x1" }] } });
    expect(w.findAll("a")).toHaveLength(1);
    expect(w.text()).toContain("Pro");
    expect(w.text()).toContain("3x1");
  });
});
