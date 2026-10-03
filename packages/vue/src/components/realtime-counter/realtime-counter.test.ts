import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { NasaqProvider } from "../../provider";
import { NqRealtimeCounter } from ".";

const sections = [
  { id: "pages", title: "Top active pages", ltr: true, rows: [{ id: "a", label: "/pricing", value: 14 }] },
  { id: "src", title: "Top sources", rows: [{ id: "b", label: "Google", value: 30 }] },
];

// The Arabic provider writes lang and dir to <html>; put them back so later tests read English.
afterEach(() => {
  document.documentElement.lang = "en";
  document.documentElement.dir = "ltr";
});

describe("NqRealtimeCounter", () => {
  it("renders the live figure, the minute strip and the sections", () => {
    const w = mount(NqRealtimeCounter, { props: { value: 87, perMinute: [62, 70, 87], sections, updatedAt: Date.now() - 120_000, class: "extra" } });
    expect(w.attributes("data-slot")).toBe("realtime-counter");
    expect(w.attributes("data-live")).toBe("true");
    expect(w.classes()).toContain("extra");
    expect(w.text()).toContain("Right now");
    expect(w.text()).toContain("Live");
    const value = w.find('[data-slot="realtime-value"]');
    expect(value.attributes("role")).toBe("status");
    expect(value.attributes("aria-label")).toBe("87 active users");
    expect(value.text()).toBe("87");
    expect(w.find('[data-slot="mini-bar"]').attributes("aria-label")).toBe("Users per minute, last 30 minutes");
    expect(w.text()).toContain("2 minutes ago");
    expect(w.find('[data-slot="date-time"]').exists()).toBe(true);
    const lists = w.findAll("section");
    expect(lists).toHaveLength(2);
    expect(lists[0]!.attributes("aria-label")).toBe("Top active pages");
    expect(lists[0]!.find("bdi[dir=ltr]").text()).toBe("/pricing");
    expect(lists[1]!.find("span[dir=auto]").text()).toBe("Google");
    expect(w.text()).not.toContain("Nobody is active");
  });

  it("stops the pulse and says Paused when not live", () => {
    const live = mount(NqRealtimeCounter, { props: { value: 1 } });
    expect(live.find(".motion-safe\\:animate-ping").exists()).toBe(true);
    expect(live.find('[data-slot="realtime-value"]').attributes("aria-label")).toBe("1 active user");
    const w = mount(NqRealtimeCounter, { props: { value: 5, live: false } });
    expect(w.attributes("data-live")).toBe("false");
    expect(w.text()).toContain("Paused");
    expect(w.find(".motion-safe\\:animate-ping").exists()).toBe(false);
    expect(w.find(".bg-muted-foreground").exists()).toBe(true);
  });

  it("says nobody is active when empty", () => {
    expect(mount(NqRealtimeCounter, { props: { value: 0 } }).text()).toContain("Nobody is active right now");
  });

  it("takes a custom title and is Arabic inside an Arabic provider", () => {
    expect(mount(NqRealtimeCounter, { props: { value: 3, title: "Live now" } }).text()).toContain("Live now");
    const w = mount({ components: { NasaqProvider, NqRealtimeCounter }, template: '<NasaqProvider locale="ar"><NqRealtimeCounter :value="3" /></NasaqProvider>' });
    expect(w.text()).toContain("الآن");
    expect(w.text()).toContain("مباشر");
    w.unmount();
  });
});
