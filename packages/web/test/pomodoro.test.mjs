import assert from "node:assert/strict";
import { register } from "node:module";
import { test } from "node:test";
// The pomodoro model imports the countdown maths without an extension (the bundler resolves it);
// Node needs ".ts", so a resolve hook adds it for relative imports inside src.
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

const { displaySeconds, elapsedFraction, formatTimer, idleCountdown, idleMinutes, nextTickDelay, pauseCountdown, remainingAt, resumeCountdown, scaledClock, startCountdown, tickCountdown } = await import(
  "../src/components/countdown/countdown-math.ts"
);
const { focusStateOf } = await import("../src/components/focus-status/focus-math.ts");
const { breakAfter, DEFAULT_POMODORO, dailyProgress, initialPomodoro, pausePomodoro, postponeBreak, resumePomodoro, skipPomodoro, startPomodoro, stopPomodoro, tickPomodoro } = await import(
  "../src/components/pomodoro/pomodoro-model.ts"
);

const MIN = 60_000;
const cfg = { ...DEFAULT_POMODORO, focusMs: 25 * MIN, shortBreakMs: 5 * MIN, longBreakMs: 15 * MIN, cyclesBeforeLongBreak: 4 };

/* ------------------------------------------------------------------ countdown */

test("remaining time comes from endAt, so late ticks do not drift", () => {
  const s = startCountdown(10_000, 1_000);
  assert.equal(remainingAt(s, 1_000), 10_000);
  // Ticks arrive late and unevenly: the answer only depends on `now`.
  assert.equal(remainingAt(s, 4_137), 6_863);
  assert.equal(remainingAt(s, 10_999), 1);
  assert.equal(remainingAt(s, 60_000), 0);
});

test("displaySeconds rounds up so 0:00 means finished", () => {
  assert.equal(displaySeconds(10_000), 10);
  assert.equal(displaySeconds(9_001), 10);
  assert.equal(displaySeconds(1), 1);
  assert.equal(displaySeconds(0), 0);
});

test("nextTickDelay lands on the next second boundary", () => {
  const s = startCountdown(10_000, 0);
  assert.equal(nextTickDelay(s, 0), 1000);
  assert.equal(nextTickDelay(s, 300), 700);
  assert.equal(nextTickDelay(s, 9_999), 1);
  assert.equal(nextTickDelay(idleCountdown(5), 0), 0);
});

test("pause freezes the remaining time and resume continues from it", () => {
  let s = startCountdown(10_000, 0);
  s = pauseCountdown(s, 3_000);
  assert.equal(s.status, "paused");
  assert.equal(remainingAt(s, 3_000), 7_000);
  assert.equal(remainingAt(s, 50_000), 7_000, "paused time does not run");
  s = resumeCountdown(s, 50_000);
  assert.equal(s.status, "running");
  assert.equal(s.endAt, 57_000);
  assert.equal(remainingAt(s, 52_000), 5_000);
  // Pausing or resuming in the wrong state is a no-op.
  assert.equal(pauseCountdown(idleCountdown(5), 0).status, "idle");
  assert.equal(resumeCountdown(s, 60_000), s);
});

test("tickCountdown finishes exactly at endAt", () => {
  const s = startCountdown(2_000, 0);
  assert.equal(tickCountdown(s, 1_999), s);
  const done = tickCountdown(s, 2_000);
  assert.equal(done.status, "done");
  assert.equal(done.remainingMs, 0);
  assert.equal(elapsedFraction(done, 9_999), 1);
});

test("elapsedFraction runs 0 to 1", () => {
  const s = startCountdown(10_000, 0);
  assert.equal(elapsedFraction(s, 0), 0);
  assert.equal(elapsedFraction(s, 2_500), 0.25);
  assert.equal(elapsedFraction(idleCountdown(0), 0), 1);
});

test("formatTimer and scaledClock", () => {
  assert.equal(formatTimer(1500), "25:00");
  assert.equal(formatTimer(65), "01:05");
  assert.equal(formatTimer(3725), "1:02:05");
  assert.equal(formatTimer(-3), "00:00");
  let real = 1_000;
  const fast = scaledClock(60, () => real);
  assert.equal(fast(), 1_000);
  real += 1_000;
  assert.equal(fast(), 61_000);
  assert.equal(scaledClock(1, () => 5)(), 5);
});

test("idleMinutes only reports gaps past the threshold", () => {
  assert.equal(idleMinutes(4 * MIN, 5 * MIN), null);
  assert.equal(idleMinutes(5 * MIN, 5 * MIN), 5);
  assert.equal(idleMinutes(12.9 * MIN, 5 * MIN), 12);
});

/* ------------------------------------------------------------------ pomodoro */

test("a fresh pomodoro is a focus phase that has not started", () => {
  const s = initialPomodoro(cfg);
  assert.equal(s.phase, "focus");
  assert.equal(s.timer.status, "idle");
  assert.equal(s.timer.durationMs, 25 * MIN);
  assert.equal(startPomodoro(s, 100).timer.endAt, 100 + 25 * MIN);
});

test("focus ends into a short break that starts at the focus end, not at the late tick", () => {
  let s = startPomodoro(initialPomodoro(cfg), 0);
  const late = 25 * MIN + 700;
  const { state, events } = tickPomodoro(s, cfg, late);
  assert.equal(state.phase, "shortBreak");
  assert.equal(state.cycle, 1);
  assert.equal(state.completed, 1);
  assert.equal(state.timer.status, "running");
  // Drift-free: the break began at 25:00.000 and is already 700 ms in.
  assert.equal(state.timer.endAt, 25 * MIN + 5 * MIN);
  assert.equal(events.length, 1);
  assert.equal(events[0].kind, "completed");
  assert.equal(events[0].phase, "focus");
  assert.equal(events[0].startedAt, 0);
  assert.equal(events[0].endedAt, 25 * MIN);
});

test("a break ends into a focus that waits for you by default", () => {
  let s = startPomodoro(initialPomodoro(cfg), 0);
  s = tickPomodoro(s, cfg, 25 * MIN).state;
  const { state, events } = tickPomodoro(s, cfg, 30 * MIN + 10);
  assert.equal(state.phase, "focus");
  assert.equal(state.timer.status, "idle");
  assert.equal(state.cycle, 1);
  assert.equal(events[0].phase, "shortBreak");
});

test("autoStartFocus chains straight into the next focus at the break end", () => {
  const auto = { ...cfg, autoStartFocus: true };
  let s = startPomodoro(initialPomodoro(auto), 0);
  const { state } = tickPomodoro(s, auto, 30 * MIN + 250);
  assert.equal(state.phase, "focus");
  assert.equal(state.timer.status, "running");
  assert.equal(state.timer.endAt, 30 * MIN + 25 * MIN);
});

test("a long sleep applies every phase that ended, each on schedule", () => {
  const auto = { ...cfg, autoStartFocus: true };
  const s = startPomodoro(initialPomodoro(auto), 0);
  // 25 + 5 + 25 = 55 min of phases done by minute 56.
  const { state, events } = tickPomodoro(s, auto, 56 * MIN);
  assert.deepEqual(
    events.map((e) => e.phase),
    ["focus", "shortBreak", "focus"],
  );
  assert.equal(state.phase, "shortBreak");
  assert.equal(state.completed, 2);
  assert.equal(state.timer.endAt, 55 * MIN + 5 * MIN);
});

test("a long break comes after N focus sessions, then the set starts over", () => {
  const auto = { ...cfg, autoStartFocus: true, cyclesBeforeLongBreak: 3 };
  let s = startPomodoro(initialPomodoro(auto), 0);
  const phases = [];
  const events = [];
  let now = 0;
  // Walk one phase at a time.
  for (let i = 0; i < 7; i += 1) {
    now = s.timer.endAt;
    const r = tickPomodoro(s, auto, now);
    s = r.state;
    events.push(...r.events);
    phases.push(s.phase);
  }
  // focus(1) -> short, focus(2) -> short, focus(3) -> LONG, then focus again.
  assert.deepEqual(phases, ["shortBreak", "focus", "shortBreak", "focus", "longBreak", "focus", "shortBreak"]);
  assert.equal(s.cycle, 1, "the set restarted after the long break");
  assert.equal(s.completed, 4, "today's total keeps counting");
  assert.equal(breakAfter(3, auto), "longBreak");
  assert.equal(breakAfter(2, auto), "shortBreak");
});

test("long break length is used", () => {
  const c = { ...cfg, cyclesBeforeLongBreak: 1 };
  let s = startPomodoro(initialPomodoro(c), 0);
  s = tickPomodoro(s, c, 25 * MIN).state;
  assert.equal(s.phase, "longBreak");
  assert.equal(s.timer.durationMs, 15 * MIN);
});

test("pause and resume keep the phase time", () => {
  let s = startPomodoro(initialPomodoro(cfg), 0);
  s = pausePomodoro(s, 10 * MIN);
  assert.equal(s.timer.status, "paused");
  s = tickPomodoro(s, cfg, 90 * MIN).state;
  assert.equal(s.phase, "focus", "a paused phase never ends");
  s = resumePomodoro(s, 90 * MIN);
  assert.equal(s.timer.endAt, 90 * MIN + 15 * MIN);
  const after = tickPomodoro(s, cfg, 105 * MIN);
  assert.equal(after.state.phase, "shortBreak");
});

test("skipping focus goes to a break without counting a session", () => {
  const s = startPomodoro(initialPomodoro(cfg), 0);
  const { state, events } = skipPomodoro(s, cfg, 5 * MIN);
  assert.equal(state.phase, "shortBreak");
  assert.equal(state.completed, 0);
  assert.equal(state.cycle, 0);
  assert.equal(state.timer.status, "running");
  assert.equal(events[0].kind, "skipped");
  assert.equal(events[0].spentMs, 5 * MIN);
});

test("skipping a break returns to a focus that is ready, and skipping a long break resets the set", () => {
  const c = { ...cfg, cyclesBeforeLongBreak: 1 };
  let s = startPomodoro(initialPomodoro(c), 0);
  s = tickPomodoro(s, c, 25 * MIN).state;
  assert.equal(s.phase, "longBreak");
  const { state, events } = skipPomodoro(s, c, 26 * MIN);
  assert.equal(state.phase, "focus");
  assert.equal(state.timer.status, "idle");
  assert.equal(state.cycle, 0);
  assert.equal(state.completed, 1);
  assert.equal(events[0].kind, "skipped");
});

test("skipping something that never started reports nothing", () => {
  const { events } = skipPomodoro(initialPomodoro(cfg), cfg, 10);
  assert.equal(events.length, 0);
});

test("postponing a break gives extra focus that does not count as a session", () => {
  let s = startPomodoro(initialPomodoro(cfg), 0);
  s = tickPomodoro(s, cfg, 25 * MIN).state;
  const { state, events } = postponeBreak(s, cfg, 5 * MIN, 26 * MIN);
  assert.equal(state.phase, "focus");
  assert.equal(state.overtime, true);
  assert.equal(state.timer.endAt, 31 * MIN);
  assert.equal(events[0].kind, "postponed");
  assert.equal(events[0].phase, "shortBreak");
  const done = tickPomodoro(state, cfg, 31 * MIN);
  assert.equal(done.state.phase, "shortBreak", "the break is owed again");
  assert.equal(done.state.completed, 1, "no extra session");
  assert.equal(done.state.cycle, 1);
  assert.equal(done.state.overtime, false);
  // Postponing while focusing does nothing.
  assert.equal(postponeBreak(initialPomodoro(cfg), cfg, 1000, 0).events.length, 0);
});

test("stop resets the set but keeps today's count", () => {
  let s = startPomodoro(initialPomodoro(cfg), 0);
  s = tickPomodoro(s, cfg, 25 * MIN).state;
  s = tickPomodoro(s, cfg, 30 * MIN).state;
  s = startPomodoro(s, 31 * MIN);
  const { state, events } = stopPomodoro(s, cfg, 40 * MIN);
  assert.equal(state.phase, "focus");
  assert.equal(state.timer.status, "idle");
  assert.equal(state.cycle, 0);
  assert.equal(state.completed, 1);
  assert.equal(events[0].kind, "stopped");
  assert.equal(events[0].spentMs, 9 * MIN);
});

test("dailyProgress and focusStateOf", () => {
  assert.equal(dailyProgress(4, 8), 0.5);
  assert.equal(dailyProgress(20, 8), 1);
  assert.equal(dailyProgress(1, 0), 0);
  assert.equal(focusStateOf(undefined), "available");
  assert.equal(focusStateOf({ phase: "focus", status: "idle" }), "available");
  assert.equal(focusStateOf({ phase: "focus", status: "running" }), "focus");
  assert.equal(focusStateOf({ phase: "focus", status: "paused" }), "focus");
  assert.equal(focusStateOf({ phase: "shortBreak", status: "running" }), "break");
  assert.equal(focusStateOf({ phase: "focus", status: "running" }, true), "dnd");
});
