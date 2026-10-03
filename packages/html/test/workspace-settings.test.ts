// The Blade workspace-settings example (packages/php/examples/rendered/workspace-settings.html) under real Alpine.
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
  document.body.innerHTML = "";
});

async function mount() {
  const host = document.createElement("div");
  host.innerHTML = rendered("workspace-settings");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  const q = (slot: string) => host.querySelector<HTMLElement>(`[data-slot="${slot}"]`)!;
  return { list: q("workspace-list"), settings: q("workspace-settings"), dialog: q("create-workspace-dialog") };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data = (el: Element): any => Alpine.$data(el as HTMLElement);
const listen = (root: Element, name: string, result?: unknown) => {
  const calls: Record<string, unknown>[] = [];
  root.addEventListener(name, (e) => {
    const d = (e as CustomEvent).detail;
    calls.push(d);
    d.wait(Promise.resolve(result));
  });
  return calls;
};

describe("workspace-settings (Blade example)", () => {
  it("renders the list, the settings sections and the create dialog", async () => {
    const { list, settings, dialog } = await mount();
    expect(list.textContent).toContain("Acme Studio");
    expect(list.textContent).toContain("12 members");
    expect(list.textContent).toContain("1 member");
    expect(settings.textContent).toContain("Delete this workspace");
    expect(settings.textContent).toContain("Leave workspace");
    expect(dialog).not.toBeNull();
  });

  it("opens a workspace through the list event and fires create", async () => {
    const { list } = await mount();
    const opens = listen(list, "open");
    const creates: unknown[] = [];
    list.addEventListener("create", () => creates.push(1));
    await data(list).open("w2");
    expect((opens[0]!.workspace as { name: string }).name).toBe("Sahab Labs");
    expect(data(list).opening).toBeNull();
    data(list).create();
    expect(creates).toHaveLength(1);
  });

  it("saves only a changed, valid form and reports the result", async () => {
    const { settings } = await mount();
    const renames = listen(settings, "rename");
    expect(data(settings).cannotSave()).toBe(true);
    data(settings).onName("Acme Two");
    expect(data(settings).cannotSave()).toBe(false);
    await data(settings).save();
    expect(renames[0]!.values).toEqual({ name: "Acme Two", slug: "acme-studio" });
    expect(data(settings).notice.text).toBe("Workspace updated.");
    expect(data(settings).cannotSave()).toBe(true);
  });

  it("validates the address and blocks one that is taken", async () => {
    const { settings } = await mount();
    const checks = listen(settings, "check-slug", { available: false });
    data(settings).onSlug("ab");
    expect(data(settings).slugMsg).toBe("Use at least 3 characters.");
    expect(data(settings).cannotSave()).toBe(true);
    data(settings).onSlug("Taken-One");
    expect(data(settings).slug).toBe("taken-one");
    expect(data(settings).check.status).toBe("checking");
    await tick(460);
    expect(checks[0]!.slug).toBe("taken-one");
    expect(data(settings).check.status).toBe("taken");
    expect(data(settings).slugMsg).toBe("That address is taken. Try another one.");
    expect(data(settings).cannotSave()).toBe(true);
  });

  it("shows a server error and keeps the form", async () => {
    const { settings } = await mount();
    listen(settings, "rename", { error: "Nope", fieldErrors: { slug: "Reserved" } });
    data(settings).onName("Other");
    await data(settings).save();
    expect(data(settings).notice).toEqual({ tone: "danger", text: "Nope" });
    expect(data(settings).slugMsg).toBe("Reserved");
  });

  it("leaves after a confirm, and shows the generic error with nobody listening", async () => {
    const { settings } = await mount();
    data(settings).leaveOpen = true;
    await data(settings).leave();
    expect(data(settings).leaveError).toBe("That did not work. Try again.");
    expect(data(settings).leaveOpen).toBe(true);
    const leaves = listen(settings, "leave");
    await data(settings).leave();
    expect(leaves).toHaveLength(1);
    expect(data(settings).leaveOpen).toBe(false);
  });

  it("hands the delete to the host through the danger zone", async () => {
    const { settings } = await mount();
    const deletes = listen(settings, "delete", { error: "Still has data" });
    let waited: Promise<unknown> | undefined;
    settings.dispatchEvent(new CustomEvent("nq-account-delete", { bubbles: true, detail: { waitUntil: (p: Promise<unknown>) => (waited = p) } }));
    expect(await waited).toEqual({ error: "Still has data" });
    expect(deletes).toHaveLength(1);
  });

  it("creates a workspace from the dialog: the address follows the name, field errors keep it open", async () => {
    const { dialog } = await mount();
    const d = data(dialog);
    d.open = true;
    await tick();
    d.onName("Sahab Studio!");
    expect(d.slug).toBe("sahab-studio");
    const creates = listen(dialog, "create", { fieldErrors: { name: "Used already" } });
    await d.submit();
    expect(creates[0]!.values).toEqual({ name: "Sahab Studio!", slug: "sahab-studio" });
    expect(d.nameMsg).toBe("Used already");
    expect(d.open).toBe(true);
    d.onName("Sahab Studio");
    expect(d.nameMsg).toBe("");
  });

  it("closes the dialog after a successful create and asks for a name first", async () => {
    const { dialog } = await mount();
    const d = data(dialog);
    d.open = true;
    await tick();
    await d.submit();
    expect(d.nameMsg).toBe("Enter a name for the workspace.");
    listen(dialog, "create");
    d.onName("Acme");
    await d.submit();
    expect(d.open).toBe(false);
  });
});
