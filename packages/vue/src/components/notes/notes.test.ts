import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NqNotes, NqNoteEditor, filterNotes, type Note } from ".";

afterEach(() => {
  document.body.innerHTML = "";
  vi.useRealTimers();
});

const now = Date.UTC(2026, 8, 29, 12);
const notes: Note[] = [
  { id: "a", title: "Launch plan", body: "<p>Ship it</p>", tags: ["x"], createdAt: now - 1000, updatedAt: now - 1000, pinned: true },
  { id: "b", title: "Ideas", body: "See [[Launch plan]]", format: "markdown", createdAt: now - 5000, updatedAt: now - 5000 },
  { id: "c", title: "Secret", body: "hidden", sealed: true, createdAt: now - 9000, updatedAt: now - 9000 },
];

describe("notes logic", () => {
  it("filters by query", () => {
    expect(filterNotes(notes, { query: "launch" }).map((n) => n.id)).toEqual(["a", "b"]);
  });
});

describe("NqNotes", () => {
  it("lists notes, grouping the pinned one, and hides sealed bodies", () => {
    const w = mount(NqNotes, { props: { notes, now }, attachTo: document.body });
    expect(w.attributes("data-slot")).toBe("notes");
    expect(w.findAll('[data-slot="note-row"]').length).toBe(3);
    expect(w.find('[data-slot="note-group"][data-group="pinned"]').exists()).toBe(true);
    const sealed = w.findAll('[data-slot="note-row"]').find((r) => r.text().includes("Secret"))!;
    expect(sealed.text()).not.toContain("hidden");
    w.unmount();
  });
  it("filters with the search box", async () => {
    const w = mount(NqNotes, { props: { notes, now }, attachTo: document.body });
    await w.find('[data-slot="notes-search"]').setValue("ideas");
    expect(w.findAll('[data-slot="note-row"]').length).toBe(1);
    w.unmount();
  });
  it("opens a note and shows the editor and word count", async () => {
    const w = mount(NqNotes, { props: { notes, now, onUpdate: vi.fn() }, attachTo: document.body });
    await w.findAll('[data-slot="note-open"]')[0]!.trigger("click");
    expect(w.find('[data-slot="note-editor-body"]').exists()).toBe(true);
    expect((w.find('[data-slot="note-title"]').element as HTMLInputElement).value).toBe("Launch plan");
    expect(w.find('[data-slot="note-footer"]').text()).toContain("4 words");
    w.unmount();
  });
  it("autosaves a title edit after the delay", async () => {
    vi.useFakeTimers();
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    const w = mount(NqNoteEditor, { props: { note: notes[1], onUpdate, autosaveDelay: 100, now }, attachTo: document.body });
    await w.find('[data-slot="note-title"]').setValue("Ideas 2");
    expect(w.find('[data-slot="note-save-status"]').attributes("data-status")).toBe("dirty");
    await vi.advanceTimersByTimeAsync(150);
    await flushPromises();
    expect(onUpdate).toHaveBeenCalledWith("b", { title: "Ideas 2", body: "See [[Launch plan]]" });
    expect(w.find('[data-slot="note-save-status"]').attributes("data-status")).toBe("saved");
    w.unmount();
  });
  it("shows the unlock form for a sealed note and reports a wrong password", async () => {
    const onUnlock = vi.fn().mockResolvedValue({ error: "Wrong password" });
    const w = mount(NqNoteEditor, { props: { note: notes[2], onUnlock, now }, attachTo: document.body });
    expect(w.find('[data-slot="note-unlock"]').exists()).toBe(true);
    expect(w.find('[data-slot="note-footer"]').exists()).toBe(false);
    await w.find('[data-slot="note-unlock"] input').setValue("nope");
    await w.find('[data-slot="note-unlock"]').trigger("submit");
    await flushPromises();
    expect(onUnlock).toHaveBeenCalledWith("c", "nope");
    expect(w.find('[role="alert"]').text()).toBe("Wrong password");
    w.unmount();
  });
  it("omits actions whose callback is missing", async () => {
    const w = mount(NqNotes, { props: { notes, now, onDuplicate: vi.fn() }, attachTo: document.body });
    await w.findAll('[data-slot="note-open"]')[0]!.trigger("click");
    expect(w.find('[data-slot="note-editor-body"] [data-slot="note-actions-trigger"]').exists()).toBe(true);
    w.unmount();
  });
});
