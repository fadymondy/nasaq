import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { NqQueueLiveIndicator, NqWaitingScreen, estimateWaitMinutes, positionInQueue, type QueueEntry } from ".";

const NOW = 1_800_000_000_000;
const base = { priority: "normal" as const, checkedInAt: NOW - 600_000 };
const queue = (me: Partial<QueueEntry> = {}): QueueEntry[] => [
  { ...base, id: "a", ticket: "A-001", number: 1, status: "serving", room: "2", queuedAt: NOW - 900_000, calledAt: NOW - 300_000 },
  { ...base, id: "b", ticket: "A-002", number: 2, status: "waiting", queuedAt: NOW - 500_000 },
  { ...base, id: "c", ticket: "A-003", number: 3, status: "waiting", queuedAt: NOW - 400_000 },
  { ...base, id: "me", ticket: "A-004", number: 4, status: "waiting", queuedAt: NOW - 300_000, ...me },
];

describe("queue math", () => {
  it("places a ticket in the call order and estimates the wait in waves of one visit per room", () => {
    expect(positionInQueue(queue(), "me")).toBe(3);
    expect(estimateWaitMinutes(queue(), "me", { averageMinutes: 10, rooms: 2 })).toBe(10);
    expect(estimateWaitMinutes(queue(), "me", { averageMinutes: 10 })).toBe(30);
  });
});

describe("NqWaitingScreen", () => {
  it("shows the ticket, position, wait and who is being served", () => {
    const w = mount(NqWaitingScreen, { props: { entries: queue(), entryId: "me", rooms: 2, averageMinutes: 10, now: NOW, updatedAt: NOW - 12_000, clinic: "Clinic" } });
    expect(w.attributes("data-status")).toBe("waiting");
    expect(w.find('[data-slot="waiting-ticket"]').text()).toBe("A-004");
    expect(w.text()).toContain("2 people ahead of you");
    expect(w.text()).toContain("About 10 min");
    expect(w.text()).toContain("Waiting");
    const serving = w.find("section");
    expect(serving.text()).toContain("A-001");
    expect(serving.text()).toContain("Room 2");
    expect(w.find('[data-slot="queue-live"]').text()).toContain("Updated 12 s ago");
  });

  it("shows a loud banner when it is the patient's turn and hides the estimate", () => {
    const w = mount(NqWaitingScreen, { props: { entries: queue({ status: "called", room: "3", calledAt: NOW }), entryId: "me", now: NOW } });
    expect(w.attributes("data-status")).toBe("called");
    const alert = w.find('[data-slot="alert"]');
    expect(alert.attributes("role")).toBe("alert");
    expect(alert.text()).toContain("It is your turn");
    expect(alert.text()).toContain("Please go to Room 3 now.");
    expect(w.text()).not.toContain("Estimated wait");
  });

  it("vibrates once when the status turns to called", async () => {
    const vibrate = vi.fn();
    Object.defineProperty(navigator, "vibrate", { value: vibrate, configurable: true });
    const w = mount(NqWaitingScreen, { props: { entries: queue(), entryId: "me", now: NOW } });
    await w.setProps({ entries: queue({ status: "called" }) });
    expect(vibrate).toHaveBeenCalledWith([200, 100, 200]);
    await w.setProps({ entries: queue({ status: "serving" }) });
    expect(vibrate).toHaveBeenCalledTimes(1);
    delete (navigator as unknown as { vibrate?: unknown }).vibrate;
  });

  it("warns when offline, renders nothing for an unknown entry and offers Leave only while waiting", () => {
    const off = mount(NqWaitingScreen, { props: { entries: queue(), entryId: "me", connection: "offline", now: NOW, onLeave: () => {} } });
    expect(off.text()).toContain("You are offline");
    expect(off.text()).toContain("Leave the line");
    expect(mount(NqWaitingScreen, { props: { entries: queue(), entryId: "nope" } }).html()).toBe("<!--v-if-->");
    const done = mount(NqWaitingScreen, { props: { entries: queue({ status: "done" }), entryId: "me", onLeave: () => {} } });
    expect(done.text()).not.toContain("Leave the line");
    expect(done.text()).toContain("Visit finished");
  });
});

describe("NqQueueLiveIndicator", () => {
  it("names the connection in words", () => {
    const w = mount(NqQueueLiveIndicator, { props: { connection: "reconnecting" } });
    expect(w.attributes("aria-label")).toBe("Connection: Reconnecting");
    expect(w.text()).toContain("Reconnecting");
  });
});
