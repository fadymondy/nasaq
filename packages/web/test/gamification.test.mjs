import assert from "node:assert/strict";
import { test } from "node:test";
import {
  achievementCounts,
  achievementPercent,
  achievementStatus,
  dayKey,
  filterAchievements,
  levelProgress,
  monthGrid,
  movement,
  pinnedEntry,
  rankEntries,
  rarityRank,
  splitPodium,
  streakStats,
  xpForLevel,
} from "../src/components/gamification/gamification-logic.ts";

test("achievement status and percent", () => {
  assert.equal(achievementStatus({ id: "a" }), "locked");
  assert.equal(achievementStatus({ id: "a", progress: 2, goal: 5 }), "in-progress");
  assert.equal(achievementStatus({ id: "a", progress: 5, goal: 5 }), "earned");
  assert.equal(achievementStatus({ id: "a", earnedAt: "2026-01-01" }), "earned");
  assert.equal(achievementStatus({ id: "a", progress: 1 }), "earned");
  assert.equal(achievementPercent({ id: "a", progress: 2, goal: 5 }), 40);
  assert.equal(achievementPercent({ id: "a", progress: 99, goal: 5 }), 100);
  assert.equal(achievementPercent({ id: "a", earnedAt: 1 }), 100);
  assert.equal(achievementPercent({ id: "a", progress: -3, goal: 5 }), 0);
});

test("filter and counts", () => {
  const list = [
    { id: "1", earnedAt: "2026-01-01" },
    { id: "2", progress: 1, goal: 3 },
    { id: "3" },
    { id: "4" },
  ];
  assert.deepEqual(achievementCounts(list), { all: 4, earned: 1, "in-progress": 1, locked: 2 });
  assert.deepEqual(filterAchievements(list, "locked").map((a) => a.id), ["3", "4"]);
  assert.equal(filterAchievements(list, "all").length, 4);
});

test("rarityRank", () => {
  assert.ok(rarityRank("legendary") > rarityRank("epic"));
  assert.equal(rarityRank(undefined), 0);
});

test("rankEntries shares ranks on ties and skips after", () => {
  const r = rankEntries([
    { id: "a", name: "A", score: 10 },
    { id: "b", name: "B", score: 30 },
    { id: "c", name: "C", score: 30 },
    { id: "d", name: "D", score: 20 },
  ]);
  assert.deepEqual(r.map((e) => [e.id, e.rank]), [["b", 1], ["c", 1], ["d", 3], ["a", 4]]);
  assert.deepEqual(rankEntries([]), []);
});

test("movement", () => {
  assert.deepEqual(movement({ rank: 2, previousRank: 5 }), { direction: "up", by: 3 });
  assert.deepEqual(movement({ rank: 5, previousRank: 2 }), { direction: "down", by: 3 });
  assert.deepEqual(movement({ rank: 2, previousRank: 2 }), { direction: "same", by: 0 });
  assert.deepEqual(movement({ rank: 2 }), { direction: "new", by: 0 });
});

test("splitPodium and pinnedEntry", () => {
  const ranked = Array.from({ length: 6 }, (_, i) => ({ id: `u${i}`, rank: i + 1 }));
  assert.equal(splitPodium(ranked).top.length, 3);
  assert.equal(splitPodium(ranked).rest.length, 3);
  assert.equal(splitPodium(ranked, false).top.length, 0);
  assert.equal(splitPodium(ranked.slice(0, 2)).rest.length, 0);
  assert.equal(pinnedEntry(ranked, "u5", 5)?.id, "u5");
  assert.equal(pinnedEntry(ranked, "u2", 5), null);
  assert.equal(pinnedEntry(ranked, "nobody", 5), null);
  assert.equal(pinnedEntry(ranked, undefined, 5), null);
});

test("levels", () => {
  assert.equal(xpForLevel(1), 0);
  assert.equal(xpForLevel(2), 100);
  assert.ok(xpForLevel(4) > xpForLevel(3));
  const p = levelProgress(0);
  assert.equal(p.level, 1);
  assert.equal(p.percent, 0);
  const q = levelProgress(150);
  assert.equal(q.level, 2);
  assert.equal(q.xp, 50);
  assert.equal(q.remaining, xpForLevel(3) - 150);
  assert.equal(levelProgress(xpForLevel(5)).level, 5);
  assert.equal(levelProgress(-10).level, 1);
  assert.equal(levelProgress(Number.NaN).level, 1);
  assert.equal(levelProgress(50, { base: 50, growth: 1 }).level, 2);
});

test("streakStats", () => {
  const today = new Date(2026, 8, 30);
  const s = streakStats(["2026-09-30", "2026-09-29", "2026-09-28", "2026-09-20", "2026-09-19"], today);
  assert.deepEqual(s, { current: 3, longest: 3, atRisk: false });
  // Yesterday still counts, and is at risk.
  assert.deepEqual(streakStats(["2026-09-29", "2026-09-28"], today), { current: 2, longest: 2, atRisk: true });
  // Broken streak.
  assert.equal(streakStats(["2026-09-25"], today).current, 0);
  assert.equal(streakStats([], today).longest, 0);
  // Across month and year boundaries, duplicates ignored.
  assert.equal(streakStats(["2025-12-31", "2026-01-01", "2026-01-01", "2026-01-02"], new Date(2026, 0, 2)).current, 3);
});

test("monthGrid pads weeks and marks days", () => {
  // September 2026 starts on a Tuesday.
  const weeks = monthGrid(2026, 8, ["2026-09-10"], new Date(2026, 8, 15), 0);
  assert.ok(weeks.every((w) => w.length === 7));
  assert.equal(weeks[0]?.filter((c) => c === null).length, 2);
  const flat = weeks.flat().filter((c) => c !== null);
  assert.equal(flat.length, 30);
  assert.equal(flat.find((c) => c.day === 10)?.active, true);
  assert.equal(flat.find((c) => c.day === 15)?.today, true);
  assert.equal(flat.find((c) => c.day === 16)?.future, true);
  // Week starting Monday moves the padding.
  assert.equal(monthGrid(2026, 8, [], new Date(2026, 8, 15), 1)[0]?.filter((c) => c === null).length, 1);
  assert.equal(dayKey(new Date(2026, 0, 5)), "2026-01-05");
});
