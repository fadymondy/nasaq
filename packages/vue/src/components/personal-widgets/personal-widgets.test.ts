import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NqAvailabilityBadge, NqLocalClock, NqNowWidget, NqSkillsWidget, NqSocialLinks, NqStatsWidget, NqWeatherWidget } from ".";

// 2026-09-29 (Tuesday) 09:00 UTC = 12:00 in Riyadh.
const NOW = new Date("2026-09-29T09:00:00Z");

describe("personal widgets", () => {
  it("availability badge", () => {
    const w = mount(NqAvailabilityBadge, { props: { status: "limited", note: "till May" } });
    expect(w.attributes("data-slot")).toBe("availability-badge");
    expect(w.attributes("data-status")).toBe("limited");
    expect(w.text()).toContain("Limited availability");
    expect(w.text()).toContain("till May");
  });

  it("local clock shows time, working state and offset", () => {
    const w = mount(NqLocalClock, { props: { timeZone: "Asia/Riyadh", viewerTimeZone: "UTC", city: "Riyadh", now: NOW } });
    expect(w.attributes("data-slot")).toBe("local-clock");
    expect(w.find("time").text()).toMatch(/12:00/);
    expect(w.text()).toContain("Working hours");
    expect(w.text()).toContain("3h ahead of you");
    expect(w.text()).toContain("in Riyadh");
  });

  it("local clock outside working hours, same zone", () => {
    const w = mount(NqLocalClock, { props: { timeZone: "UTC", viewerTimeZone: "UTC", now: new Date("2026-09-29T23:00:00Z") } });
    expect(w.text()).toContain("Outside working hours");
    expect(w.text()).toContain("Same time as you");
  });

  it("social links open external in a new tab", () => {
    const w = mount(NqSocialLinks, { props: { links: [{ kind: "github", label: "GitHub", href: "https://github.com/x" }, { kind: "email", label: "Email", href: "mailto:a@b.c" }], layout: "list" } });
    const [a, b] = w.findAll("a");
    expect(a!.attributes("target")).toBe("_blank");
    expect(a!.attributes("rel")).toBe("noopener noreferrer");
    expect(b!.attributes("target")).toBeUndefined();
    expect(w.find("svg").exists()).toBe(true);
  });

  it("now widget", () => {
    const w = mount(NqNowWidget, { props: { items: [{ label: "Building", text: "A thing", href: "/x" }], updated: "2026-09-20" } });
    expect(w.find("dt").text()).toBe("Building");
    expect(w.find("dd a").attributes("href")).toBe("/x");
    expect(w.text()).toContain("Updated");
  });

  it("stats widget formats numbers", () => {
    const w = mount(NqStatsWidget, { props: { stats: [{ label: "Stars", value: 12400, compact: true, suffix: "+" }] } });
    expect(w.text()).toContain("12K");
    expect(w.text()).toContain("+");
  });

  it("skills group strongest first with level text", () => {
    const w = mount(NqSkillsWidget, { props: { skills: [{ name: "A", group: "G", level: 2 }, { name: "B", group: "G", level: 5 }, { name: "C" }] } });
    const lis = w.findAll("li");
    expect(lis[0]!.text()).toBe("B");
    expect(w.find("[role=img]").attributes("aria-label")).toBe("Level 5 of 5");
    expect(w.findAll(".eyebrow")).toHaveLength(1);
  });

  it("weather converts to Fahrenheit", () => {
    const w = mount(NqWeatherWidget, { props: { city: "Riyadh", temperature: 38, condition: "clear", high: 41, low: 27, unit: "f" } });
    expect(w.attributes("data-condition")).toBe("clear");
    expect(w.text()).toContain("100");
    expect(w.text()).toContain("Clear");
  });
});
