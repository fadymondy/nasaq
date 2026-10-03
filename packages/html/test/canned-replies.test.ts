// The Blade canned-replies example (packages/php/examples/rendered/canned-replies.html) under real Alpine.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";
import { nextFreeCannedShortcut, normalizeCannedShortcut, validateCannedReply } from "../src/alpine/canned-replies-logic";

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
  host.innerHTML = rendered("canned-replies");
  document.body.append(host);
  Alpine.initTree(host);
  await tick(80);
  return host.querySelector<HTMLElement>('[data-slot="canned-replies"]')!;
}

type Detail = Record<string, unknown> & { wait: (p: Promise<unknown>) => void };
/** Answers the host events after the example's own listeners (the last wait() wins). */
function answer(root: HTMLElement, answers: Record<string, (d: Detail) => unknown>) {
  const seen: { name: string; detail: Detail }[] = [];
  for (const [name, fn] of Object.entries(answers)) {
    root.addEventListener(name, (e) => {
      const detail = (e as CustomEvent<Detail>).detail;
      seen.push({ name, detail });
      detail.wait(Promise.resolve().then(() => fn(detail)));
    });
  }
  return seen;
}
const data = (root: HTMLElement) => Alpine.$data(root) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
const type = (el: HTMLInputElement | HTMLTextAreaElement, value: string) => {
  el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
};
const submit = (form: HTMLElement) => form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
const act = (root: HTMLElement, action: string, id: string) => root.dispatchEvent(new CustomEvent("nq-entity-list-action", { bubbles: true, detail: { action, row: { id } } }));
const text = (el: Element) => el.textContent!.replace(/\s+/g, " ").trim();
const button = (root: ParentNode, label: string) => [...root.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.includes(label))!;
const editor = () => document.querySelector<HTMLFormElement>('[data-slot="canned-reply-editor"]')!;
const ids = (root: HTMLElement) => data(root).list.rows.map((r: { id: string }) => r.id);

describe("canned reply helpers", () => {
  it("normalizes, validates and finds a free shortcut", () => {
    expect(normalizeCannedShortcut(" /Hello World!")).toBe("hello-world");
    expect(validateCannedReply({ id: "a", shortcut: "", title: "", body: "" }, [])).toEqual(["title-empty", "shortcut-empty", "body-empty"]);
    expect(validateCannedReply({ id: "a", shortcut: "x", title: "t", body: "{{nope}}" }, [], ["name"])).toEqual(["variable-unknown"]);
    expect(nextFreeCannedShortcut("refund", [{ shortcut: "refund" }, { shortcut: "refund-2" }])).toBe("refund-3");
  });
});

describe("canned-replies (Blade example)", () => {
  it("lists the replies A to Z by shortcut", async () => {
    const root = await mount();
    expect(ids(root)).toEqual(["1", "2"]);
    expect(text(root)).toContain("/refund");
    expect(text(root)).toContain("Thank you");
    expect(text(root)).toContain("New reply");
  });

  it("validates the editor, previews variables and saves a new reply", async () => {
    const root = await mount();
    const seen = answer(root, { "save-reply": () => ({ id: "r9" }) });
    button(root, "New reply").click();
    await tick();
    expect(editor()).not.toBeNull();
    submit(editor());
    await tick();
    expect(data(root).form.invalid).toEqual({ title: true, shortcut: true, body: true });
    expect(seen).toHaveLength(0);

    const inputs = [...editor().querySelectorAll<HTMLInputElement>("input")].filter((i) => i.type !== "hidden");
    type(inputs[0]!, "Shipping");
    type(inputs[1]!, "Ship It");
    expect(data(root).form.shortcut).toBe("ship-it");
    const area = editor().querySelector<HTMLTextAreaElement>("textarea")!;
    type(area, "Hello ");
    area.setSelectionRange(6, 6);
    button(editor(), "Name").click();
    await tick();
    expect(data(root).form.body).toBe("Hello {{name}}");
    expect(text(editor().querySelector('[data-slot="canned-reply-preview"]')!)).toBe("Hello Sara");

    submit(editor());
    await tick(80);
    expect(seen).toHaveLength(1);
    expect(seen[0]!.detail).toMatchObject({ isNew: true, reply: { shortcut: "ship-it", title: "Shipping", body: "Hello {{name}}" } });
    expect(data(root).form.open).toBe(false);
    expect(ids(root)).toContain("r9");
  });

  it("rejects a shortcut that another reply uses", async () => {
    const root = await mount();
    const seen = answer(root, { "save-reply": () => undefined });
    button(root, "New reply").click();
    await tick();
    const inputs = [...editor().querySelectorAll<HTMLInputElement>("input")].filter((i) => i.type !== "hidden");
    type(inputs[0]!, "Dup");
    type(inputs[1]!, "refund");
    type(editor().querySelector<HTMLTextAreaElement>("textarea")!, "x");
    submit(editor());
    await tick();
    expect(data(root).form.shortcutMessage).toBe("Another reply already uses this shortcut.");
    expect(seen).toHaveLength(0);
  });

  it("edits on a row click and shows a save error from the host", async () => {
    const root = await mount();
    answer(root, { "save-reply": () => ({ error: "Nope" }) });
    root.dispatchEvent(new CustomEvent("nq-entity-list-row-click", { bubbles: true, detail: { row: { id: "2" } } }));
    await tick();
    expect(data(root).form).toMatchObject({ open: true, isNew: false, title: "Thank you", shortcut: "thanks" });
    submit(editor());
    await tick(80);
    expect(data(root).form.open).toBe(true);
    expect(data(root).form.error).toBe("Nope");
  });

  it("duplicates with a free shortcut", async () => {
    const root = await mount();
    const seen = answer(root, { "save-reply": () => undefined });
    act(root, "duplicate", "1");
    await tick(80);
    expect(seen[0]!.detail).toMatchObject({ isNew: true, reply: { shortcut: "refund-2", title: "Refund policy (duplicate)", uses: 0 } });
    expect(ids(root)).toHaveLength(3);
  });

  it("deletes after confirming", async () => {
    const root = await mount();
    const seen = answer(root, { "delete-reply": () => undefined });
    act(root, "delete", "2");
    await tick();
    expect(data(root).confirm.open).toBe(true);
    expect(data(root).confirm.title).toBe("Delete “Thank you”?");
    document.querySelector<HTMLElement>('[data-slot="alert-dialog-action"]')!.click();
    await tick(80);
    expect(seen[0]!.detail).toMatchObject({ id: "2" });
    expect(ids(root)).toEqual(["1"]);
  });

  it("shows the generic error when the handler rejects", async () => {
    const root = await mount();
    root.addEventListener("delete-reply", (e) => (e as CustomEvent<Detail>).detail.wait(Promise.reject(new Error("x"))));
    act(root, "delete", "1");
    await tick();
    document.querySelector<HTMLElement>('[data-slot="alert-dialog-action"]')!.click();
    await tick(80);
    expect(data(root).failure).toBe("That did not work. Try again.");
    expect(ids(root)).toHaveLength(2);
  });
});
