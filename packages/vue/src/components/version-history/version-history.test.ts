import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { NqVersionHistory, type HistoryVersion } from ".";
import { diffLines, foldDiff } from "./diff";

const versions: HistoryVersion[] = [
  { id: "a", version: 1, savedAt: "2026-09-27T09:00:00Z", content: "one\ntwo" },
  { id: "c", version: 3, savedAt: "2026-09-29T09:00:00Z", author: "Sara", note: "Third", content: "one\ntwo\nthree" },
  { id: "b", version: 2, savedAt: "2026-09-28T09:00:00Z", content: "one\nTWO" },
];

describe("NqVersionHistory", () => {
  it("lists versions newest first and marks the current one", () => {
    const w = mount(NqVersionHistory, { props: { versions } });
    expect(w.attributes("data-slot")).toBe("version-history");
    const rows = w.findAll("[data-version-row]");
    expect(rows.map((r) => r.attributes("data-version-row"))).toEqual(["3", "2", "1"]);
    expect(rows[0]!.text()).toContain("Current");
    expect(rows[0]!.text()).toContain("by Sara");
    expect(w.text()).toContain("Choose a version");
  });

  it("selects a version, shows the read-only preview and emits select", async () => {
    const w = mount(NqVersionHistory, { props: { versions } });
    await w.findAll("[data-version-row] button")[1]!.trigger("click");
    expect(w.emitted("select")![0]![0]).toMatchObject({ id: "b" });
    expect(w.find("h2").text()).toBe("Version 2");
    expect(w.text()).toContain("Read only");
    expect(w.find('[data-slot="empty-state"]').exists()).toBe(false);
  });

  it("restores after a confirmation and shows a returned error", async () => {
    const onRestore = vi.fn().mockResolvedValue({ error: "Nope" });
    const w = mount(NqVersionHistory, { props: { versions, defaultSelectedId: "b", onRestore }, attachTo: document.body });
    const restore = w.findAll("button").find((b) => b.text().includes("Restore this version"))!;
    await restore.trigger("click");
    await flushPromises();
    expect(document.querySelector('[role="alertdialog"]')).not.toBeNull();
    document.querySelector<HTMLButtonElement>('[data-slot="version-restore-confirm"]')!.click();
    await flushPromises();
    expect(onRestore).toHaveBeenCalledWith(expect.objectContaining({ id: "b" }));
    expect(w.find('[role="alert"]').text()).toBe("Nope");
    w.unmount();
  });

  it("has no restore button without onRestore", () => {
    const w = mount(NqVersionHistory, { props: { versions, defaultSelectedId: "b" } });
    expect(w.text()).not.toContain("Restore this version");
  });

  it("shows empty and loading states", () => {
    expect(mount(NqVersionHistory, { props: { versions: [] } }).text()).toContain("No versions yet");
    expect(mount(NqVersionHistory, { props: { versions, loading: true } }).attributes("aria-busy")).toBe("true");
  });
});

describe("version-history diff", () => {
  it("diffs and folds", () => {
    const lines = diffLines("a\nb\nc", "a\nB\nc");
    expect(lines.map((l) => l.type)).toEqual(["same", "del", "add", "same"]);
    const many = diffLines(Array.from({ length: 20 }, (_, i) => `l${i}`).join("\n"), ["x", ...Array.from({ length: 19 }, (_, i) => `l${i + 1}`)].join("\n"));
    expect(foldDiff(many, 3).some((i) => i.type === "gap")).toBe(true);
  });
});
