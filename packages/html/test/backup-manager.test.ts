// The Blade backup-manager example (packages/php/examples/rendered/backup-manager.html) under real Alpine.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = (ms = 40) => new Promise((r) => setTimeout(r, ms));

beforeAll(() => {
  Alpine.plugin(nasaq);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).Alpine = Alpine;
  Alpine.start();
});

afterEach(() => {
  for (const el of [...document.body.children]) {
    Alpine.destroyTree(el as HTMLElement);
    el.remove();
  }
});

async function mount() {
  const host = document.createElement("div");
  host.innerHTML = rendered("backup-manager");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host.querySelector<HTMLElement>('[data-slot="backup-manager"]')!;
}

const visible = (el: Element | null) => !!el && (el as HTMLElement).style.display !== "none";
const hidden = (el: HTMLElement) => getComputedStyle(el).display === "none";
const button = (scope: ParentNode, text: string) => [...scope.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.trim() === text)!;
const type = async (input: HTMLInputElement, value: string) => {
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await tick();
};
const restoreDialog = () =>
  [...document.body.querySelectorAll<HTMLElement>('[data-slot="dialog-content"]')].find((c) => c.querySelector('[data-slot="dialog-title"]')?.textContent?.includes("Restore"))!;

describe("backup-manager (Blade example)", () => {
  it("renders the summary, the history newest first and the schedule", async () => {
    const root = await mount();
    const rows = [...root.querySelectorAll<HTMLElement>('[data-slot="backup"]')];
    expect(rows.map((r) => r.getAttribute("data-status"))).toEqual(["completed", "completed", "failed", "completed"]);
    expect(rows[2]!.textContent).toContain("Not enough disk space.");
    expect(rows[3]!.textContent).toContain("Before the v2 migration");
    expect(root.querySelector('[data-slot="backup-summary"]')!.textContent).toContain("3 backups");
    expect(root.querySelector('[data-slot="backup-summary"]')!.textContent).toContain("3.5 GB");
    expect(root.querySelector('[data-slot="backup-prune"]')!.textContent).toBe("Nothing would be deleted right now.");
    expect(button(root, "Save schedule").disabled).toBe(true);
  });

  it("previews what retention would delete and validates the numbers", async () => {
    const root = await mount();
    const keep = root.querySelectorAll<HTMLInputElement>('input[inputmode="numeric"]')[0]!;
    await type(keep, "1");
    expect(root.querySelector('[data-slot="backup-prune"]')!.textContent).toBe("1 backup would be deleted at the next run.");
    expect(button(root, "Save schedule").disabled).toBe(false);
    await type(keep, "0");
    expect(hidden(root.querySelector<HTMLElement>('[data-slot="backup-prune"]')!)).toBe(true);
    expect(keep.getAttribute("aria-invalid")).toBe("true");
    expect(visible(keep.closest('[data-slot="field"]')!.querySelector('[data-slot="field-error"]'))).toBe(true);
    expect(button(root, "Save schedule").disabled).toBe(true);
  });

  it("saves the schedule through nq-backup-save and shows the notice", async () => {
    const root = await mount();
    let seen: { schedule: { frequency: string; time: string }; retention: { keepLast: number } } | undefined;
    root.addEventListener("nq-backup-save", (e) => {
      const d = (e as CustomEvent).detail;
      seen = { schedule: d.schedule, retention: d.retention };
      d.resolve();
    });
    await type(root.querySelectorAll<HTMLInputElement>('input[inputmode="numeric"]')[0]!, "7");
    button(root, "Save schedule").click();
    await tick(80);
    expect(seen!.retention.keepLast).toBe(7);
    expect(seen!.schedule).toMatchObject({ frequency: "daily", time: "02:30" });
    expect(root.textContent).toContain("Schedule saved.");
    expect(button(root, "Save schedule").disabled).toBe(true);
  });

  it("shows the error when an action fails", async () => {
    const root = await mount();
    root.addEventListener("nq-backup-run", (e) => (e as CustomEvent).detail.waitUntil(Promise.resolve({ error: "Disk is full." })));
    button(root, "Back up now").click();
    await tick(80);
    const alert = [...root.querySelectorAll<HTMLElement>('[data-slot="alert"]')].find((a) => visible(a.parentElement) && a.textContent?.includes("Disk is full."));
    expect(alert).toBeTruthy();
  });

  it("gates the restore behind the acknowledgement", async () => {
    const root = await mount();
    const ids: string[] = [];
    root.addEventListener("nq-backup-restore", (e) => {
      ids.push((e as CustomEvent).detail.id);
      (e as CustomEvent).detail.resolve();
    });
    root.querySelector<HTMLButtonElement>('button[aria-label^="Restore "]')!.click();
    await tick();
    const dialog = restoreDialog();
    expect(dialog.textContent).toContain("A safety backup of the current data is taken first");
    const confirm = button(dialog, "Restore backup");
    expect(confirm.disabled).toBe(true);
    dialog.querySelector<HTMLButtonElement>('[role="checkbox"]')!.click();
    await tick();
    expect(confirm.disabled).toBe(false);
    confirm.click();
    await tick(80);
    expect(ids).toEqual(["b1"]);
  });

  it("asks before deleting, then fires nq-backup-delete", async () => {
    const root = await mount();
    const ids: string[] = [];
    root.addEventListener("nq-backup-delete", (e) => {
      ids.push((e as CustomEvent).detail.id);
      (e as CustomEvent).detail.resolve();
    });
    button(root.querySelector('[data-slot="backup"]')!, "Delete").click();
    await tick();
    expect(ids).toHaveLength(0);
    const confirm = [...document.body.querySelectorAll<HTMLButtonElement>('[data-slot="alert-dialog-action"]')].find((b) => b.textContent?.trim() === "Delete backup")!;
    confirm.click();
    await tick(80);
    expect(ids).toHaveLength(1);
  });
});
