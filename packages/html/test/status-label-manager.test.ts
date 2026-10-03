import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";
import { groupByStage, moveWithinStage, validateName } from "../src/alpine/status-label-logic";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms));

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
  host.innerHTML = rendered("status-label-manager");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

const root = (host: HTMLElement) => host.querySelector<HTMLElement>('[data-slot="status-label-manager"]')!;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data = (host: HTMLElement) => Alpine.$data(root(host)) as Record<string, any>;
const byLabel = (label: string) => document.querySelector<HTMLElement>(`[aria-label="${label}"]`)!;
const setName = async (value: string) => {
  const input = document.querySelector<HTMLInputElement>('[data-slot="status-label-edit"] input[data-slot="input"]')!;
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await tick();
};
const submit = async () => {
  document.querySelector('[data-slot="status-label-edit"]')!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  await tick(150);
};

describe("status model", () => {
  it("validates, groups and reorders", () => {
    const list = [
      { id: "a", name: "To do", hue: "gray", stage: "todo" },
      { id: "b", name: "Ready", hue: "teal", stage: "todo" },
      { id: "c", name: "Shipped", hue: "green", stage: "done" },
    ] as const;
    expect(validateName("  ", list)).toBe("empty");
    expect(validateName("to do", list)).toBe("duplicate");
    expect(validateName("to do", list, "a")).toBeNull();
    expect(validateName("x".repeat(33), list)).toBe("tooLong");
    expect(groupByStage(list).map((g) => g.items.length)).toEqual([0, 2, 0, 0, 1, 0]);
    expect(moveWithinStage(list, "a", 1)).toEqual(["b", "a", "c"]);
    expect(moveWithinStage(list, "a", -1)).toEqual(["a", "b", "c"]);
  });
});

describe("status-label-manager (Blade example)", () => {
  it("renders a card per stage with its rows and usage", async () => {
    const host = await mount();
    expect(root(host).getAttribute("data-slot")).toBe("status-label-manager");
    expect([...host.querySelectorAll("[data-stage]")].map((c) => c.getAttribute("data-stage"))).toEqual(["backlog", "todo", "active", "review", "done", "canceled"]);
    expect(host.querySelector('[data-stage="todo"]')!.textContent).toContain("Used by 12 items");
    expect(host.querySelector('[data-stage="todo"]')!.textContent).toContain("Not used");
    expect(host.querySelector('[data-stage="backlog"]')!.textContent).toContain("No statuses in this stage");
    expect(host.textContent).not.toContain("Add a status in the Done stage");
    expect(host.querySelectorAll('[data-slot="context-menu-trigger"]').length).toBe(5);
  });

  it("disables moving at the ends of a stage", async () => {
    await mount();
    expect(byLabel("Move To do up").hasAttribute("disabled")).toBe(true);
    expect(byLabel("Move To do down").hasAttribute("disabled")).toBe(false);
    expect(byLabel("Move Ready down").hasAttribute("disabled")).toBe(true);
  });

  it("fires nq-reorder-statuses with the full new order", async () => {
    const host = await mount();
    let ids: string[] = [];
    root(host).addEventListener("nq-reorder-statuses", (e) => (ids = (e as CustomEvent).detail.ids));
    byLabel("Move To do down").click();
    await tick(150);
    expect(ids).toEqual(["s4", "s1", "s2", "s3"]);
  });

  it("creates a status through the dialog and closes it", async () => {
    const host = await mount();
    let draft: unknown = null;
    root(host).addEventListener("nq-save-status", (e) => (draft = (e as CustomEvent).detail.draft));
    [...host.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.includes("New status"))!.click();
    await tick();
    expect(data(host).editOpen).toBe(true);
    expect(data(host).submitLabel).toBe("Create");
    await submit();
    expect(draft).toBeNull();
    expect(data(host).nameMsg).toBe("Give it a name.");
    await setName("  Blocked ");
    await submit();
    expect(draft).toEqual({ id: undefined, name: "Blocked", hue: "blue", stage: "todo" });
    expect(data(host).editOpen).toBe(false);
  });

  it("rejects a duplicate name and shows a server error", async () => {
    const host = await mount();
    root(host).addEventListener("nq-save-status", (e) => (e as CustomEvent).detail.waitUntil(Promise.resolve({ error: "Nope" })));
    byLabel("Edit Ready").click();
    await tick();
    expect(data(host).draft.name).toBe("Ready");
    await setName("shipped");
    await submit();
    expect(data(host).nameMsg).toBe("That name is already used.");
    expect(data(host).editOpen).toBe(true);
    await setName("Queued");
    await submit();
    expect(data(host).formError).toBe("Nope");
    expect(data(host).editOpen).toBe(true);
  });

  it("asks before deleting and says how many items lose the value", async () => {
    const host = await mount();
    let id = "";
    root(host).addEventListener("nq-delete-status", (e) => (id = (e as CustomEvent).detail.id));
    byLabel("Delete Shipped").click();
    await tick();
    const dialog = document.querySelector('[data-slot="alert-dialog-content"]')!;
    expect(dialog.textContent).toContain("Delete status Shipped?");
    expect(dialog.textContent).toContain("31 items use it");
    expect(id).toBe("");
    [...dialog.querySelectorAll("button")].find((b) => b.textContent?.includes("Delete"))!.click();
    await tick(150);
    expect(id).toBe("s3");
    expect(data(host).delOpen).toBe(false);
  });

  it("edits a label", async () => {
    const host = await mount();
    const saved: unknown[] = [];
    root(host).addEventListener("nq-save-label", (e) => saved.push((e as CustomEvent).detail.draft));
    byLabel("Edit Design").click();
    await tick();
    expect(data(host).isStatus).toBe(false);
    await setName("Visual");
    await submit();
    expect(saved).toEqual([{ id: "l1", name: "Visual", hue: "violet" }]);
  });

  it("pushes the picked colour into the draft", async () => {
    const host = await mount();
    let draft: unknown = null;
    root(host).addEventListener("nq-save-status", (e) => (draft = (e as CustomEvent).detail.draft));
    byLabel("Edit To do").click();
    await tick();
    document.querySelector<HTMLElement>('[data-slot="color-picker-trigger"]')!.click();
    await tick();
    document.querySelector<HTMLElement>('[data-slot="color-picker-swatch"][data-value="--nq-tag-red"]')!.click();
    await tick();
    expect(data(host).draft.hue).toBe("red");
    await submit();
    expect(draft).toEqual({ id: "s1", name: "To do", hue: "red", stage: "todo" });
  });
});
