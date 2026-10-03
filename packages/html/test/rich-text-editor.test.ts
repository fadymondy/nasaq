// The Blade rich-text-editor example (packages/php/examples/rendered/rich-text-editor.html) under real Alpine, with a fake Tiptap.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";
import { isSafeLink } from "../src/alpine/rich-text-editor";

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (window as any).NasaqRichText;
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fakeTiptap(): { tiptap: any; log: string[]; state: { active: Set<string>; html: string; instances: any[] } } {
  const log: string[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const state = { active: new Set<string>(), html: "<p>Hello</p>", instances: [] as any[] };
  class Editor {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    options: any;
    destroyed = false;
    commands = {
      setContent: (c: string, o: unknown) => {
        state.html = c;
        log.push(`setContent:${JSON.stringify(o)}`);
      },
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(options: any) {
      this.options = options;
      if (typeof options.content === "string") state.html = options.content;
      state.instances.push(this);
    }
    chain() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const proxy: any = new Proxy(
        {},
        {
          get:
            (_t, prop: string) =>
            (...args: unknown[]) => {
              if (prop === "run") return true;
              log.push(args[0] !== undefined ? `${prop}(${JSON.stringify(args[0])})` : prop);
              if (prop === "toggleBold") state.active.has("bold") ? state.active.delete("bold") : state.active.add("bold");
              return proxy;
            },
        },
      );
      return proxy;
    }
    can() {
      return { undo: () => false, redo: () => false };
    }
    isActive(name: string) {
      return state.active.has(name);
    }
    getAttributes() {
      return {};
    }
    getHTML() {
      return state.html;
    }
    getJSON() {
      return { type: "doc" };
    }
    setEditable() {}
    destroy() {
      this.destroyed = true;
    }
  }
  return {
    tiptap: { Editor, Extension: { create: (c: unknown) => c }, StarterKit: { configure: (o: unknown) => o }, Placeholder: { configure: (o: unknown) => o } },
    log,
    state,
  };
}

async function mount(load?: () => Promise<unknown>) {
  if (load) (window as unknown as { NasaqRichText: unknown }).NasaqRichText = { load };
  const host = document.createElement("div");
  host.innerHTML = rendered("rich-text-editor");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

const bold = () => document.querySelector<HTMLButtonElement>('button[aria-label="Bold"]')!;

describe("isSafeLink", () => {
  it("refuses script schemes", () => {
    expect(isSafeLink("https://a.co")).toBe(true);
    expect(isSafeLink("{{ action_url }}")).toBe(true);
    expect(isSafeLink("javascript:alert(1)")).toBe(false);
  });
});

describe("rich-text-editor (Alpine)", () => {
  it("renders the chrome with every button disabled while Tiptap is not loaded", async () => {
    await mount();
    expect(document.querySelector('[role="toolbar"]')!.getAttribute("aria-label")).toBe("Formatting");
    expect(bold().disabled).toBe(true);
    expect(bold().getAttribute("aria-pressed")).toBe("false");
    expect(document.querySelector<HTMLButtonElement>('button[aria-label="Undo"]')!.disabled).toBe(true);
  });

  it("loads Tiptap lazily, creates the editor and enables the toolbar", async () => {
    const { tiptap, state } = fakeTiptap();
    let loads = 0;
    await mount(async () => (loads++, tiptap));
    expect(loads).toBe(1);
    const ed = state.instances[0];
    expect(ed.options.content).toBe("<p>Hello</p>");
    expect(ed.options.editorProps.attributes).toMatchObject({ role: "textbox", "aria-label": "Notes", "data-slot": "rich-text-editor-content" });
    expect(ed.options.element).toBe(document.querySelector('[data-slot="rich-text-editor"] > div:last-child'));
    expect(bold().disabled).toBe(false);
  });

  it("runs a command and reflects the pressed state", async () => {
    const { tiptap, log, state } = fakeTiptap();
    await mount(async () => tiptap);
    bold().click();
    await tick();
    expect(log).toEqual(expect.arrayContaining(["focus", "toggleBold"]));
    // A transaction refreshes the pressed state.
    state.instances[0].options.onTransaction();
    await tick();
    expect(bold().getAttribute("aria-pressed")).toBe("true");
    expect(bold().hasAttribute("data-pressed")).toBe(true);
  });

  it("emits change with the HTML on update and pushes outside changes in", async () => {
    const { tiptap, log, state } = fakeTiptap();
    const host = await mount(async () => tiptap);
    const values: unknown[] = [];
    host.addEventListener("change", (e) => values.push((e as CustomEvent).detail.value));
    state.html = "<p>typed</p>";
    state.instances[0].options.onUpdate({ editor: state.instances[0] });
    await tick();
    expect(values).toEqual(["<p>typed</p>"]);
    (Alpine.$data(document.querySelector('[data-slot="rich-text-editor"]')!) as { value: string }).value = "<p>outside</p>";
    await tick();
    expect(log).toContain('setContent:{"emitUpdate":false}');
    expect(state.html).toBe("<p>outside</p>");
  });

  it("applies a safe link and refuses a javascript: one", async () => {
    const { tiptap, log } = fakeTiptap();
    await mount(async () => tiptap);
    document.querySelector<HTMLButtonElement>('button[aria-label="Link"]')!.click();
    await tick();
    const form = document.querySelector<HTMLFormElement>('[data-slot="rich-text-editor-link"]')!;
    const input = form.querySelector("input")!;
    expect(input.getAttribute("dir")).toBe("ltr");
    input.value = "javascript:alert(1)";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    await tick();
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(log.some((l) => l.startsWith("setLink"))).toBe(false);
    input.value = "https://nasaq.dev";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    await tick();
    expect(log).toContain('setLink({"href":"https://nasaq.dev"})');
  });

  it("names the editor in Arabic when no label is given and destroys it on teardown", async () => {
    const { tiptap, state } = fakeTiptap();
    Alpine.store("nq") && (Alpine.store("nq") as { setLocale(l: string): void }).setLocale("ar");
    const host = document.createElement("div");
    host.innerHTML = rendered("rich-text-editor").replace(/, JSON\.parse\([^)]*\)\)/, ", { load: async () => window.__tt })");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__tt = tiptap;
    document.body.append(host);
    Alpine.initTree(host);
    await tick();
    expect(state.instances[0].options.editorProps.attributes["aria-label"]).toBe("محرر نص منسق");
    Alpine.destroyTree(host);
    expect(state.instances[0].destroyed).toBe(true);
    (Alpine.store("nq") as { setLocale(l: string): void }).setLocale("en");
  });
});
