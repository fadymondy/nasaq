// The Blade time-tracker example (packages/php/examples/rendered/time-tracker.html) under real Alpine.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { describe, expect, it, vi } from "vitest";
import { setup, tick } from "./_float-setup";

setup();
vi.setConfig({ testTimeout: 30000 });

async function open() {
  document.body.innerHTML = "";
  const host = document.createElement("div");
  host.innerHTML = readFileSync(resolve(process.cwd(), "../php/examples/rendered/time-tracker.html"), "utf8");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

const root = () => document.querySelector<HTMLElement>('[data-slot="time-tracker-root"]')!;
const timer = () => document.querySelector<HTMLElement>('[data-slot="time-tracker"]')!;
const list = () => document.querySelector<HTMLElement>('[data-slot="time-entry-list"]')!;
const sheet = () => document.querySelector<HTMLElement>('[data-slot="timesheet"]')!;
const clock = () => timer().querySelector<HTMLElement>('[role="timer"] bdi')!.textContent!.trim();
const visible = (el: Element | null | undefined) => !!el && (el as HTMLElement).style.display !== "none";
const btn = (scope: ParentNode, label: string) => [...scope.querySelectorAll<HTMLElement>("button")].find((b) => b.textContent?.trim() === label)!;
const selects = (scope: ParentNode) => [...scope.querySelectorAll<HTMLSelectElement>("select")];
async function choose(sel: HTMLSelectElement, value: string) {
  sel.value = value;
  sel.dispatchEvent(new Event("change", { bubbles: true }));
  await tick();
}
const data = () => Alpine.$data(root()) as any;
const dialog = () => document.querySelector<HTMLElement>('[role="dialog"]');

describe("time-tracker (Blade example)", () => {
  it("renders the idle timer, the entry groups and the timesheet", async () => {
    await open();
    expect(clock()).toBe("0:00:00");
    expect(timer().textContent).toContain("Choose a project");
    expect(visible(btn(timer(), "Start timer"))).toBe(true);
    expect(visible(btn(timer(), "Stop timer"))).toBe(false);
    expect(selects(timer())).toHaveLength(2);
    expect(selects(timer())[0]!.options).toHaveLength(3);
    const text = list().textContent!;
    expect(text).toContain("Header spacing");
    expect(text).toContain("Sitemap and meta");
    expect(text).toContain("1:30");
    expect(list().querySelectorAll("li")).toHaveLength(3);
    const rows = sheet().querySelectorAll("[data-slot=table-body] [role=row]");
    expect(rows.length).toBeGreaterThanOrEqual(3);
    expect(sheet().querySelector("[data-slot=table-footer]")!.textContent).toContain("Total");
  });

  it("needs a project before it starts", async () => {
    await open();
    btn(timer(), "Start timer").click();
    await tick();
    expect(timer().querySelector('[data-slot="field-error"]')!.textContent).toContain("Choose a project");
    expect(visible(timer().querySelector('[data-slot="field-error"]'))).toBe(true);
    expect(data().running).toBeNull();
  });

  it("starts and stops, locks the pickers while running, and logs on stop", async () => {
    const host = await open();
    const events: string[] = [];
    for (const n of ["time-start", "time-stop", "time-running-change", "time-entries-change"]) host.addEventListener(n, () => events.push(n));
    await choose(selects(timer())[0]!, "web");
    await choose(selects(timer())[1]!, "ui");
    btn(timer(), "Start timer").click();
    await tick();
    expect(data().running.projectId).toBe("web");
    expect(visible(btn(timer(), "Stop timer"))).toBe(true);
    expect(timer().textContent).toContain("Website / UI polish");
    expect(selects(timer())[0]!.disabled).toBe(true);
    expect(events).toContain("time-start");
    expect(events).toContain("time-running-change");
    data().running.startedAt -= 125000;
    await tick(1100);
    expect(clock()).toMatch(/^0:02:0\d$/);
    btn(timer(), "Stop timer").click();
    await tick();
    expect(data().running).toBeNull();
    expect(events).toContain("time-stop");
    expect(events).toContain("time-entries-change");
    expect(list().querySelectorAll("li")).toHaveLength(4);
    expect(selects(timer())[0]!.disabled).toBe(false);
  });

  it("lets a time-start listener veto", async () => {
    const host = await open();
    host.addEventListener("time-start", (e) => (e as CustomEvent).detail.fail("Over budget"));
    await choose(selects(timer())[0]!, "app");
    btn(timer(), "Start timer").click();
    await tick();
    expect(data().running).toBeNull();
    expect(timer().querySelector('[role="alert"]:not([data-slot])')!.textContent).toContain("Over budget");
  });

  it("adds an entry from the dialog, validating the duration", async () => {
    await open();
    btn(list(), "Add time").click();
    await tick(200);
    const dlg = dialog()!;
    expect(dlg).toBeTruthy();
    expect(dlg.textContent).toContain("Add time");
    btn(dlg, "Save").click();
    await tick();
    expect(dlg.textContent).toContain("Choose a project.");
    const project = selects(dlg)[0]!;
    await choose(project, "app");
    const duration = dlg.querySelector<HTMLInputElement>('input[dir="ltr"]')!;
    duration.value = "nonsense";
    duration.dispatchEvent(new Event("input", { bubbles: true }));
    btn(dlg, "Save").click();
    await tick();
    expect(duration.getAttribute("aria-invalid")).toBe("true");
    duration.value = "2h";
    duration.dispatchEvent(new Event("input", { bubbles: true }));
    btn(dlg, "Save").click();
    await tick(200);
    expect(data().entries).toHaveLength(4);
    expect(data().entries[0].seconds).toBe(7200);
    expect(list().querySelectorAll("li")).toHaveLength(4);
  });

  it("edits and deletes an entry", async () => {
    const host = await open();
    const events: string[] = [];
    host.addEventListener("time-entry-delete", () => events.push("del"));
    const first = list().querySelector<HTMLElement>('li button[aria-label^="Edit"]')!;
    first.click();
    await tick(200);
    const dlg = dialog()!;
    expect(dlg.textContent).toContain("Edit");
    const duration = dlg.querySelector<HTMLInputElement>('input[dir="ltr"]')!;
    expect(duration.value).toBe("1:30");
    duration.value = "3h";
    duration.dispatchEvent(new Event("input", { bubbles: true }));
    btn(dlg, "Save").click();
    await tick(200);
    expect(data().entries.find((e: any) => e.id === "1").seconds).toBe(10800);
    list().querySelector<HTMLElement>('li button[aria-label^="Delete"]')!.click();
    await tick();
    expect(events).toEqual(["del"]);
    expect(data().entries).toHaveLength(2);
  });

  it("moves the timesheet by day and week", async () => {
    await open();
    const range = () => sheet().querySelector<HTMLElement>("[aria-live]")!.textContent;
    const weekHead = sheet().querySelectorAll("[role=columnheader]").length;
    expect(weekHead).toBe(9);
    const before = range();
    sheet().querySelector<HTMLElement>('button[aria-label="Next"]')!.click();
    await tick();
    expect(range()).not.toBe(before);
    expect(sheet().querySelector("[data-slot=table-body]")!.textContent).toContain("Nothing logged");
    btn(sheet(), "Today").click();
    await tick();
    expect(range()).toBe(before);
    btn(sheet(), "Day").click();
    await tick();
    expect([...sheet().querySelectorAll<HTMLElement>("[role=columnheader]")].filter((h) => h.style.display !== "none")).toHaveLength(2);
  });
});
