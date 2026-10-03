import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { NasaqProvider } from "../../provider";
import { NqBackupManager, formatBytes, type BackupRecord } from ".";

const now = new Date(2025, 0, 15, 12, 0, 0).getTime();
const backups: BackupRecord[] = [
  { id: "b1", createdAt: now - 3600_000, sizeBytes: 1_048_576, kind: "scheduled", status: "completed" },
  { id: "b2", createdAt: now - 7200_000, kind: "manual", status: "running", progress: 40 },
];
const base = () => ({
  backups,
  schedule: { enabled: true, frequency: "daily" as const, time: "02:30" },
  retention: { keepLast: 14, maxAgeDays: 60 },
  now,
  onRunNow: vi.fn().mockResolvedValue(undefined),
  onRestore: vi.fn().mockResolvedValue(undefined),
  onSaveSchedule: vi.fn().mockResolvedValue(undefined),
});

describe("NqBackupManager", () => {
  it("renders the rows with status and a progress bar for the running one", () => {
    const w = mount(NqBackupManager, { props: base() });
    expect(w.attributes("data-slot")).toBe("backup-manager");
    const rows = w.findAll('[data-slot="backup"]');
    expect(rows.map((r) => r.attributes("data-status"))).toEqual(["completed", "running"]);
    expect(w.find('[role="progressbar"]').exists()).toBe(true);
    expect(w.text()).toContain("1 MB");
  });

  it("disables Back up now while a backup runs", () => {
    const w = mount(NqBackupManager, { props: base() });
    const btn = w.findAll("button").find((b) => b.text() === "Backing up")!;
    expect(btn.attributes("disabled")).toBeDefined();
  });

  it("runs onRunNow when idle", async () => {
    const props = { ...base(), backups: [backups[0]!] };
    const w = mount(NqBackupManager, { props });
    await w.findAll("button").find((b) => b.text() === "Back up now")!.trigger("click");
    expect(props.onRunNow).toHaveBeenCalledTimes(1);
  });

  it("shows the empty state and the prune hint", () => {
    const w = mount(NqBackupManager, { props: { ...base(), backups: [] } });
    expect(w.text()).toContain("No backups yet");
    expect(w.find('[data-slot="backup-prune"]').text()).toBe("Nothing would be deleted right now.");
  });

  it("formats bytes", () => {
    expect(formatBytes(842)).toBe("842 B");
    expect(formatBytes(12.4 * 1024 * 1024)).toBe("12.4 MB");
  });

  it("is Arabic inside an Arabic provider", () => {
    const w = mount({
      components: { NasaqProvider, NqBackupManager },
      setup: () => ({ p: base() }),
      template: '<NasaqProvider locale="ar"><NqBackupManager v-bind="p" /></NasaqProvider>',
    });
    expect(w.text()).toContain("النسخ الاحتياطية");
  });
});
