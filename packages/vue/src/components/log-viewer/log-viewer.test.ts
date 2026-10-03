import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { compileMatcher, countByLevel, entriesUntil, filterLogs, formatLogTime, LOG_RANGES, normalizeLevel, NqLogViewer, rangeSince, virtualWindow, type LogEntry } from ".";

const base = Date.UTC(2026, 8, 29, 14, 3, 7, 128);
const entries: LogEntry[] = [
  { id: 1, time: base, level: "info", source: "api", message: "listening on :3000" },
  { id: 2, time: base + 1000, level: "error", source: "db", message: "connection refused", fields: { host: "db-1", retries: 3 } },
  { id: 3, time: base + 2000, level: "warn", message: "slow query" },
];

afterEach(() => {
  document.body.innerHTML = "";
});

describe("log helpers", () => {
  it("normalises levels, counts and filters", () => {
    expect(normalizeLevel("WARNING")).toBe("warn");
    expect(normalizeLevel("nope")).toBeUndefined();
    expect(countByLevel(entries)).toMatchObject({ info: 1, error: 1, warn: 1, debug: 0 });
    expect(filterLogs(entries, { query: "db-1" }).entries.map((e) => e.id)).toEqual([2]);
    expect(filterLogs(entries, { query: "(", regex: true }).invalid).toBe(true);
    expect(filterLogs(entries, { levels: new Set(["warn"]) }).entries).toHaveLength(1);
    expect(compileMatcher("a.c")?.valueOf()).toBeTruthy();
  });
  it("formats times with latin digits and windows rows", () => {
    expect(formatLogTime(base, { utc: true })).toBe("14:03:07.128");
    expect(formatLogTime(base, { utc: true, date: true, millis: false })).toBe("2026-09-29 14:03:07");
    expect(virtualWindow({ scrollTop: 0, viewport: 240, rowHeight: 24, count: 1000 })).toEqual({ start: 0, end: 19 });
  });
});

describe("NqLogViewer", () => {
  it("renders the toolbar, level chips with counts, rows and the footer", () => {
    const w = mount(NqLogViewer, { props: { entries, streaming: true } });
    expect(w.attributes("data-slot")).toBe("log-viewer");
    expect(w.attributes("dir")).toBe("ltr");
    expect(w.attributes("data-streaming")).toBeDefined();
    expect(w.find('[data-slot="log-viewer-list"]').attributes("role")).toBe("log");
    const chip = w.find('button[data-level="error"]');
    expect(chip.attributes("aria-pressed")).toBe("true");
    expect(chip.text()).toContain("Error");
    expect(chip.text()).toContain("1");
    const rows = w.findAll('[role="listitem"]');
    expect(rows).toHaveLength(3);
    expect(rows[1]!.attributes("data-level")).toBe("error");
    expect(rows[1]!.text()).toContain("ERROR");
    expect(rows[1]!.text()).toContain("db");
    expect(w.text()).toContain("3 entries");
    expect(w.text()).toContain("Live");
  });

  it("filters by level and search, highlights matches and resets", async () => {
    const w = mount(NqLogViewer, { props: { entries } });
    await w.find('button[data-level="error"]').trigger("click");
    expect(w.find('button[data-level="error"]').attributes("aria-pressed")).toBe("false");
    expect(w.findAll('[role="listitem"]')).toHaveLength(2);
    expect(w.text()).toContain("2 of 3 entries");

    await w.find('input[type="search"]').setValue("slow");
    expect(w.findAll('[role="listitem"]')).toHaveLength(1);
    expect(w.find("mark").text()).toBe("slow");

    await w.find('input[type="search"]').setValue("zzz");
    expect(w.text()).toContain("No entries match");
    await w.findAll("button").find((b) => b.text().includes("Reset filters"))!.trigger("click");
    expect(w.findAll('[role="listitem"]')).toHaveLength(3);
  });

  it("shows an inline message for an invalid regular expression", async () => {
    const w = mount(NqLogViewer, { props: { entries } });
    await w.find('button[aria-label="Use regular expression"]').trigger("click");
    await w.find('input[type="search"]').setValue("(");
    expect(w.text()).toContain("Invalid regular expression");
    expect(w.find('input[type="search"]').attributes("aria-invalid")).toBe("true");
    expect(w.findAll('[role="listitem"]')).toHaveLength(3);
  });

  it("toggles timestamps", async () => {
    const w = mount(NqLogViewer, { props: { entries, utc: true } });
    expect(w.findAll('[role="listitem"]')[0]!.text()).toContain("14:03:07.128");
    await w.find('button[aria-label="Show timestamps"]').trigger("click");
    expect(w.findAll('[role="listitem"]')[0]!.text()).not.toContain("14:03:07.128");
  });

  it("selects a row with click and arrow keys, shows the detail panel and closes it with Escape", async () => {
    const w = mount(NqLogViewer, { props: { entries, utc: true } });
    const list = w.find('[data-slot="log-viewer-list"]');
    await w.findAll('[role="listitem"]')[1]!.trigger("click");
    const detail = w.find('[data-slot="log-viewer-detail"]');
    expect(detail.exists()).toBe(true);
    expect(detail.text()).toContain("connection refused");
    expect(detail.text()).toContain("host");
    expect(detail.text()).toContain("db-1");
    expect(w.findAll('[role="listitem"]')[1]!.attributes("data-selected")).toBeDefined();
    expect(list.attributes("aria-activedescendant")).toBe(w.findAll('[role="listitem"]')[1]!.attributes("id"));
    await list.trigger("keydown", { key: "ArrowDown" });
    expect(w.findAll('[role="listitem"]')[2]!.attributes("aria-current")).toBe("true");
    await list.trigger("keydown", { key: "Home" });
    expect(w.findAll('[role="listitem"]')[0]!.attributes("data-selected")).toBeDefined();
    await list.trigger("keydown", { key: "Escape" });
    expect(w.find('[data-slot="log-viewer-detail"]').exists()).toBe(false);
  });

  it("copies the visible logs and flashes the confirmation", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    const w = mount(NqLogViewer, { props: { entries, utc: true } });
    await w.find('button[aria-label="Copy visible logs"]').trigger("click");
    await flushPromises();
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("2026-09-29 14:03:07.128 INFO  api listening on :3000"));
    expect(w.find('[role="status"]').text()).toBe("Logs copied to clipboard");
  });

  it("calls onDownload with the visible entries", async () => {
    const onDownload = vi.fn();
    const w = mount(NqLogViewer, { props: { entries, onDownload } });
    await w.find('button[data-level="warn"]').trigger("click");
    await w.find('button[aria-label="Download logs"]').trigger("click");
    expect(onDownload).toHaveBeenCalledWith(entries.filter((e) => e.level !== "warn"));
  });

  it("shows the empty state, honours defaultLevels and defaultQuery, and merges classes", () => {
    const empty = mount(NqLogViewer, { props: { entries: [] } });
    expect(empty.text()).toContain("No logs yet");
    const w = mount(NqLogViewer, { props: { entries, defaultLevels: ["error"], defaultQuery: "conn", class: "mine" } });
    expect(w.classes()).toContain("mine");
    expect(w.findAll('[role="listitem"]')).toHaveLength(1);
    expect(w.find('button[data-level="info"]').attributes("aria-pressed")).toBe("false");
  });

  it("offers Jump to latest once the list is scrolled away from the tail", async () => {
    const w = mount(NqLogViewer, { props: { entries } });
    const list = w.find('[data-slot="log-viewer-list"]');
    expect(w.text()).not.toContain("Jump to latest");
    const el = list.element as HTMLElement;
    Object.defineProperty(el, "scrollHeight", { value: 1000, configurable: true });
    Object.defineProperty(el, "clientHeight", { value: 100, configurable: true });
    el.scrollTop = 0;
    await list.trigger("scroll");
    expect(w.text()).toContain("Jump to latest");
    await w.findAll("button").find((b) => b.text().includes("Jump to latest"))!.trigger("click");
    expect(w.text()).not.toContain("Jump to latest");
  });

  it("filters by time range, with a select that can be switched and reset", async () => {
    const now = Date.now();
    const timed: LogEntry[] = [
      { id: 1, time: now - 3 * 3600_000, level: "info", message: "old one" },
      { id: 2, time: now - 60_000, level: "info", message: "fresh one" },
    ];
    const w = mount(NqLogViewer, { props: { entries: timed, ranges: LOG_RANGES, defaultRange: "1h" } });
    const select = w.find('[data-slot="log-viewer-range"]');
    expect(select.attributes("aria-label")).toBe("Time range");
    expect(w.findAll('[role="listitem"]')).toHaveLength(1);
    expect(w.text()).toContain("1 of 2 entries");
    await select.setValue("all");
    expect(w.findAll('[role="listitem"]')).toHaveLength(2);
    expect(rangeSince(LOG_RANGES[4])).toBeNull();
  });

  it("with manual, shows entries as given and reports filter changes (not on mount)", async () => {
    const onFilterChange = vi.fn();
    const w = mount(NqLogViewer, { props: { entries, manual: true, onFilterChange, counts: { error: 40 }, total: 900, ranges: LOG_RANGES } });
    expect(onFilterChange).not.toHaveBeenCalled();
    expect(w.text()).toContain("3 of 900 entries");
    expect(w.find('button[data-level="error"]').text()).toContain("40");
    await w.find('button[data-level="error"]').trigger("click");
    expect(w.findAll('[role="listitem"]')).toHaveLength(3);
    expect(onFilterChange).toHaveBeenCalledTimes(1);
    expect(onFilterChange.mock.calls[0]![0]).toMatchObject({ query: "", regex: false });
    expect(onFilterChange.mock.calls[0]![0].levels).not.toContain("error");
  });

  it("loads older entries from the bar at the top of the list", async () => {
    let done!: () => void;
    const onLoadOlder = vi.fn(() => new Promise<void>((r) => (done = r)));
    const w = mount(NqLogViewer, { props: { entries, hasOlder: true, onLoadOlder } });
    const bar = w.find('[data-slot="log-viewer-older"]');
    expect(bar.text()).toContain("Load older entries");
    await bar.find("button").trigger("click");
    expect(onLoadOlder).toHaveBeenCalledTimes(1);
    expect(w.find('[data-slot="log-viewer-older"]').text()).toContain("Loading older entries");
    done();
    await flushPromises();
    expect(w.find('[data-slot="log-viewer-older"]').text()).toContain("Load older entries");
  });

  it("pauses the live tail, counts waiting entries and catches up on resume", async () => {
    const onLiveChange = vi.fn();
    const w = mount(NqLogViewer, { props: { entries, liveTail: true, onLiveChange } });
    const live = () => w.find('[data-slot="log-viewer-live"]');
    expect(live().attributes("aria-label")).toBe("Pause live tail");
    await live().trigger("click");
    expect(onLiveChange).toHaveBeenLastCalledWith(false);
    expect(w.attributes("data-paused")).toBeDefined();
    expect(live().attributes("aria-label")).toBe("Resume live tail");
    expect(live().attributes("aria-pressed")).toBe("true");
    await w.setProps({ entries: [...entries, { id: 4, time: base + 3000, level: "info", message: "later" }] });
    expect(w.findAll('[role="listitem"]')).toHaveLength(3);
    expect(w.text()).toContain("Paused");
    expect(w.text()).toContain("1 new entry");
    await w.findAll("button").find((b) => b.text().includes("1 new entry"))!.trigger("click");
    expect(onLiveChange).toHaveBeenLastCalledWith(true);
    expect(w.attributes("data-paused")).toBeUndefined();
    expect(w.findAll('[role="listitem"]')).toHaveLength(4);
  });

  it("entriesUntil keeps what a paused list had", () => {
    expect(entriesUntil(entries, 2).map((e) => e.id)).toEqual([1, 2]);
    expect(entriesUntil(entries, null)).toEqual([]);
    expect(entriesUntil(entries, 99)).toBe(entries);
  });
});
