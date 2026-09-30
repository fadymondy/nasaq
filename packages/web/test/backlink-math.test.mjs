import assert from "node:assert/strict";
import test from "node:test";
import { backlinkStatus, dailyLinkSeries, diffBacklinks, domainOf, isToxic, referringDomains, summarizeBacklinks } from "../src/components/backlink-monitor/backlink-math.ts";

const NOW = Date.parse("2026-06-30T12:00:00Z");
const link = (id, firstSeen, extra = {}) => ({ id, sourceUrl: `https://${id}.example/page`, firstSeen, spamScore: 10, ...extra });

test("backlinkStatus: lost beats new, new is within a week", () => {
  assert.equal(backlinkStatus({ firstSeen: "2026-06-27" }, NOW), "new");
  assert.equal(backlinkStatus({ firstSeen: "2026-06-01" }, NOW), "active");
  assert.equal(backlinkStatus({ firstSeen: "2026-06-28", lostAt: "2026-06-29" }, NOW), "lost");
});

test("isToxic uses the threshold and ignores disavowed links", () => {
  assert.equal(isToxic({ spamScore: 60 }), true);
  assert.equal(isToxic({ spamScore: 59 }), false);
  assert.equal(isToxic({ spamScore: 90, disavowed: true }), false);
});

test("domainOf and referringDomains count live domains once", () => {
  assert.equal(domainOf("https://WWW.Example.com/a"), "example.com");
  const links = [
    { id: "1", sourceUrl: "https://a.com/x", firstSeen: "2026-01-01", spamScore: 1 },
    { id: "2", sourceUrl: "https://www.a.com/y", firstSeen: "2026-01-01", spamScore: 1 },
    { id: "3", sourceUrl: "https://b.com/z", firstSeen: "2026-01-01", spamScore: 1, lostAt: "2026-02-01" },
  ];
  assert.equal(referringDomains(links), 1);
});

test("summarizeBacklinks", () => {
  const links = [
    link("a", "2026-06-29"),
    link("b", "2026-05-01", { spamScore: 80 }),
    link("c", "2026-05-01", { lostAt: "2026-06-20", spamScore: 90 }),
    link("d", "2026-04-01", { spamScore: 75, disavowed: true }),
  ];
  assert.deepEqual(summarizeBacklinks(links, NOW), { total: 4, active: 3, new: 1, lost: 1, toxic: 1, domains: 3 });
});

test("diffBacklinks", () => {
  assert.deepEqual(diffBacklinks(["a", "b"], ["b", "c"]), { added: ["c"], removed: ["a"] });
});

test("dailyLinkSeries covers each day, oldest first", () => {
  const series = dailyLinkSeries([link("a", "2026-06-30"), link("b", "2026-06-29", { lostAt: "2026-06-30" }), link("c", "2026-01-01")], 3, NOW);
  assert.deepEqual(series, [
    { date: "2026-06-28", gained: 0, lost: 0 },
    { date: "2026-06-29", gained: 1, lost: 0 },
    { date: "2026-06-30", gained: 1, lost: 1 },
  ]);
});
