import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import nasaq from "../src/alpine";
import { buildFormSubmission, formFieldStates, validateFormValues } from "../src/alpine/public-form-logic";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms));

beforeAll(() => {
  Alpine.plugin(nasaq);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).Alpine = Alpine;
  Alpine.start();
});

afterEach(() => {
  vi.unstubAllGlobals();
  for (const el of [...document.body.children]) {
    Alpine.destroyTree(el as HTMLElement);
    el.remove();
  }
});

async function mount() {
  // The example posts to /api/contact.
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
  const host = document.createElement("div");
  host.innerHTML = rendered("public-form");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  const form = host.querySelector('[data-slot="public-form"]') as HTMLFormElement;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = () => Alpine.$data(form) as any;
  return { host, form, data };
}

const fields = [
  { id: "kind", kind: "text" },
  { id: "company", kind: "text" },
  { id: "age", kind: "number", required: true },
  { id: "terms", kind: "checkbox", required: true },
];
const rules = [{ conditions: { kind: "group" as const, join: "and" as const, children: [{ field: "kind", op: "is", value: "Business" }] }, actions: [{ type: "show", config: { target: "company" } }] }];

describe("public-form logic", () => {
  it("shows a field only while its show rule matches", () => {
    expect(formFieldStates({ fields, rules }, {}).company!.visible).toBe(false);
    expect(formFieldStates({ fields, rules }, { kind: "business" }).company!.visible).toBe(true);
  });

  it("validates visible fields, reads Arabic digits and checkboxes", () => {
    expect(validateFormValues({ fields, rules }, { age: "x", terms: false })).toEqual({ age: "number", terms: "required" });
    expect(validateFormValues({ fields, rules }, { age: "٣٠", terms: true })).toEqual({});
  });

  it("sends only visible trimmed answers and flags the honeypot", () => {
    const form = { fields, rules, honeypot: true };
    expect(buildFormSubmission(form, { kind: "Personal", company: "Acme", age: " 3 ", terms: true }).data).toEqual({ kind: "Personal", age: "3", terms: true });
    expect(buildFormSubmission(form, { website_url: "bot" }).spam).toBe(true);
  });
});

describe("public-form (Blade example)", () => {
  it("renders the fields, the honeypot and the hidden thank-you", async () => {
    const { host, form } = await mount();
    expect(form.dataset.kind).toBe("contact");
    expect([...host.querySelectorAll("[data-field]")].map((f) => (f as HTMLElement).dataset.field)).toEqual(["name", "email", "topic", "message"]);
    expect(host.querySelector('input[name="website_url"]')!.getAttribute("tabindex")).toBe("-1");
    expect((host.querySelector('[data-slot="public-form-done"]') as HTMLElement).style.display).toBe("none");
    expect(form.hasAttribute("data-state")).toBe(false);
  });

  it("shows the required errors and does not dispatch", async () => {
    const { host, form } = await mount();
    let fired = 0;
    form.addEventListener("nq-public-form", () => fired++);
    form.dispatchEvent(new Event("submit", { cancelable: true }));
    await tick();
    expect(fired).toBe(0);
    const err = host.querySelector('[data-field="name"] [data-slot="field-error"]') as HTMLElement;
    expect(err.style.display).not.toBe("none");
    expect(err.textContent!.trim()).toBe("This field is required.");
    expect(host.querySelector('[data-field="name"] input')!.getAttribute("aria-invalid")).toBe("true");
  });

  it("clears an error when the answer changes", async () => {
    const { host, form, data } = await mount();
    form.dispatchEvent(new Event("submit", { cancelable: true }));
    await tick();
    const input = host.querySelector('[data-field="name"] input') as HTMLInputElement;
    input.value = "Ada";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await tick();
    expect(data().answers.name).toBe("Ada");
    expect(data().bad.name).toBe(false);
  });

  it("dispatches the trimmed answers, then shows the thank-you and resets", async () => {
    const { host, form, data } = await mount();
    const seen: unknown[] = [];
    form.addEventListener("nq-public-form", (e) => {
      const d = (e as CustomEvent).detail;
      seen.push(d.data);
      d.waitUntil(Promise.resolve());
    });
    Object.assign(data().answers, { name: " Ada ", email: "ada@example.com", topic: "sales", message: "Hello" });
    form.dispatchEvent(new Event("submit", { cancelable: true }));
    await tick(60);
    expect(seen).toEqual([{ name: "Ada", email: "ada@example.com", topic: "sales", message: "Hello" }]);
    expect(form.dataset.state).toBe("done");
    expect((host.querySelector('[data-slot="public-form-done"]') as HTMLElement).style.display).not.toBe("none");
    expect(host.querySelector('[data-slot="public-form-done"] p')!.textContent).toBe("Thanks, we will get back to you soon.");
    (host.querySelector('[data-slot="public-form-done"] button') as HTMLElement).click();
    await tick();
    expect(form.hasAttribute("data-state")).toBe(false);
    expect(data().answers.name).toBe("");
  });

  it("keeps the form and shows the error a listener resolves", async () => {
    const { host, form, data } = await mount();
    form.addEventListener("nq-public-form", (e) => (e as CustomEvent).detail.waitUntil(Promise.resolve({ error: "Try later" })));
    Object.assign(data().answers, { name: "Ada", email: "ada@example.com", topic: "sales", message: "Hello" });
    form.dispatchEvent(new Event("submit", { cancelable: true }));
    await tick(60);
    expect(form.hasAttribute("data-state")).toBe(false);
    expect(host.querySelector('p[role="alert"]')!.textContent).toBe("Try later");
  });

  it("treats a filled honeypot as done without dispatching", async () => {
    const { form, data } = await mount();
    let fired = 0;
    form.addEventListener("nq-public-form", () => fired++);
    Object.assign(data().answers, { name: "Ada", email: "ada@example.com", topic: "sales", message: "Hello", website_url: "bot" });
    form.dispatchEvent(new Event("submit", { cancelable: true }));
    await tick(60);
    expect(fired).toBe(0);
    expect(form.dataset.state).toBe("done");
  });
});
