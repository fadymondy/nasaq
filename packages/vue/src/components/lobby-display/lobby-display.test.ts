import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import type { QueueEntry } from "../waiting-screen";
import { NqLobbyDisplay } from ".";

const NOW = 1_800_000_000_000;
const base = { checkedInAt: NOW - 3_600_000 };
const queue = (): QueueEntry[] => [
  { ...base, id: "a", ticket: "A-001", number: 1, status: "serving", room: "2", queuedAt: NOW - 900_000, calledAt: NOW - 600_000 },
  { ...base, id: "b", ticket: "A-002", number: 2, status: "called", room: "3", queuedAt: NOW - 800_000, calledAt: NOW - 120_000 },
  { ...base, id: "c", ticket: "A-003", number: 3, status: "waiting", queuedAt: NOW - 400_000 },
  { ...base, id: "d", ticket: "A-004", number: 4, status: "waiting", priority: "urgent", queuedAt: NOW - 300_000 },
];

afterEach(() => {
  vi.useRealTimers();
  document.documentElement.lang = "en";
});

describe("NqLobbyDisplay", () => {
  it("shows a card per room, who is up next and recent calls without names", () => {
    const w = mount(NqLobbyDisplay, { props: { entries: queue(), rooms: ["1", "2", "3"], clinic: "Nasaq Clinic", now: NOW } });
    expect(w.attributes("data-slot")).toBe("lobby-display");
    const rooms = w.findAll("[data-room]");
    expect(rooms.map((r) => r.attributes("data-state"))).toEqual(["free", "serving", "called"]);
    expect(rooms[2]!.text()).toContain("A-002");
    expect(rooms[2]!.text()).toContain("Please come in");
    expect(rooms[0]!.text()).toContain("Available");
    const upNext = w.find('section[aria-label="Up next"]');
    expect(upNext.findAll("li").map((l) => l.text())).toEqual(["A-004", "A-003"]);
    expect(w.find('section[aria-label="Recently called"]').text()).toContain("A-002");
    expect(w.text()).toContain("Nasaq Clinic");
  });

  it("announces a new call and highlights it, then clears the highlight", async () => {
    vi.useFakeTimers();
    const w = mount(NqLobbyDisplay, { props: { entries: queue(), rooms: ["1", "2", "3"], now: NOW, highlightMs: 1000 } });
    expect(w.find('[aria-live="assertive"]').text()).toBe("");
    const next = queue().map((e) => (e.id === "c" ? { ...e, status: "called" as const, room: "1", calledAt: NOW } : e));
    await w.setProps({ entries: next });
    await nextTick();
    expect(w.find('[aria-live="assertive"]').text()).toBe("Ticket A-003, please go to Room 1.");
    expect(w.find('[data-room="1"]').attributes("data-fresh")).toBeDefined();
    await vi.advanceTimersByTimeAsync(1100);
    expect(w.find('[data-room="1"]').attributes("data-fresh")).toBeUndefined();
  });

  it("toggles sound with v-model:sound and speaks Arabic", async () => {
    const w = mount(NqLobbyDisplay, { props: { entries: queue(), rooms: ["1"], now: NOW } });
    const btn = w.find("button");
    expect(btn.attributes("aria-pressed")).toBe("false");
    await btn.trigger("click");
    expect(btn.attributes("aria-pressed")).toBe("true");
    expect(w.text()).toContain("Sound on");
    document.documentElement.lang = "ar";
    expect(mount(NqLobbyDisplay, { props: { entries: queue(), rooms: ["1"], now: NOW } }).text()).toContain("يُخدم الآن");
  });
});
