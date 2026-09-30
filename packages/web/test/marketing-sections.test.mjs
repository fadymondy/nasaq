import assert from "node:assert/strict";
import { register } from "node:module";
import { test } from "node:test";
register(
  "data:text/javascript," +
    encodeURIComponent(`export async function resolve(specifier, context, next) {
      try { return await next(specifier, context); }
      catch (error) {
        if (specifier.startsWith(".") && !/\.\w+$/.test(specifier)) return next(specifier + ".ts", context);
        throw error;
      }
    }`),
);
const { formatSessionClock, sessionStateAt, sessionTimeFromRatio, sessionTimeline } = await import("../src/components/marketing-sections/session-playback-model.ts");

const events = [
  { role: "user", text: "add a dark theme" },
  { role: "tool", title: "Read file", text: "theme.css" },
  { role: "assistant", text: "Done. I added it." },
];

test("timeline orders events with gaps", () => {
  const t = sessionTimeline(events, "en", { wordMs: 100, gapMs: 200, holdMs: 500 });
  assert.equal(t.items[0].start, 0);
  assert.equal(t.items[0].end, 400);
  assert.equal(t.items[1].start, 600);
  assert.equal(t.items[1].end, 1100);
  assert.equal(t.items[2].start, 1300);
  assert.equal(t.items[2].words, 4);
  assert.equal(t.total, 1700);
});

test("delay pushes an event later", () => {
  const t = sessionTimeline([events[0], { ...events[2], delay: 1000 }], "en", { wordMs: 100, gapMs: 0 });
  assert.equal(t.items[1].start, 1400);
});

test("state while typing and after", () => {
  const t = sessionTimeline(events, "en", { wordMs: 100, gapMs: 200, holdMs: 500 });
  const early = sessionStateAt(t, 150);
  assert.equal(early[0].visibleWords, 2);
  assert.equal(early[0].done, false);
  assert.equal(early[1].started, false);
  const end = sessionStateAt(t, t.total);
  assert.ok(end.every((s) => s.done && s.progress === 1));
  assert.equal(sessionStateAt(t, 0)[0].visibleWords, 1);
});

test("Arabic words count as words, not letters", () => {
  const t = sessionTimeline([{ role: "assistant", text: "أضفت المظهر الداكن" }], "ar", { wordMs: 100 });
  assert.equal(t.items[0].words, 3);
});

test("scrubbing and clock", () => {
  const t = sessionTimeline(events, "en", { wordMs: 100, gapMs: 200, holdMs: 500 });
  assert.equal(sessionTimeFromRatio(t, 0.5), 850);
  assert.equal(sessionTimeFromRatio(t, 2), t.total);
  assert.equal(sessionTimeFromRatio(t, -1), 0);
  assert.equal(formatSessionClock(7400), "0:07");
  assert.equal(formatSessionClock(125000), "2:05");
});
