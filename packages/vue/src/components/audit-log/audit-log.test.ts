import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { changeKind, diffRecords, expiringCount, formatChangeValue, NqAuditLog, retentionCutoff, type AuditEntry } from ".";

const entries: AuditEntry[] = [
  {
    id: "a1",
    at: "2026-03-10T09:12:00Z",
    actor: { id: "u1", name: "Sara Alharbi", email: "sara@example.com" },
    action: "member.role_changed",
    entity: { type: "member", label: "Omar Khalid" },
    channel: "web",
    ip: "10.0.0.1",
    changes: diffRecords({ role: "member", seats: 1 }, { role: "admin", plan: "pro" }),
  },
  { id: "a2", at: "2026-03-11T09:12:00Z", actor: null, action: "invoice.created", entity: { type: "invoice" }, channel: "api" },
];

afterEach(() => {
  document.body.innerHTML = "";
});

describe("audit rules", () => {
  it("diffs records and classifies the changes", () => {
    const d = diffRecords({ role: "member", seats: 1 }, { role: "admin", plan: "pro" });
    expect(d.map((c) => [c.field, changeKind(c)])).toEqual([
      ["plan", "added"],
      ["role", "changed"],
      ["seats", "removed"],
    ]);
    expect(formatChangeValue(null)).toBe("");
    expect(retentionCutoff(null)).toBeNull();
    expect(expiringCount(entries, null)).toBe(0);
  });
});

describe("NqAuditLog", () => {
  const mountLog = (props: Record<string, unknown> = {}) =>
    mount(NqAuditLog, { props: { entries, actionLabels: { "member.role_changed": "Role changed" }, entityLabels: { member: "Member" }, ...props }, attachTo: document.body });

  it("renders the toolbar and a row per entry, newest first, with the system actor", () => {
    const w = mountLog({ class: "mine" });
    expect(w.attributes("data-slot")).toBe("audit-log");
    expect(w.classes()).toContain("mine");
    const rows = w.findAll("tbody tr");
    expect(rows).toHaveLength(2);
    expect(rows[0]!.text()).toContain("System");
    expect(rows[0]!.text()).toContain("API");
    expect(rows[1]!.text()).toContain("Sara Alharbi");
    expect(rows[1]!.text()).toContain("Role changed");
    expect(rows[1]!.text()).toContain("member.role_changed");
    expect(w.find('input[type="search"]').attributes("placeholder")).toBe("Search actor, action or entity");
    expect(w.text()).not.toContain("10.0.0.1");
  });

  it("searches, and shows the no-match empty state", async () => {
    const w = mountLog();
    await w.find('input[type="search"]').setValue("sara");
    expect(w.findAll("tbody tr")).toHaveLength(1);
    await w.find('input[type="search"]').setValue("zzzz");
    expect(w.text()).toContain("No matching results");
  });

  it("shows the first-run empty state", () => {
    const w = mountLog({ entries: [] });
    expect(w.text()).toContain("No activity yet");
  });

  it("opens the details dialog with the before and after table", async () => {
    const w = mountLog();
    await w.findAll("tbody tr")[1]!.trigger("click");
    await flushPromises();
    const d = document.body.querySelector('[data-slot="audit-log-details"]') as HTMLElement;
    expect(d).toBeTruthy();
    expect(d.textContent).toContain("Role changed");
    expect(d.textContent).toContain("10.0.0.1");
    expect(d.querySelector("table")?.getAttribute("data-slot")).toBe("audit-changes");
    const kinds = [...d.querySelectorAll("tr[data-kind]")].map((r) => r.getAttribute("data-kind"));
    expect(kinds).toEqual(["added", "changed", "removed"]);
    expect(d.textContent).toContain("3 fields");
  });

  it("shows the retention setting with the expiring warning", () => {
    const w = mountLog({ retention: { days: 30 }, entries: [{ ...entries[0]!, at: "2020-01-01T00:00:00Z" }, entries[1]] });
    const section = w.find('[data-slot="audit-retention"]');
    expect(section.exists()).toBe(true);
    expect(section.text()).toContain("Retention");
    expect(section.text()).toContain("2 entries are older than this and will be deleted.");
  });

  it("calls onRefresh from the Refresh button", async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const w = mountLog({ onRefresh });
    await w.findAll("button").find((b) => b.text().includes("Refresh"))!.trigger("click");
    await flushPromises();
    expect(onRefresh).toHaveBeenCalled();
  });
});
