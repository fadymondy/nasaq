// The Blade step-editor example (packages/php/examples/rendered/step-editor.html) under real Alpine.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";
import { maskSecrets, stepPlaceholders, validateSteps, type StepType } from "../src/alpine/step-editor-logic";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = () => new Promise((r) => setTimeout(r, 30));

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
  document.documentElement.lang = "en";
});

async function mount() {
  const host = document.createElement("div");
  host.innerHTML = rendered("step-editor");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data = () => Alpine.$data(document.querySelector('[data-slot="step-editor"]')!) as any;
const rows = () => [...document.querySelectorAll<HTMLElement>('[data-slot="step-editor-row"]')];
const click = (el: Element | null | undefined) => (el as HTMLElement).click();
const labelled = (text: string) => [...document.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.trim() === text);

describe("step-editor logic", () => {
  const types: StepType[] = [{ id: "http", label: "HTTP", fields: [{ name: "url", label: "URL", kind: "url", required: true }] }];
  it("finds placeholders, validates and masks secrets", () => {
    expect(stepPlaceholders("{{a}} {{ b }} {{a}}")).toEqual(["a", "b"]);
    const codes = validateSteps([{ id: "s", type: "http", config: { url: "{{ghost}}" } }, { id: "t", type: "http", config: {} }], [{ id: "p", name: "1x", value: "" }], types).map((i) => i.code);
    expect(codes).toEqual(expect.arrayContaining(["unknown-placeholder", "missing-field", "bad-param-name"]));
    expect(maskSecrets("a s3cret b", [{ id: "p", name: "k", value: "s3cret", secret: true }])).toBe("a •••••• b");
  });
});

describe("step-editor example", () => {
  it("renders the root, tabs and counts", async () => {
    await mount();
    expect(document.querySelector('[data-slot="step-editor"]')).not.toBeNull();
    const tabs = [...document.querySelectorAll('[role="tab"]')].map((t) => t.textContent!.replace(/\s+/g, " ").trim());
    expect(tabs).toEqual(["Steps 1", "Parameters 1", "Test run"]);
    expect(rows().filter((r) => r.hasAttribute("data-step-id"))).toHaveLength(1);
    expect(document.querySelector<HTMLInputElement>('[data-field="url"] input')!.value).toBe("https://{{host}}/orders");
  });

  it("adds a step, picks a type and lists the missing field", async () => {
    await mount();
    click(labelled("Add step"));
    await tick();
    expect(data().steps).toHaveLength(2);
    expect(document.querySelector('[data-slot="workflow-node-picker"]')).not.toBeNull();
    click(document.querySelector('[data-pick-type="http"]'));
    await tick();
    expect(data().steps[1].type).toBe("http");
    expect(document.querySelector('[data-slot="alert"]')!.textContent).toContain('HTTP request: "URL" is required');
    expect((document.querySelector('[data-slot="alert"]') as HTMLElement).style.display).not.toBe("none");
  });

  it("types into a field and the problem clears", async () => {
    await mount();
    click(labelled("Add step"));
    await tick();
    click(document.querySelector('[data-pick-type="http"]'));
    await tick();
    const inputs = [...document.querySelectorAll<HTMLInputElement>('[data-field="url"] input')];
    const empty = inputs.find((i) => i.value === "")!;
    empty.value = "https://x.io";
    empty.dispatchEvent(new Event("input", { bubbles: true }));
    await tick();
    expect(data().steps[1].config.url).toBe("https://x.io");
    expect(data().issues()).toHaveLength(0);
  });

  it("nests a step inside a loop", async () => {
    await mount();
    click(labelled("Add step"));
    await tick();
    click(document.querySelector('[data-pick-type="loop"]'));
    await tick();
    expect(labelled("Add a step inside")).toBeDefined();
    click(labelled("Add a step inside"));
    await tick();
    expect(data().steps[1].children).toHaveLength(1);
    expect(rows()).toHaveLength(3);
  });

  it("reorders, duplicates and removes", async () => {
    await mount();
    click(labelled("Add step"));
    await tick();
    click(document.querySelector('[data-pick-type="loop"]'));
    await tick();
    const first = data().steps[0].id;
    // pointer drag on the handle: the first row is dragged below the second
    rows().forEach((el, i) => (el.getBoundingClientRect = () => ({ top: i * 60, bottom: i * 60 + 50, height: 50, left: 0, right: 100, width: 100, x: 0, y: i * 60, toJSON() {} }) as DOMRect));
    const ev = (type: string, y: number) => {
      const e = new Event(type, { bubbles: true, cancelable: true }) as Event & Record<string, unknown>;
      Object.assign(e, { clientY: y, pointerId: 1, pointerType: "touch", button: 0 });
      return e;
    };
    document.querySelector('button[aria-label="Reorder HTTP request"]')!.dispatchEvent(ev("pointerdown", 25));
    window.dispatchEvent(ev("pointermove", 80));
    await tick();
    expect(rows()[0]!.dataset.dragging).toBe("true");
    window.dispatchEvent(ev("pointerup", 80));
    await tick();
    expect(rows()[0]!.dataset.dragging).toBeUndefined();
    expect(data().steps[1].id).toBe(first);
    click(document.querySelector('button[aria-label="Duplicate HTTP request"]'));
    await tick();
    expect(data().steps).toHaveLength(3);
    click(document.querySelector('button[aria-label="Remove Loop"]'));
    await tick();
    expect(data().steps.map((s: { type: string }) => s.type)).toEqual(["http", "http"]);
  });

  it("moves with the handle's arrow keys", async () => {
    await mount();
    click(labelled("Add step"));
    await tick();
    click(document.querySelector('[data-pick-type="loop"]'));
    await tick();
    const handle = document.querySelector<HTMLElement>('[data-handle="[]:0"], button[aria-label="Reorder HTTP request"]')!;
    handle.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true, cancelable: true }));
    await tick();
    expect(data().steps[1].type).toBe("http");
  });

  it("adds a parameter, masks a secret and reveals it", async () => {
    await mount();
    click(labelled("Add parameter"));
    await tick();
    expect(data().params).toHaveLength(2);
    click(document.querySelector('[data-param-id="p1"] button[role="switch"]'));
    await tick();
    await tick();
    const value = document.querySelector<HTMLInputElement>("#nq-param-value-p1")!;
    expect(value.outerHTML).toContain(' type="password"');
    click(document.querySelector('[data-param-id="p1"] button[aria-pressed]'));
    await tick();
    // happy-dom reports a stale getAttribute("type") on inputs, so Alpine skips the write back to text there; a browser does not. Assert the state it binds.
    expect(data().inputType(data().params[0])).toBe("text");
    expect(document.querySelector("[data-param-id=p1] button[aria-pressed]")!.getAttribute("aria-pressed")).toBe("true");
  });

  it("runs a test run through the event and masks secrets in the output", async () => {
    await mount();
    data().params[0].secret = true;
    data().params[0].value = "s3cret";
    data().steps[0].config.url = "https://x.io";
    await tick();
    const root = document.querySelector('[data-slot="step-editor"]')!;
    root.addEventListener("nq-step-test", ((e: CustomEvent) => {
      e.detail.waitUntil(Promise.resolve([{ stepId: data().steps[0].id, status: "success", durationMs: 12, output: { token: "s3cret" } }]));
    }) as EventListener);
    await data().runTest();
    await tick();
    const result = document.querySelector(`[data-result="${data().steps[0].id}"]`)!;
    expect(result.textContent).toContain("Succeeded");
    expect(result.textContent).toContain("••••••");
    expect(result.textContent).not.toContain("s3cret");
  });

  it("emits change after an edit", async () => {
    await mount();
    let detail: { steps: unknown[] } | null = null;
    document.querySelector('[data-slot="step-editor"]')!.addEventListener("change", ((e: CustomEvent) => (detail = e.detail)) as EventListener);
    click(labelled("Add step"));
    await tick();
    expect(detail!.steps).toHaveLength(2);
  });

  it("speaks Arabic in its messages when the page is", async () => {
    const nq = Alpine.store("nq") as { setLocale(l: string): void };
    nq.setLocale("ar");
    await mount();
    expect(data().problemsTitle()).toContain("للإصلاح");
    nq.setLocale("en");
  });
});
