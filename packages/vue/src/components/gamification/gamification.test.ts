import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import { NasaqProvider } from "../../provider";
import {
  NqAchievementCard,
  NqAchievementMedal,
  NqAchievementUnlockToast,
  NqBadgeGrid,
  NqLeaderboard,
  NqRewardCard,
  NqStreakCalendar,
  NqStreakCard,
  NqXpProgress,
  type Achievement,
} from ".";

const list: Achievement[] = [
  { id: "a", title: "First", rarity: "rare", earnedAt: "2026-01-02" },
  { id: "b", title: "Halfway", progress: 3, goal: 6 },
  { id: "c", title: "Hidden", secret: true },
];

beforeEach(() => {
  vi.stubGlobal("matchMedia", (q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} }));
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("NqAchievementMedal", () => {
  it("shows the state and the ring only while in progress", () => {
    const earned = mount(NqAchievementMedal, { props: { achievement: list[0]! } });
    expect(earned.attributes("data-status")).toBe("earned");
    expect(earned.find("svg.absolute").exists()).toBe(false);
    const part = mount(NqAchievementMedal, { props: { achievement: list[1]! } });
    expect(part.attributes("data-status")).toBe("in-progress");
    expect(part.find("svg.absolute").exists()).toBe(true);
    expect(mount(NqAchievementMedal, { props: { achievement: list[2]! } }).attributes("data-status")).toBe("locked");
  });
});

describe("NqBadgeGrid", () => {
  it("counts per filter, filters on click and hides secrets", async () => {
    const w = mount(NqBadgeGrid, { props: { achievements: list }, attachTo: document.body });
    expect(w.findAll('[data-slot="tabs-tab"]').map((t) => t.text())).toEqual(["All 3", "Earned 1", "In progress 1", "Locked 1"]);
    expect(w.text()).toContain("Secret achievement");
    expect(w.text()).not.toContain("Hidden");
    await w.findAll('[data-slot="tabs-tab"]')[1]!.trigger("mousedown");
    await w.findAll('[data-slot="tabs-tab"]')[1]!.trigger("click");
    expect(w.emitted("filterChange")?.[0]).toEqual(["earned"]);
    w.unmount();
  });

  it("turns each badge into a button when select is listened to", async () => {
    const onSelect = vi.fn();
    const w = mount(NqBadgeGrid, { props: { achievements: list, filters: false, onSelect, selectedId: "b" } });
    const buttons = w.findAll("li button");
    expect(buttons).toHaveLength(3);
    expect(buttons[1]!.attributes("aria-pressed")).toBe("true");
    await buttons[0]!.trigger("click");
    expect(onSelect).toHaveBeenCalledWith("a");
  });
});

describe("NqAchievementCard", () => {
  it("labels the card by its title and shows progress until earned", () => {
    const w = mount(NqAchievementCard, { props: { achievement: list[1]! } });
    expect(w.attributes("data-slot")).toBe("achievement-card");
    expect(w.attributes("aria-labelledby")).toBe(w.find("h3").attributes("id"));
    expect(w.find('[role="progressbar"]').exists()).toBe(true);
    const done = mount(NqAchievementCard, { props: { achievement: list[0]! } });
    expect(done.text()).toContain("Earned");
    expect(done.find('[role="progressbar"]').exists()).toBe(false);
  });
});

describe("NqXpProgress", () => {
  it("works the level out from lifetime XP", () => {
    const w = mount(NqXpProgress, { props: { totalXp: 260 } });
    expect(w.attributes("data-level")).toBe("2");
    expect(w.text()).toContain("Level 2");
    expect(w.text()).toContain("XP to level 3");
  });
});

describe("NqStreakCard and NqStreakCalendar", () => {
  const today = new Date(2026, 8, 20);
  it("counts the run ending today and marks active days", () => {
    const w = mount(NqStreakCard, { props: { activeDays: ["2026-09-19", "2026-09-20"], today } });
    expect(w.find('[data-slot="streak-counter"]').text()).toContain("2");
    expect(w.findAll("[data-active]")).toHaveLength(2);
    expect(w.find("[data-today]").text()).toContain("20");
  });

  it("moves between months and reports it", async () => {
    const w = mount(NqStreakCalendar, { props: { activeDays: [], today } });
    expect(w.find('[aria-live="polite"]').text()).toBe("September 2026");
    await w.find('button[aria-label="Next month"]').trigger("click");
    expect(w.find('[aria-live="polite"]').text()).toBe("October 2026");
    expect((w.emitted("monthChange")![0]![0] as Date).getMonth()).toBe(9);
  });
});

describe("NqLeaderboard", () => {
  const entries = [
    { id: "a", name: "Ann", score: 30 },
    { id: "b", name: "Bob", score: 20, previousRank: 1 },
    { id: "c", name: "Cy", score: 10 },
    { id: "d", name: "Di", score: 5 },
    { id: "me", name: "Me", score: 1 },
  ];
  it("shows a podium, the rest, and pins you when you are past the limit", () => {
    const w = mount(NqLeaderboard, { props: { entries, youId: "me", limit: 4, unit: "XP" } });
    expect(w.findAll('[data-slot="leaderboard-podium"] li')).toHaveLength(3);
    expect(w.find('[data-movement="down"]').exists()).toBe(true);
    const pinned = w.find('ol[aria-label="Your rank"]');
    expect(pinned.text()).toContain("Me");
    expect(pinned.text()).toContain("You");
  });

  it("is empty and loading on request, and follows the period tabs", async () => {
    expect(mount(NqLeaderboard, { props: { entries: [] } }).text()).toContain("No one on the board yet");
    expect(mount(NqLeaderboard, { props: { entries, loading: true } }).find('[role="status"][aria-busy="true"]').exists()).toBe(true);
    const w = mount(NqLeaderboard, { props: { entries, periods: [{ id: "w", label: "Week" }, { id: "m", label: "Month" }] }, attachTo: document.body });
    await w.findAll('[data-slot="tabs-tab"]')[1]!.trigger("mousedown");
    await w.findAll('[data-slot="tabs-tab"]')[1]!.trigger("click");
    expect(w.emitted("periodChange")?.[0]).toEqual(["m"]);
    w.unmount();
  });
});

describe("NqRewardCard", () => {
  it("says how many more points are needed and blocks the claim", () => {
    const w = mount(NqRewardCard, { props: { title: "Mug", cost: 500, balance: 320, onClaim: async () => {} } });
    expect(w.text()).toContain("180 more needed");
    expect(w.find("button").attributes("disabled")).toBeDefined();
  });

  it("runs the claim, shows the returned error and frees the button", async () => {
    const onClaim = vi.fn(async () => ({ error: "Out of stock" }));
    const w = mount(NqRewardCard, { props: { title: "Mug", cost: 100, balance: 500, onClaim } });
    await w.find("button").trigger("click");
    await vi.waitFor(() => expect(w.find('[role="alert"]').text()).toBe("Out of stock"));
    expect(onClaim).toHaveBeenCalledTimes(1);
    expect(w.find("button").attributes("aria-busy")).toBeUndefined();
  });

  it("shows Owned and Locked badges instead of a button", () => {
    expect(mount(NqRewardCard, { props: { title: "A", status: "owned" } }).text()).toContain("Owned");
    const locked = mount(NqRewardCard, { props: { title: "A", status: "locked", lockedReason: "Reach level 5" } });
    expect(locked.find("button").exists()).toBe(false);
    expect(locked.text()).toContain("Reach level 5");
  });
});

describe("NqAchievementUnlockToast", () => {
  it("keeps a live region mounted, closes after the duration and pauses while hovered", async () => {
    vi.useFakeTimers();
    const w = mount(NqAchievementUnlockToast, { props: { achievement: list[0]!, open: false, duration: 1000 } });
    expect(w.attributes("aria-live")).toBe("polite");
    expect(w.text()).toBe("");
    await w.setProps({ open: true });
    expect(w.text()).toContain("Achievement unlocked");
    expect(w.text()).toContain("First");
    await w.find("[data-rarity]").trigger("pointerenter");
    vi.advanceTimersByTime(2000);
    expect(w.emitted("close")).toBeUndefined();
    await w.find("[data-rarity]").trigger("pointerleave");
    vi.advanceTimersByTime(1000);
    expect(w.emitted("close")).toHaveLength(1);
  });

  it("shows no burst under reduced motion, and a View button only with a listener", async () => {
    vi.stubGlobal("matchMedia", (q: string) => ({ matches: true, media: q, addEventListener() {}, removeEventListener() {} }));
    const onView = vi.fn();
    const w = mount(NqAchievementUnlockToast, { props: { achievement: list[0]!, open: true, duration: 0, onView }, attachTo: document.body });
    await Promise.resolve();
    expect(w.find("span.pointer-events-none.absolute").exists()).toBe(false);
    await w.findAll("button").find((b) => b.text() === "View")!.trigger("click");
    expect(onView).toHaveBeenCalledWith("a");
    w.unmount();
  });

  it("speaks Arabic when the provider says so", () => {
    const host = defineComponent({ render: () => h(NasaqProvider, { locale: "ar", target: "scope" }, () => h(NqXpProgress, { totalXp: 260 })) });
    const w = mount(host);
    expect(w.text()).toContain("المستوى");
  });
});
