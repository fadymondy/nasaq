import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NqStatusPage, type StatusPageService } from ".";
import type { Incident } from "../uptime-monitors";

const days = Array.from({ length: 5 }, () => "up" as const);
const services: StatusPageService[] = [
  { id: "web", name: "Website", description: "Storefront", status: "up", days, uptime: 99.99 },
  { id: "api", name: "API", status: "down" },
];
const incidents: Incident[] = [
  { id: "a", title: "API down", status: "investigating", impact: "major", startedAt: Date.now() - 3_600_000 },
  { id: "b", title: "Old slowdown", status: "resolved", impact: "minor", startedAt: Date.now() - 86_400_000, resolvedAt: Date.now() - 80_000_000 },
];

describe("NqStatusPage", () => {
  it("renders the banner, services, incidents and the empty maintenance note", () => {
    const w = mount(NqStatusPage, { props: { title: "Acme status", services, incidents, updatedAt: Date.now() - 60_000 } });
    const root = w.find('[data-slot="status-page"]');
    expect(root.attributes("data-overall")).toBe("partial-outage");
    expect(root.classes()).toEqual(expect.arrayContaining(["max-w-3xl", "gap-8"]));
    expect(w.find("h1").text()).toBe("Acme status");
    expect(w.find('[role="status"]').text()).toContain("Partial outage");
    expect(w.find('[role="status"]').text()).toContain("Updated");
    expect(w.findAll('[data-slot="status-page-service"]')).toHaveLength(2);
    expect(w.find('[data-slot="uptime-bar"]').attributes("aria-label")).toBe("Website, daily status");
    expect(w.text()).toContain("5 days ago");
    expect(w.text()).toContain("No maintenance is scheduled.");
    expect(w.find("#sp-active").exists()).toBe(true);
    expect(w.find("#sp-past").exists()).toBe(true);
    expect(w.findAll('[data-slot="incident"]')).toHaveLength(2);
    expect(w.text()).toContain("Powered by Nasaq");
  });

  it("turns the banner to maintenance while a window runs and lists upcoming windows", () => {
    const now = Date.now();
    const w = mount(NqStatusPage, {
      props: {
        title: "Acme",
        services: [{ id: "web", name: "Website", status: "up" }],
        maintenance: [{ id: "m", title: "DB upgrade", startsAt: now - 1000, endsAt: now + 3_600_000 }],
        class: "extra",
      },
      slots: { footer: "<a>Subscribe</a>", logo: "<i data-logo />" },
    });
    expect(w.find('[data-slot="status-page"]').attributes("data-overall")).toBe("maintenance");
    expect(w.find('[data-slot="status-page"]').classes()).toContain("extra");
    expect(w.text()).toContain("DB upgrade");
    expect(w.find("[data-logo]").exists()).toBe(true);
    expect(w.find("footer a").text()).toBe("Subscribe");
  });
});
