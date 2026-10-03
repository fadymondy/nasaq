import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NqAttendanceMarker, NqLeaveBalances, NqLeaveRequestDialog, NqLeaveRequestList, NqPayrollRuns, type AttendancePunch, type LeaveRequestRow, type LeaveType, type PayrollRun } from ".";
import { NasaqProvider } from "../../provider";

afterEach(() => {
  document.body.innerHTML = "";
});

const at = (h: number, m = 0) => new Date(2026, 8, 29, h, m).getTime();
const types: LeaveType[] = [
  { id: "annual", name: "Annual leave", annualDays: 21, accrual: "monthly", carryOverMax: 5 },
  { id: "sick", name: "Sick leave", annualDays: 2 },
  { id: "unpaid", name: "Unpaid leave", annualDays: 0, limited: false },
];
/** A button anywhere in the document (dialogs are teleported to the body). */
const bodyBtn = (text: string) => [...document.body.querySelectorAll("button")].find((b) => b.textContent?.trim() === text) as HTMLButtonElement | undefined;

describe("NqAttendanceMarker", () => {
  const mountMarker = (punches: AttendancePunch[], props: Record<string, unknown> = {}) =>
    mount(NqAttendanceMarker, { props: { punches, now: at(12), onPunch: vi.fn(async () => undefined), ...props }, attachTo: document.body });

  it("offers Clock in when out and reports the state", async () => {
    const onPunch = vi.fn(async () => undefined);
    const w = mountMarker([], { onPunch, class: "mine" });
    expect(w.attributes("data-slot")).toBe("attendance-marker");
    expect(w.attributes("data-state")).toBe("out");
    expect(w.classes()).toContain("mine");
    expect(w.text()).toContain("Clocked out");
    expect(w.text()).toContain("No punches yet today.");
    await w.findAll("button").find((b) => b.text() === "Clock in")!.trigger("click");
    await flushPromises();
    expect(onPunch).toHaveBeenCalledWith("in");
  });

  it("shows hours worked, lateness and the break and clock-out buttons when working", () => {
    const w = mountMarker([{ id: "1", kind: "in", at: at(9, 30) }], { shift: { start: "09:00", end: "17:00" } });
    expect(w.attributes("data-state")).toBe("in");
    expect(w.text()).toContain("2h 30m");
    expect(w.text()).toContain("Clocked in 30m late");
    const labels = w.findAll("button").map((b) => b.text());
    expect(labels).toEqual(expect.arrayContaining(["Start break", "Clock out"]));
    expect(labels).not.toContain("Clock in");
  });

  it("offers End break while on break and hides break buttons with breaks=false", () => {
    const punches: AttendancePunch[] = [
      { id: "1", kind: "in", at: at(9) },
      { id: "2", kind: "break-start", at: at(11) },
    ];
    const w = mountMarker(punches);
    expect(w.attributes("data-state")).toBe("break");
    expect(w.findAll("button").map((b) => b.text())).toContain("End break");
    const off = mountMarker(punches, { breaks: false });
    expect(off.findAll("button").map((b) => b.text())).toEqual(["Clock out"]);
  });

  it("shows the error from a failed punch", async () => {
    const w = mountMarker([], { onPunch: async () => ({ error: "Offline" }) });
    await w.find("button").trigger("click");
    await flushPromises();
    expect(w.find('[role="alert"]').text()).toBe("Offline");
    const thrown = mountMarker([], { onPunch: async () => Promise.reject(new Error("")) });
    await thrown.find("button").trigger("click");
    await flushPromises();
    expect(thrown.find('[role="alert"]').text()).toBe("That did not go through. Try again.");
  });
});

describe("NqLeaveBalances", () => {
  const requests = [
    { id: "a", typeId: "annual", start: "2026-03-01", end: "2026-03-05", status: "approved" as const },
    { id: "b", typeId: "sick", start: "2026-05-03", end: "2026-05-03", status: "pending" as const },
  ];

  it("renders a card per type with days left, unlimited types and a request button", async () => {
    const onRequest = vi.fn();
    const w = mount(NqLeaveBalances, { props: { types, requests, asOf: "2026-09-29", onRequest } });
    expect(w.attributes("data-slot")).toBe("leave-balances");
    const cards = w.findAll('[data-slot="leave-balance"]');
    expect(cards.map((c) => c.attributes("data-type"))).toEqual(["annual", "sick", "unpaid"]);
    expect(cards[0]!.text()).toContain("Earned monthly");
    expect(cards[0]!.text()).toContain("Up to 5 carry over");
    expect(cards[0]!.find('[role="progressbar"]').exists()).toBe(true);
    expect(cards[2]!.text()).toContain("No limit");
    expect(cards[2]!.find('[role="progressbar"]').exists()).toBe(false);
    await cards[1]!.find("button").trigger("click");
    expect(onRequest).toHaveBeenCalledWith("sick");
  });
});

describe("NqLeaveRequestDialog", () => {
  it("explains a missing date before sending and does not call onSubmit", async () => {
    const onSubmit = vi.fn(async () => undefined);
    mount(NqLeaveRequestDialog, { props: { open: true, types, requests: [], asOf: "2026-09-29", onSubmit }, attachTo: document.body });
    await flushPromises();
    bodyBtn("Send request")!.click();
    await flushPromises();
    expect(document.body.textContent).toContain("Pick both dates.");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("refuses an overdraft, an overlap and a backwards range, then sends a valid request", async () => {
    const onSubmit = vi.fn(async () => undefined);
    const requests = [{ id: "x", typeId: "annual", start: "2026-10-04", end: "2026-10-05", status: "approved" as const }];
    const w = mount(NqLeaveRequestDialog, { props: { open: true, types, requests, defaultTypeId: "sick", asOf: "2026-09-29", onSubmit }, attachTo: document.body });
    await flushPromises();
    const s = (w.vm as unknown as { $: { setupState: Record<string, unknown> } }).$.setupState;
    // Sunday 2026-10-11 to Wednesday 2026-10-14 is 4 working days (Friday and Saturday are the weekend); sick leave has 2.
    s.start = "2026-10-11";
    s.end = "2026-10-14";
    await flushPromises();
    expect(document.body.textContent).toContain("You do not have enough days available for this.");
    s.typeId = "annual";
    s.start = "2026-10-04";
    s.end = "2026-10-04";
    await flushPromises();
    expect(document.body.textContent).toContain("You already have leave on some of these days.");
    s.start = "2026-10-14";
    s.end = "2026-10-11";
    await flushPromises();
    expect(document.body.textContent).toContain("The end date is before the start date.");
    s.start = "2026-10-11";
    s.end = "2026-10-14";
    await flushPromises();
    expect(document.body.textContent).toContain("4 working days");
    bodyBtn("Send request")!.click();
    await flushPromises();
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ typeId: "annual", start: "2026-10-11", end: "2026-10-14", days: 4 }));
    expect(w.emitted("update:open")?.at(-1)).toEqual([false]);
  });
});

describe("NqLeaveRequestList", () => {
  const rows: LeaveRequestRow[] = [
    { id: "r1", employee: "Sara Alharbi", typeId: "annual", start: "2026-10-04", end: "2026-10-08", status: "pending" },
    { id: "r2", employee: "Omar Khaled", typeId: "sick", start: "2026-09-20", end: "2026-09-21", status: "approved" },
  ];

  it("lists requests with the employee column and approves", async () => {
    const onDecide = vi.fn(async () => undefined);
    const w = mount(NqLeaveRequestList, { props: { requests: rows, types, onDecide }, attachTo: document.body });
    expect(w.attributes("data-slot")).toBe("leave-request-list");
    expect(w.findAll("tbody tr")).toHaveLength(2);
    expect(w.text()).toContain("Sara Alharbi");
    await w.find('button[aria-label="Approve: Sara Alharbi"]').trigger("click");
    await flushPromises();
    expect(onDecide).toHaveBeenCalledWith(rows[0], "approved");
    expect(w.find('button[aria-label^="Approve: Omar"]').exists()).toBe(false);
  });

  it("asks for a note when rejecting", async () => {
    const onDecide = vi.fn(async () => undefined);
    const w = mount(NqLeaveRequestList, { props: { requests: rows, types, onDecide }, attachTo: document.body });
    await w.find('button[aria-label="Reject: Sara Alharbi"]').trigger("click");
    await flushPromises();
    expect(document.body.textContent).toContain("Reject this request?");
    const area = document.body.querySelector("textarea") as HTMLTextAreaElement;
    area.value = "Team is short";
    area.dispatchEvent(new Event("input"));
    await flushPromises();
    bodyBtn("Reject request")!.click();
    await flushPromises();
    expect(onDecide).toHaveBeenCalledWith(rows[0], "rejected", "Team is short");
  });

  it("hides the employee column in self mode and gives pending rows a menu to withdraw", async () => {
    const onWithdraw = vi.fn(async () => undefined);
    const w = mount(NqLeaveRequestList, { props: { requests: rows, types, mode: "self", onWithdraw }, attachTo: document.body });
    expect(w.find("thead").text()).not.toContain("Employee");
    expect(w.find('button[aria-label^="Approve"]').exists()).toBe(false);
    // Only the pending row has actions.
    expect(w.findAll('[data-slot="data-table-row-actions"]')).toHaveLength(1);
  });

  it("shows the empty state", () => {
    const w = mount(NqLeaveRequestList, { props: { requests: [], types } });
    expect(w.text()).toContain("No leave requests");
  });
});

describe("NqPayrollRuns", () => {
  const runs: PayrollRun[] = [
    {
      id: "run-09",
      period: "2026-09",
      status: "draft",
      payDate: "2026-09-28",
      lines: [
        { id: "l1", employee: "Sara Alharbi", basic: 650000, allowances: 100000, deductions: 62500 },
        { id: "l2", employee: "Omar Khaled", basic: 480000, deductions: 41000 },
      ],
    },
  ];

  it("shows totals in USD and opens the detail dialog to approve", async () => {
    const onApprove = vi.fn(async () => undefined);
    const w = mount(NqPayrollRuns, { props: { runs, onApprove }, attachTo: document.body });
    expect(w.attributes("data-slot")).toBe("payroll-runs");
    expect(w.text()).toContain("September 2026");
    expect(w.text()).toContain("$12,300.00");
    await w.find("tbody tr").trigger("click");
    await flushPromises();
    expect(document.body.textContent).toContain("Payroll for September 2026");
    expect(document.body.textContent).toContain("Sara Alharbi");
    bodyBtn("Approve run")!.click();
    await flushPromises();
    expect(onApprove).toHaveBeenCalledWith(runs[0]);
  });

  it("offers Mark as paid for an approved run and shows a step error", async () => {
    const onMarkPaid = vi.fn(async () => ({ error: "Bank rejected it" }));
    const w = mount(NqPayrollRuns, { props: { runs: [{ ...runs[0]!, status: "approved" }], onMarkPaid }, attachTo: document.body });
    await w.find("tbody tr").trigger("click");
    await flushPromises();
    bodyBtn("Mark as paid")!.click();
    await flushPromises();
    expect(onMarkPaid).toHaveBeenCalled();
    expect(document.body.textContent).toContain("Bank rejected it");
  });

  it("uses SAR in Arabic", () => {
    const w = mount(
      { components: { NqPayrollRuns, NasaqProvider }, setup: () => ({ runs }), template: `<NasaqProvider locale="ar"><NqPayrollRuns :runs="runs" /></NasaqProvider>` },
      { attachTo: document.body },
    );
    expect(w.text()).toMatch(/SAR|ر\.س/);
    expect(w.text()).toContain("مسيرات الرواتب");
  });
});
