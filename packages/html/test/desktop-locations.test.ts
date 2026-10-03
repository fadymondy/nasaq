// The Blade desktop-locations example (packages/php/examples/rendered/desktop-locations.html) under real Alpine.
import { describe, expect, it, vi } from "vitest";
import { mount, setup, tick } from "./_float-setup";

setup();

const slot = (name: string) => document.querySelector<HTMLElement>(`[data-slot="${name}"]`);
const type = (el: HTMLInputElement, value: string) => {
  el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
};
const waitable = (root: HTMLElement, name: string, make: (detail: any) => Promise<unknown>, seen: any[] = []) => {
  root.addEventListener(name, (e) => {
    const d = (e as CustomEvent).detail;
    seen.push(d);
    d.waitUntil(make(d));
  });
  return seen;
};

async function setupRoot() {
  const host = await mount("desktop-locations");
  const root = host.querySelector<HTMLElement>('[data-slot="desktop-locations"]')!;
  return { host, root };
}

describe("desktop-locations (Blade example)", () => {
  it("renders the rows with status, default badge and permission switches", async () => {
    const { root } = await setupRoot();
    const rows = [...root.querySelectorAll<HTMLElement>('[data-slot="desktop-location"]')];
    expect(rows.map((r) => r.dataset.status)).toEqual(["ready", "ready", "missing"]);
    expect(rows[0]!.textContent).toContain("Default");
    expect(rows[0]!.textContent).toContain("1,240");
    expect(rows[2]!.textContent).toContain("Folder not found");
    const switches = rows[0]!.querySelectorAll<HTMLElement>('[role="switch"]');
    expect([...switches].map((s) => s.getAttribute("aria-checked"))).toEqual(["true", "true", "true"]);
    // The missing folder's switches are locked.
    for (const s of rows[2]!.querySelectorAll<HTMLElement>('[role="switch"]')) expect(s.hasAttribute("disabled")).toBe(true);
    // Write and index are off and locked while read is off... here read is on, so they are enabled on a ready row.
    expect(rows[1]!.querySelectorAll<HTMLElement>('[role="switch"]')[1]!.hasAttribute("disabled")).toBe(false);
  });

  it("fires nq-location-permissions on a switch, and turning read off turns the others off", async () => {
    const { root } = await setupRoot();
    const seen = waitable(root, "nq-location-permissions", () => Promise.resolve());
    const row = root.querySelectorAll<HTMLElement>('[data-slot="desktop-location"]')[0]!;
    const [read, write, index] = [...row.querySelectorAll<HTMLElement>('[role="switch"]')];
    write!.click();
    await vi.waitFor(() => expect(seen).toHaveLength(1), { timeout: 2000 });
    expect(seen[0].id).toBe("l1");
    expect(seen[0].permissions).toEqual({ read: true, write: false, index: true });
    // The row is busy until the first change settles; a click before then is ignored.
    await vi.waitFor(() => expect(read!.hasAttribute("disabled")).toBe(false), { timeout: 2000 });
    read!.click();
    await vi.waitFor(() => expect(seen).toHaveLength(2), { timeout: 2000 });
    expect(seen[1].permissions).toEqual({ read: false, write: false, index: false });
    expect(write!.hasAttribute("disabled")).toBe(true);
    expect(index!.getAttribute("aria-checked")).toBe("false");
  });

  it("puts the switch back and shows the message when the change fails", async () => {
    const { root } = await setupRoot();
    waitable(root, "nq-location-permissions", () => Promise.resolve({ error: "Read-only volume" }));
    const row = root.querySelectorAll<HTMLElement>('[data-slot="desktop-location"]')[0]!;
    const write = row.querySelectorAll<HTMLElement>('[role="switch"]')[1]!;
    write.click();
    await tick(80);
    expect(write.getAttribute("aria-checked")).toBe("true");
    expect(root.textContent).toContain("Read-only volume");
  });

  it("shows the generic error when nobody listens", async () => {
    const { root } = await setupRoot();
    const row = root.querySelectorAll<HTMLElement>('[data-slot="desktop-location"]')[0]!;
    row.querySelector<HTMLButtonElement>('button[aria-label^="Re-index"]')!.click();
    await tick(80);
    expect(root.textContent).toContain("Something went wrong. Try again.");
  });

  it("validates the path in the add dialog, warns, browses and fires nq-location-add", async () => {
    const { root } = await setupRoot();
    const seen = waitable(root, "nq-location-add", () => Promise.resolve());
    waitable(root, "nq-location-browse", () => Promise.resolve("D:\\work\\x"));
    root.querySelector<HTMLButtonElement>(":scope > header button")!.click();
    await tick(80);
    const form = slot("desktop-location-add")!;
    expect(form).toBeTruthy();
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await tick();
    expect(seen).toHaveLength(0);
    const errs = () => [...form.querySelectorAll<HTMLElement>('[role="alert"]')].filter((a) => a.style.display !== "none").map((a) => a.textContent?.trim());
    expect(errs()).toContain("Enter the folder path.");
    const input = form.querySelector<HTMLInputElement>("input")!;
    type(input, "relative/dir");
    await tick();
    expect(errs()).toContain("Use a full path that starts at a drive, a share or the root.");
    type(input, "c:/Users/sara/projects/app/");
    await tick();
    expect(errs()).toContain("This folder is already on the list.");
    type(input, "/home/sara/notes/sub");
    await tick();
    expect(form.textContent).toContain("Already covered by /home/sara/notes.");
    // Browse fills the path.
    [...form.querySelectorAll("button")].find((b) => b.textContent?.includes("Browse"))!.click();
    await tick(60);
    expect(input.value).toBe("D:\\work\\x");
    // Write and index follow read.
    const switches = [...form.querySelectorAll<HTMLElement>('[role="switch"]')];
    expect(switches.map((s) => s.getAttribute("aria-checked"))).toEqual(["true", "false", "true"]);
    switches[0]!.click();
    await tick(40);
    expect(switches.map((s) => s.getAttribute("aria-checked"))).toEqual(["false", "false", "false"]);
    switches[0]!.click();
    await tick(40);
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await tick(60);
    expect(seen).toHaveLength(1);
    expect(seen[0].path).toBe("D:\\work\\x");
    expect(seen[0].permissions.read).toBe(true);
    await tick(400);
    expect(slot("desktop-location-add")!.closest<HTMLElement>('[data-slot="dialog-content"]')!.style.display).toBe("none");
  });

  it("keeps the add dialog open with the host's error", async () => {
    const { root } = await setupRoot();
    waitable(root, "nq-location-add", () => Promise.resolve({ error: "Access denied" }));
    root.querySelector<HTMLButtonElement>(":scope > header button")!.click();
    await tick(80);
    const form = slot("desktop-location-add")!;
    type(form.querySelector<HTMLInputElement>("input")!, "/srv/data");
    await tick();
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await tick(60);
    expect(slot("desktop-location-add")!.textContent).toContain("Access denied");
  });

  it("asks before removing, then fires nq-location-remove", async () => {
    const { root } = await setupRoot();
    const seen = waitable(root, "nq-location-remove", () => Promise.resolve());
    const row = root.querySelectorAll<HTMLElement>('[data-slot="desktop-location"]')[1]!;
    row.querySelector<HTMLButtonElement>('button[aria-label^="Remove"]')!.click();
    await tick(80);
    const dlg = slot("desktop-location-remove")!;
    expect(dlg.textContent).toContain("Remove notes?");
    expect(dlg.textContent).toContain("/home/sara/notes");
    expect(seen).toHaveLength(0);
    [...dlg.querySelectorAll("button")].find((b) => b.textContent?.trim() === "Remove")!.click();
    await tick(60);
    expect(seen).toHaveLength(1);
    expect(seen[0].id).toBe("l2");
  });

  it("renders the picker with unusable locations disabled", async () => {
    const { host } = await setupRoot();
    const trigger = host.querySelector<HTMLElement>('[data-slot="desktop-location-picker"] [data-slot="select-trigger"]')!;
    expect(trigger.getAttribute("aria-label")).toBe("Save to");
    trigger.click();
    await tick(80);
    const items = [...document.querySelectorAll<HTMLElement>('[data-slot="select-item"]')];
    expect(items).toHaveLength(3);
    expect(items.filter((i) => i.textContent?.includes("unavailable"))).toHaveLength(2);
  });
});
