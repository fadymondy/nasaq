import assert from "node:assert/strict";
import test from "node:test";
import { averagePosition, bestPosition, competitorStats, ctrForPosition, difficultyBand, parseKeywordList, rankBucket, rankChange, rankDistribution, topMovers, visibilityShare } from "../src/components/keyword-tracker/rank-math.ts";

test("rankChange: lower position number is better", () => {
  assert.deepEqual(rankChange(8, 5), { direction: "up", delta: 3 });
  assert.deepEqual(rankChange(5, 8), { direction: "down", delta: -3 });
  assert.deepEqual(rankChange(5, 5), { direction: "same", delta: 0 });
});

test("rankChange handles entering and leaving the top 100", () => {
  assert.equal(rankChange(null, 40).direction, "new");
  assert.equal(rankChange(40, null).direction, "lost");
  assert.equal(rankChange(null, null).direction, "none");
  assert.equal(rankChange(undefined, 3).direction, "none");
});

test("rankBucket edges", () => {
  assert.equal(rankBucket(1), "top3");
  assert.equal(rankBucket(3), "top3");
  assert.equal(rankBucket(4), "top10");
  assert.equal(rankBucket(10), "top10");
  assert.equal(rankBucket(11), "top100");
  assert.equal(rankBucket(100), "top100");
  assert.equal(rankBucket(101), "unranked");
  assert.equal(rankBucket(null), "unranked");
});

test("rankDistribution counts buckets and total", () => {
  assert.deepEqual(rankDistribution([1, 2, 5, 12, 50, null]), { top3: 2, top10: 1, top100: 2, unranked: 1, total: 6 });
});

test("bestPosition and averagePosition skip gaps", () => {
  assert.equal(bestPosition([9, null, 4, 7]), 4);
  assert.equal(bestPosition([null, null]), null);
  assert.equal(averagePosition([2, 4, null]), 3);
  assert.equal(averagePosition([null]), null);
});

test("ctrForPosition falls with position and is 0 for unranked", () => {
  assert.ok(ctrForPosition(1) > ctrForPosition(2));
  assert.ok(ctrForPosition(10) > ctrForPosition(15));
  assert.equal(ctrForPosition(null), 0);
  assert.equal(ctrForPosition(150), 0);
});

test("visibilityShare is 1 when every keyword is first and 0 when none ranks", () => {
  assert.equal(visibilityShare([{ position: 1, volume: 100 }, { position: 1, volume: 50 }]), 1);
  assert.equal(visibilityShare([{ position: null, volume: 100 }]), 0);
  assert.equal(visibilityShare([]), 0);
  assert.equal(visibilityShare([{ position: 1, volume: 100 }, { position: null, volume: 100 }]), 0.5);
});

test("topMovers splits gainers and losers, biggest first", () => {
  const rows = [
    { id: "a", position: 2, previousPosition: 10 },
    { id: "b", position: 9, previousPosition: 4 },
    { id: "c", position: 5, previousPosition: 5 },
    { id: "d", position: 3, previousPosition: 5 },
    { id: "e", position: 30, previousPosition: null },
  ];
  const { gainers, losers } = topMovers(rows, 2);
  assert.deepEqual(gainers.map((r) => r.id), ["a", "d"]);
  assert.deepEqual(losers.map((r) => r.id), ["b"]);
});

test("difficultyBand thresholds", () => {
  assert.equal(difficultyBand(29), "easy");
  assert.equal(difficultyBand(30), "medium");
  assert.equal(difficultyBand(59), "medium");
  assert.equal(difficultyBand(60), "hard");
});

test("parseKeywordList splits on lines, commas and Arabic commas and dedupes", () => {
  assert.deepEqual(parseKeywordList("Alpha, beta\n alpha  ،gamma;  \n\n"), ["alpha", "beta", "gamma"]);
});

test("competitorStats counts keywords ahead of the reference", () => {
  const kws = [{ id: "1", volume: 100 }, { id: "2", volume: 100 }, { id: "3", volume: 100 }];
  const mine = { 1: 3, 2: null, 3: 8 };
  const rival = { 1: 5, 2: 9, 3: 8 };
  const s = competitorStats(rival, kws, mine);
  assert.equal(s.ahead, 1);
  assert.equal(s.top10, 3);
  assert.equal(s.averagePosition, (5 + 9 + 8) / 3);
  assert.equal(competitorStats(mine, kws).ahead, 0);
});
