// The notes Blade example, as rendered by Laravel, under real Alpine with the Nasaq runtime.
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
  host.innerHTML = rendered("notes");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  const root = host.querySelector<HTMLElement>('[data-slot="notes"]')!;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = () => Alpine.$data(root) as any;
  return { host, root, data };
}

const rows = (host: HTMLElement) => [...host.querySelectorAll<HTMLElement>('[data-slot="notes-list"] [data-slot="note-row"]')];
const titles = (host: HTMLElement) => rows(host).map((r) => r.querySelector('[data-slot="note-open"] span[dir="auto"]')!.textContent);

describe("notes (Blade example)", () => {
  it("renders the open note and the list without the archived one", async () => {
    const { host, root } = await mount();
    expect(root.getAttribute("data-view")).toBe("list");
    expect(titles(host)).toEqual(["Q3 roadmap", "Meeting notes", "Passwords"]);
    expect(host.querySelector<HTMLInputElement>('[data-slot="note-title"]')!.value).toBe("Q3 roadmap");
    expect(host.querySelector('[data-slot="note-editor-body"]')).not.toBeNull();
  });

  it("filters by search and by scope", async () => {
    const { host, data } = await mount();
    data().query = "standup";
    await tick();
    expect(titles(host)).toEqual(["Meeting notes"]);
    data().query = "";
    data().scope = "archive";
    await tick();
    expect(titles(host)).toEqual(["Shopping"]);
    data().scope = "nb:work";
    await tick();
    expect(titles(host)).toEqual(["Q3 roadmap", "Meeting notes"]);
  });

  it("opens a note from the list", async () => {
    const { host, data } = await mount();
    rows(host)[1]!.querySelector<HTMLButtonElement>('[data-slot="note-open"]')!.click();
    await tick();
    expect(data().activeId).toBe("n2");
    expect(host.querySelector<HTMLInputElement>('[data-slot="note-title"]')!.value).toBe("Meeting notes");
    expect(host.querySelector('textarea[data-slot="note-body"]')).not.toBeNull();
  });

  it("autosaves the title through nq-note-update", async () => {
    const { host, root } = await mount();
    const got: Array<{ id: string; patch: Record<string, unknown> }> = [];
    root.addEventListener("nq-note-update", (e) => {
      const d = (e as CustomEvent).detail;
      got.push({ id: d.id, patch: d.patch });
      d.wait(Promise.resolve());
    });
    const input = host.querySelector<HTMLInputElement>('[data-slot="note-title"]')!;
    input.value = "Roadmap 2026";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await tick(10);
    expect(host.querySelector('[data-slot="note-save-status"]')!.getAttribute("data-status")).toBe("dirty");
    input.dispatchEvent(new Event("blur"));
    await tick();
    expect(got).toHaveLength(1);
    expect(got[0]!.id).toBe("n1");
    expect(got[0]!.patch.title).toBe("Roadmap 2026");
    expect(titles(host)).toContain("Roadmap 2026");
  });

  it("pins a note only when the host allows it", async () => {
    const { host, root, data } = await mount();
    root.addEventListener("nq-note-update", (e) => (e as CustomEvent).detail.wait(Promise.resolve({ error: "No" })));
    data().pick(data().notes.find((n: { id: string }) => n.id === "n2"), "pin");
    await tick();
    expect(data().notes.find((n: { id: string }) => n.id === "n2").pinned).toBe(false);
    expect(host.querySelector('[data-slot="notes-view"] p[role="alert"]')!.textContent).toBe("No");
    root.addEventListener("nq-note-update", (e) => (e as CustomEvent).detail.wait(Promise.resolve()));
    data().listError = null;
    root.dispatchEvent(new Event("noop"));
  });

  it("unlocks a sealed note with its password", async () => {
    const { host, root, data } = await mount();
    root.addEventListener("nq-note-unlock", (e) => {
      const d = (e as CustomEvent).detail;
      d.wait(Promise.resolve(d.password === "secret" ? { body: "<p>Vault 4821</p>" } : { error: "Wrong password" }));
    });
    rows(host)[2]!.querySelector<HTMLButtonElement>('[data-slot="note-open"]')!.click();
    await tick();
    expect(host.querySelector('[data-slot="note-unlock"]')).not.toBeNull();
    data().unlockPassword = "nope";
    await data().unlock();
    await tick();
    expect(data().err.unlock).toBe("Wrong password");
    data().unlockPassword = "secret";
    await data().unlock();
    await tick();
    expect(host.querySelector('[data-slot="note-unlock"]')).toBeNull();
    expect(host.querySelector('[data-slot="note-body"]')!.innerHTML).toContain("Vault 4821");
  });

  it("deletes a note after confirmation", async () => {
    const { host, root, data } = await mount();
    const ids: string[] = [];
    root.addEventListener("nq-note-delete", (e) => {
      const d = (e as CustomEvent).detail;
      ids.push(d.id);
      d.wait(Promise.resolve());
    });
    data().openDialog("delete", data().notes.find((n: { id: string }) => n.id === "n2"));
    await tick();
    await data().confirmDelete();
    await tick();
    expect(ids).toEqual(["n2"]);
    expect(titles(host)).not.toContain("Meeting notes");
  });
});
