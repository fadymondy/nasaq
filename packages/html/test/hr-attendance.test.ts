// The Blade hr-attendance example (packages/php/examples/rendered/hr-attendance.html) under real Alpine.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { describe, expect, it, vi } from "vitest";
import { attendanceLateMinutes } from "../src/alpine/hr-attendance-logic";
import { setup, tick } from "./_float-setup";

setup();
vi.setConfig({ testTimeout: 30000 });

async function open() {
  document.body.innerHTML = "";
  const host = document.createElement("div");
  host.innerHTML = readFileSync(resolve(process.cwd(), "../php/examples/rendered/hr-attendance.html"), "utf8");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

const root = () => document.querySelector<HTMLElement>('[data-slot="hr-attendance-root"]')!;
const marker = () => document.querySelector<HTMLElement>('[data-slot="attendance-marker"]')!;
const balances = () => document.querySelector<HTMLElement>('[data-slot="leave-balances"]')!;
const requests = () => document.querySelector<HTMLElement>('[data-slot="leave-request-list"]')!;
const payroll = () => document.querySelector<HTMLElement>('[data-slot="payroll-runs"]')!;
const data = () => Alpine.$data(root()) as any;
const visible = (el: Element | null | undefined) => !!el && (el as HTMLElement).style.display !== "none";
const btn = (scope: ParentNode, label: string) => [...scope.querySelectorAll<HTMLElement>("button")].find((b) => b.textContent?.trim() === label);
const dialogs = () => [...document.querySelectorAll<HTMLElement>('[role="dialog"]')];

describe("hr-attendance (Blade example)", () => {
  it("renders the marker with the worked hours, the punches and the lateness", async () => {
    await open();
    expect(marker().getAttribute("data-state")).toBe("out");
    expect(marker().textContent).toContain("Clocked out");
    expect(marker().querySelector("bdi")!.textContent).toBe("7h 25m");
    expect(marker().querySelectorAll("ol li")).toHaveLength(4);
    expect(marker().textContent).toContain("Clocked in");
    const first = data().punches[0].at;
    const late = attendanceLateMinutes(first, "09:00", 5);
    expect(marker().textContent).toContain(late ? `Clocked in ${late}m late` : "On time");
    expect(visible(btn(marker(), "Clock in"))).toBe(true);
    expect(visible(btn(marker(), "Clock out"))).toBe(false);
  });

  it("clocks in through hr-punch, and a veto keeps the old state", async () => {
    await open();
    const seen: string[] = [];
    root().addEventListener("hr-punch", (e) => {
      const d = (e as CustomEvent).detail;
      seen.push(d.kind);
      if (seen.length === 1) d.fail("Offline");
    });
    btn(marker(), "Clock in")!.click();
    await tick();
    expect(data().punches).toHaveLength(4);
    expect(marker().textContent).toContain("Offline");
    btn(marker(), "Clock in")!.click();
    await tick();
    expect(seen).toEqual(["in", "in"]);
    expect(marker().getAttribute("data-state")).toBe("in");
    expect(visible(btn(marker(), "Start break"))).toBe(true);
    expect(visible(btn(marker(), "Clock in"))).toBe(false);
    expect(marker().querySelectorAll("ol li")).toHaveLength(5);
    btn(marker(), "Start break")!.click();
    await tick();
    expect(marker().getAttribute("data-state")).toBe("break");
    expect(visible(btn(marker(), "End break"))).toBe(true);
  });

  it("works out the leave balances from the requests of the employee", async () => {
    await open();
    const cards = balances().querySelectorAll('[data-slot="leave-balance"]');
    expect(cards).toHaveLength(3);
    const annual = cards[0] as HTMLElement;
    expect(annual.textContent).toContain("Annual leave");
    expect(annual.textContent).toContain("days left");
    expect(annual.textContent).toContain("Earned monthly");
    expect(annual.textContent).toContain("Up to 5 carry over");
    expect(annual.querySelector('[role="progressbar"]')).not.toBeNull();
    expect((cards[2] as HTMLElement).textContent).toContain("No limit");
    // Omar's sick leave does not count against Sara.
    expect((cards[1] as HTMLElement).textContent).toMatch(/10\s*days left/);
  });

  it("lists every request and approves one from the row menu", async () => {
    await open();
    expect(data().reqRows).toHaveLength(4);
    expect(requests().textContent).toContain("Omar Haddad");
    expect(requests().textContent).toContain("Lina Aziz");
    const events: string[] = [];
    root().addEventListener("hr-leave-decide", (e) => events.push(`${(e as CustomEvent).detail.request.id}:${(e as CustomEvent).detail.decision}`));
    requests().querySelector<HTMLElement>("table, [role='table'], [data-slot='data-table']")!.dispatchEvent(
      new CustomEvent("nq-data-table-action", { bubbles: true, detail: { action: "approve", row: { id: "r4" } } }),
    );
    await tick();
    expect(events).toEqual(["r4:approved"]);
    expect(data().requests.find((r: any) => r.id === "r4").status).toBe("approved");
    expect(data().reqRows.find((r: any) => r.id === "r4").status).toBe("approved");
    // Approving again does nothing: the request is no longer pending.
    requests().querySelector<HTMLElement>("[data-slot='data-table']")!.dispatchEvent(
      new CustomEvent("nq-data-table-action", { bubbles: true, detail: { action: "reject", row: { id: "r4" } } }),
    );
    await tick();
    expect(data().rej.open).toBe(false);
  });

  it("rejects with a note through the dialog, and a failure shows the message", async () => {
    await open();
    const table = requests().querySelector<HTMLElement>("[data-slot='data-table']")!;
    table.dispatchEvent(new CustomEvent("nq-data-table-action", { bubbles: true, detail: { action: "reject", row: { id: "r2" } } }));
    await tick();
    expect(data().rej.open).toBe(true);
    expect(dialogs().some((d) => d.textContent?.includes("Reject this request?"))).toBe(true);
    data().rej.note = "Busy week";
    const calls: any[] = [];
    root().addEventListener("hr-leave-decide", (e) => {
      const d = (e as CustomEvent).detail;
      calls.push(d);
      if (calls.length === 1) d.fail("Server said no");
    });
    await data().submitReject();
    await tick();
    expect(data().listError).toBe("Server said no");
    expect(data().rej.open).toBe(true);
    await data().submitReject();
    await tick();
    expect(calls[1].note).toBe("Busy week");
    expect(data().rej.open).toBe(false);
    expect(data().requests.find((r: any) => r.id === "r2")).toMatchObject({ status: "rejected", note: "Busy week" });
  });

  it("checks a leave request before it is sent and adds a pending one", async () => {
    await open();
    data().openRequest("annual");
    await tick();
    expect(data().req.open).toBe(true);
    expect(dialogs().some((d) => d.textContent?.includes("Request leave"))).toBe(true);
    // End before start is refused.
    data().req.start = "2026-11-10";
    await tick();
    expect(data().req.end).toBe("2026-11-10");
    data().req.end = "2026-11-05";
    await tick();
    expect(data().shownProblem()).toContain("before the start date");
    data().req.end = "2026-11-12";
    await tick();
    expect(data().daysOk()).toBe(true);
    expect(data().daysText()).toMatch(/working days/);
    // Overlap with Sara's pending request.
    data().req.start = "2026-10-12";
    data().req.end = "2026-10-12";
    await tick();
    expect(data().shownProblem()).toContain("already have leave");
    data().req.start = "2026-11-10";
    data().req.end = "2026-11-12";
    await tick();
    const got: any[] = [];
    root().addEventListener("hr-leave-request", (e) => got.push((e as CustomEvent).detail.input));
    await data().submitRequest();
    await tick();
    expect(got).toHaveLength(1);
    expect(got[0]).toMatchObject({ typeId: "annual", start: "2026-11-10", end: "2026-11-12" });
    expect(data().req.open).toBe(false);
    expect(data().requests).toHaveLength(5);
    expect(data().reqRows).toHaveLength(5);
  });

  it("shows the payroll runs with totals and moves a draft through approve and paid", async () => {
    await open();
    expect(data().runRows).toHaveLength(2);
    expect(data().runRows[0].period).toMatch(/2026/);
    // September: gross 850000+100000+25000+700000+80000+640000+60000 = 2455000 minor, in dollars 24550.
    expect(data().runRows[0].gross).toBe(24550);
    expect(data().runRows[0].net).toBe(24550 - 2290 * 1);
    expect(payroll().textContent).toContain("Payroll runs");
    data().openRun("run-sep");
    await tick();
    expect(data().runDlg.open).toBe(true);
    expect(data().lineRows).toHaveLength(3);
    expect(data().totals().gross).toContain("24,550");
    const order: string[] = [];
    root().addEventListener("hr-payroll-approve", (e) => {
      order.push("approve");
      if (order.length === 1) (e as CustomEvent).detail.fail("Needs a second signer");
    });
    root().addEventListener("hr-payroll-paid", () => order.push("paid"));
    await data().approveRun();
    expect(data().runDlg.error).toBe("Needs a second signer");
    expect(data().runById("run-sep").status).toBe("draft");
    await data().approveRun();
    expect(data().runById("run-sep").status).toBe("approved");
    expect(data().runRows.find((r: any) => r.id === "run-sep").status).toBe("approved");
    // A paid step needs an approved run; a draft one is ignored.
    await data().payRun();
    expect(data().runById("run-sep").status).toBe("paid");
    expect(order).toEqual(["approve", "approve", "paid"]);
    // Paid runs cannot be approved again.
    await data().approveRun();
    expect(order).toHaveLength(3);
  });

  it("opens the run detail from a row click and the View details action", async () => {
    await open();
    const table = payroll().querySelector<HTMLElement>("[data-slot='data-table']")!;
    table.dispatchEvent(new CustomEvent("nq-data-table-row-click", { bubbles: true, detail: { row: { id: "run-aug" } } }));
    await tick();
    expect(data().runDlg).toMatchObject({ open: true, id: "run-aug" });
    expect(data().runTitle()).toMatch(/Payroll for .*2026/);
    data().runDlg.open = false;
    table.dispatchEvent(new CustomEvent("nq-data-table-action", { bubbles: true, detail: { action: "view", row: { id: "run-sep" } } }));
    await tick();
    expect(data().runDlg.id).toBe("run-sep");
  });
});
