// The Blade env-list example (packages/php/examples/rendered/env-list.html) under real Alpine.
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

async function mount(revealTimeout = 30000) {
  const host = document.createElement("div");
  // The example answers every event itself; tests wire their own listeners, so strip those handlers.
  host.innerHTML = rendered("env-list")
    .replace(/x-on:nq-(save|delete|import)="[^"]*"/g, "")
    .replace("revealTimeout\\u0022:30000", `revealTimeout\\u0022:${revealTimeout}`);
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  const root = host.querySelector<HTMLElement>('[data-slot="env-list"]')!;
  return { host, root };
}

const shown = (el: Element | null | undefined) => !!el && (el as HTMLElement).style.display !== "none";
const rows = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('[data-slot="env-row"]')];
const row = (root: HTMLElement, key: string) => rows(root).find((r) => r.querySelector("bdi")!.textContent === key)!;
const value = (r: HTMLElement) => [...r.querySelectorAll<HTMLElement>('[data-slot="env-value"]')].find(shown)!;
const labelled = (scope: ParentNode, label: string) => scope.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
const buttonNamed = (scope: ParentNode, text: string) => [...scope.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.trim() === text && shown(b))!;
const type = (el: HTMLInputElement | HTMLTextAreaElement, v: string) => {
  el.value = v;
  el.dispatchEvent(new Event("input", { bubbles: true }));
};
const submit = (form: Element) => form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
const answer = (root: HTMLElement, event: string, result?: unknown, seen?: (detail: Record<string, unknown>) => void) =>
  root.addEventListener(event, (e) => {
    const d = (e as CustomEvent).detail;
    seen?.(d);
    d.wait(result instanceof Error ? Promise.reject(result) : Promise.resolve(result));
  });
const editForm = () => document.querySelector<HTMLFormElement>('form[data-slot="env-variable-dialog"]')!;
const importForm = () => document.querySelector<HTMLFormElement>('form[data-slot="env-import-dialog"]')!;
const count = (root: HTMLElement) => root.querySelector('[data-slot="env-count"]')!.textContent;

describe("env-list (Blade example)", () => {
  it("renders the variables with secrets masked and plain values shown", async () => {
    const { root } = await mount();
    expect(root.querySelector("h3")!.textContent).toBe("Environment variables");
    expect(rows(root)).toHaveLength(2);
    const db = row(root, "DATABASE_URL");
    expect(db.hasAttribute("data-secret")).toBe(true);
    expect(db.hasAttribute("data-revealed")).toBe(false);
    expect(value(db).textContent).toBe("•".repeat(12));
    expect(db.textContent).not.toContain("s3cret");
    const api = row(root, "VITE_API_URL");
    expect(api.hasAttribute("data-secret")).toBe(false);
    expect(value(api).textContent).toBe("https://api.example.com");
    expect(api.textContent).toContain("Public API origin");
    expect(shown(labelled(api, "Reveal VITE_API_URL"))).toBe(false);
    expect(count(root)).toBe("2 variables");
    expect(shown(root.querySelector('[data-slot="empty-state"]')!.parentElement)).toBe(false);
    expect(shown(root.querySelector('[data-slot="input-group"]'))).toBe(false);
  });

  it("reveals and hides a secret, and hides it again after the timeout", async () => {
    const { root } = await mount(150);
    const db = () => row(root, "DATABASE_URL");
    labelled(db(), "Reveal DATABASE_URL").click();
    await tick();
    expect(db().hasAttribute("data-revealed")).toBe(true);
    expect(value(db()).textContent).toBe("postgres://app:s3cret@db.internal:5432/app");
    expect(labelled(db(), "Hide DATABASE_URL").getAttribute("aria-pressed")).toBe("true");
    labelled(db(), "Hide DATABASE_URL").click();
    await tick();
    expect(value(db()).textContent).toBe("•".repeat(12));
    labelled(db(), "Reveal DATABASE_URL").click();
    await tick();
    expect(db().hasAttribute("data-revealed")).toBe(true);
    await tick(250);
    expect(db().hasAttribute("data-revealed")).toBe(false);
    expect(value(db()).textContent).toBe("•".repeat(12));
  });

  it("checks the name, then fires nq-save and adds the variable", async () => {
    const { root } = await mount();
    let detail: Record<string, unknown> | undefined;
    answer(root, "nq-save", undefined, (d) => (detail = d));
    buttonNamed(root, "Add variable").click();
    await tick(80);
    const form = editForm();
    expect(form.querySelector('[data-slot="dialog-title"], h2')?.textContent ?? document.body.textContent).toContain("Add variable");
    const key = form.querySelector<HTMLInputElement>("input")!;
    const problem = () => [...form.querySelectorAll<HTMLElement>('p[role="alert"]')].find(shown)?.textContent;
    submit(form);
    await tick();
    expect(detail).toBeUndefined();
    expect(problem()).toBe("Enter a name.");
    type(key, "1ABC");
    await tick();
    expect(problem()).toBe("Use only letters, digits and underscores, and do not start with a digit.");
    expect(key.getAttribute("aria-invalid")).toBe("true");
    type(key, "DATABASE_URL");
    await tick();
    expect(problem()).toBe("A variable with this name already exists.");
    type(key, "  API_KEY ");
    await tick();
    expect(problem()).toBeUndefined();
    type(form.querySelector("textarea")!, "abc123");
    submit(form);
    await tick(120);
    expect(detail).toMatchObject({ variable: { key: "API_KEY", value: "abc123", secret: true }, previousKey: undefined });
    expect(rows(root).map((r) => r.querySelector("bdi")!.textContent)).toEqual(["DATABASE_URL", "VITE_API_URL", "API_KEY"]);
    expect(count(root)).toBe("3 variables");
    expect(value(row(root, "API_KEY")).textContent).toBe("•".repeat(12));
    await tick(300);
    expect(shown(form.closest('[data-slot="dialog-content"]'))).toBe(false);
  });

  it("keeps the dialog open and shows the error from nq-save", async () => {
    const { root } = await mount();
    answer(root, "nq-save", { error: "Name is reserved" });
    buttonNamed(root, "Add variable").click();
    await tick(80);
    const form = editForm();
    type(form.querySelector("input")!, "PORT");
    submit(form);
    await tick(120);
    expect([...form.querySelectorAll<HTMLElement>('[data-slot="alert"]')].find(shown)!.textContent).toContain("Name is reserved");
    expect(rows(root)).toHaveLength(2);
    expect(shown(form.closest('[data-slot="dialog-content"]'))).toBe(true);
  });

  it("does nothing when nobody answers the event", async () => {
    const { root } = await mount();
    buttonNamed(root, "Add variable").click();
    await tick(80);
    const form = editForm();
    type(form.querySelector("input")!, "PORT");
    submit(form);
    await tick(120);
    expect(rows(root)).toHaveLength(2);
  });

  it("edits a variable with its previous key and the form prefilled", async () => {
    const { root } = await mount();
    let detail: Record<string, unknown> | undefined;
    answer(root, "nq-save", undefined, (d) => (detail = d));
    labelled(row(root, "VITE_API_URL"), "Edit VITE_API_URL").click();
    await tick(80);
    const form = editForm();
    expect(form.querySelector<HTMLInputElement>("input")!.value).toBe("VITE_API_URL");
    expect(form.querySelector("textarea")!.value).toBe("https://api.example.com");
    type(form.querySelector("textarea")!, "https://api.example.org");
    submit(form);
    await tick(120);
    expect(detail).toMatchObject({ variable: { key: "VITE_API_URL", value: "https://api.example.org", secret: false, description: "Public API origin" }, previousKey: "VITE_API_URL" });
    expect(value(row(root, "VITE_API_URL")).textContent).toBe("https://api.example.org");
  });

  it("confirms, then fires nq-delete and removes the row", async () => {
    const { root } = await mount();
    const keys: unknown[] = [];
    answer(root, "nq-delete", undefined, (d) => keys.push(d.key));
    labelled(row(root, "VITE_API_URL"), "Delete VITE_API_URL").click();
    await tick(80);
    expect(keys).toEqual([]);
    expect(document.querySelector('[data-slot="alert-dialog-title"]')!.textContent).toBe("Delete VITE_API_URL?");
    buttonNamed(document.body, "Delete").click();
    await tick(120);
    expect(keys).toEqual(["VITE_API_URL"]);
    expect(rows(root).map((r) => r.querySelector("bdi")!.textContent)).toEqual(["DATABASE_URL"]);
    expect(count(root)).toBe("1 variable");
  });

  it("shows the error from nq-delete and keeps the row", async () => {
    const { root } = await mount();
    answer(root, "nq-delete", new Error("boom"));
    labelled(row(root, "VITE_API_URL"), "Delete VITE_API_URL").click();
    await tick(80);
    buttonNamed(document.body, "Delete").click();
    await tick(120);
    expect(rows(root)).toHaveLength(2);
    const alert = [...document.querySelectorAll<HTMLElement>('[data-slot="alert-dialog-content"] [data-slot="alert"]')].find(shown);
    expect(alert!.textContent).toContain("Something went wrong");
  });

  it("previews an import, skips existing keys unless overwriting, marks public keys plain, and shows the filter at six variables", async () => {
    const { root } = await mount();
    const calls: { variables: { key: string; value: string; secret: boolean }[]; overwrite: boolean }[] = [];
    answer(root, "nq-import", undefined, (d) => calls.push({ variables: d.variables as never, overwrite: d.overwrite as boolean }));
    buttonNamed(root, "Import .env").click();
    await tick(80);
    const form = importForm();
    const text = form.querySelector("textarea")!;
    const importButton = () => [...form.querySelectorAll<HTMLButtonElement>('button[type="submit"]')][0]!;
    expect(importButton().disabled).toBe(true);
    type(text, "DATABASE_URL=other\nNEXT_PUBLIC_X=1\nA=1\nB=2\nC=3\nbad line\n1BAD=x");
    await tick();
    const preview = form.querySelector<HTMLElement>('[aria-live="polite"]')!;
    expect(shown(preview)).toBe(true);
    expect(preview.textContent).toContain("5 variables found");
    expect(preview.textContent).toContain("1 already exists");
    expect(preview.textContent).toContain("Line 6: expected NAME=value");
    expect(preview.textContent).toContain('Line 7: "1BAD" is not a valid name');
    expect(importButton().textContent!.trim()).toBe("Import 4 variables");
    submit(form);
    await tick(120);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.overwrite).toBe(false);
    expect(calls[0]!.variables).toEqual([
      { key: "NEXT_PUBLIC_X", value: "1", secret: false },
      { key: "A", value: "1", secret: true },
      { key: "B", value: "2", secret: true },
      { key: "C", value: "3", secret: true },
    ]);
    expect(rows(root)).toHaveLength(6);
    expect(value(row(root, "DATABASE_URL")).textContent).toBe("•".repeat(12));
    expect(value(row(root, "NEXT_PUBLIC_X")).textContent).toBe("1");
    // Six variables: the filter appears.
    const group = root.querySelector<HTMLElement>('[data-slot="input-group"]')!;
    expect(shown(group)).toBe(true);
    type(group.querySelector("input")!, "next");
    await tick();
    expect(rows(root).map((r) => r.querySelector("bdi")!.textContent)).toEqual(["NEXT_PUBLIC_X"]);
    type(group.querySelector("input")!, "zzz");
    await tick();
    expect(rows(root)).toHaveLength(0);
    expect(shown([...root.querySelectorAll("li")].find((li) => li.textContent === "No variables match your filter.")!)).toBe(true);
  });

  it("overwrites existing keys when asked", async () => {
    const { root } = await mount();
    const calls: { variables: { key: string; value: string }[]; overwrite: boolean }[] = [];
    answer(root, "nq-import", undefined, (d) => calls.push({ variables: d.variables as never, overwrite: d.overwrite as boolean }));
    buttonNamed(root, "Import .env").click();
    await tick(80);
    const form = importForm();
    type(form.querySelector("textarea")!, "DATABASE_URL=other");
    await tick();
    form.querySelector<HTMLButtonElement>('[data-slot="checkbox"]')!.click();
    await tick();
    submit(form);
    await tick(120);
    expect(calls[0]!.overwrite).toBe(true);
    expect(calls[0]!.variables.map((v) => v.value)).toEqual(["other"]);
    expect(rows(root)).toHaveLength(2);
    labelled(row(root, "DATABASE_URL"), "Reveal DATABASE_URL").click();
    await tick();
    expect(value(row(root, "DATABASE_URL")).textContent).toBe("other");
  });

  it("fires a cancelable nq-export with the variables", async () => {
    const { root } = await mount();
    let exported: unknown;
    root.addEventListener("nq-export", (e) => {
      exported = (e as CustomEvent).detail.variables;
      e.preventDefault();
    });
    buttonNamed(root, "Download .env").click();
    await tick();
    expect((exported as { key: string }[]).map((v) => v.key)).toEqual(["DATABASE_URL", "VITE_API_URL"]);
  });
});
