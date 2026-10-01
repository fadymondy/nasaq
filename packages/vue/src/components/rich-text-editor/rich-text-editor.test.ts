import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";
import { NasaqProvider } from "../../provider";
import { NqRichTextEditor, isSafeLink, shortcutKeys, type RichTextTiptap } from ".";

const mounted: { unmount(): void }[] = [];
afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount());
  document.body.innerHTML = "";
});

/** A stand-in for @tiptap/core: records commands and holds an html string and a set of active marks. */
function fakeTiptap() {
  const log: string[] = [];
  const state = { active: new Set<string>(), html: "<p>Hello</p>", instances: [] as any[] };
  class Editor {
    options: any;
    destroyed = false;
    commands = {
      setContent: (c: string, o: unknown) => {
        state.html = c;
        log.push(`setContent:${JSON.stringify(o)}`);
      },
    };
    constructor(options: any) {
      this.options = options;
      if (typeof options.content === "string") state.html = options.content;
      state.instances.push(this);
    }
    chain() {
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
    on() {}
    off() {}
    destroy() {
      this.destroyed = true;
    }
  }
  const tiptap = {
    Editor,
    Extension: { create: (c: unknown) => c },
    StarterKit: { configure: (o: unknown) => o },
    Placeholder: { configure: (o: unknown) => o },
  } as unknown as RichTextTiptap;
  return { tiptap, log, state };
}

function wrap(props: Record<string, unknown>, locale = "en") {
  const w = mount(
    defineComponent({ setup: () => () => h(NasaqProvider, { locale }, () => h(NqRichTextEditor, props)) }),
    { attachTo: document.body },
  );
  mounted.push(w);
  return w;
}

describe("isSafeLink", () => {
  it("allows web, mail, tel, relative, hash and merge tags but not script schemes", () => {
    for (const ok of ["https://a.co", "mailto:a@b.co", "tel:+1", "/x", "#top", "{{ action_url }}"]) expect(isSafeLink(ok)).toBe(true);
    for (const bad of ["javascript:alert(1)", "data:text/html,x", "ftp://x"]) expect(isSafeLink(bad)).toBe(false);
  });
  it("shows shortcuts per platform", () => {
    expect(shortcutKeys("bold", false)).toBe("Ctrl+B");
    expect(shortcutKeys("strike", true)).toBe("⌘⇧S");
  });
});

describe("NqRichTextEditor", () => {
  it("renders the frame and a disabled toolbar before Tiptap is loaded", () => {
    const w = wrap({ ariaLabel: "Notes", minHeight: "8rem" });
    expect(w.find('[data-slot="rich-text-editor"]').classes()).toContain("overflow-hidden");
    const bar = w.find('[data-slot="rich-text-editor-toolbar"]');
    expect(bar.attributes("role")).toBe("toolbar");
    expect(bar.attributes("aria-label")).toBe("Formatting");
    expect(w.find('[aria-label="Bold"]').exists()).toBe(true);
    expect(w.find('button[aria-label="Undo"]').attributes("disabled")).toBeDefined();
  });

  it("creates the editor from `load` with role, label and initial content, and destroys it", async () => {
    const { tiptap, state } = fakeTiptap();
    const w = wrap({ ariaLabel: "Notes", load: async () => tiptap, defaultValue: "<p>Hi</p>" });
    await flushPromises();
    const ed = state.instances[0];
    expect(ed.options.content).toBe("<p>Hi</p>");
    expect(ed.options.editorProps.attributes).toMatchObject({
      role: "textbox",
      "aria-multiline": "true",
      "aria-label": "Notes",
      "data-slot": "rich-text-editor-content",
    });
    w.unmount();
    mounted.length = 0;
    expect(ed.destroyed).toBe(true);
  });

  it("names the editor in Arabic by default", async () => {
    const { tiptap, state } = fakeTiptap();
    wrap({ load: async () => tiptap }, "ar");
    await flushPromises();
    expect(state.instances[0].options.editorProps.attributes["aria-label"]).toBe("محرر نص منسق");
  });

  it("runs the command behind a toolbar button", async () => {
    const { tiptap, log } = fakeTiptap();
    const w = wrap({ ariaLabel: "n", load: async () => tiptap });
    await flushPromises();
    await w.find('button[aria-label="Bold"]').trigger("click");
    await flushPromises();
    expect(log).toEqual(expect.arrayContaining(["focus", "toggleBold"]));
  });

  it("limits the toolbar to the given items and hides it when empty or read only", () => {
    const w = wrap({ toolbar: ["bold", "undo"] });
    expect(w.findAll("button").map((b) => b.attributes("aria-label"))).toEqual(["Bold", "Undo"]);
    expect(wrap({ toolbar: [] }).find('[data-slot="rich-text-editor-toolbar"]').exists()).toBe(false);
    const ro = wrap({ readOnly: true });
    expect(ro.find('[data-slot="rich-text-editor-toolbar"]').exists()).toBe(false);
    expect(ro.find('[data-slot="rich-text-editor"]').attributes("data-readonly")).toBe("true");
  });

  it("emits the value on update and pushes outside changes in", async () => {
    const { tiptap, state, log } = fakeTiptap();
    const updates: unknown[] = [];
    const Host = defineComponent({
      props: { value: { type: String, default: "<p>a</p>" } },
      setup: (p) => () =>
        h(NasaqProvider, { locale: "en" }, () =>
          h(NqRichTextEditor, { modelValue: p.value, "onUpdate:modelValue": (v: unknown) => updates.push(v), load: async () => tiptap }),
        ),
    });
    const w = mount(Host, { attachTo: document.body });
    mounted.push(w);
    await flushPromises();
    state.html = "<p>typed</p>";
    state.instances[0].options.onUpdate({ editor: state.instances[0] });
    expect(updates).toEqual(["<p>typed</p>"]);
    await w.setProps({ value: "<p>outside</p>" });
    expect(log).toContain('setContent:{"emitUpdate":false}');
  });

  it("speaks Arabic in the toolbar", () => {
    const w = wrap({}, "ar");
    expect(w.find('[data-slot="rich-text-editor-toolbar"]').attributes("aria-label")).toBe("التنسيق");
    expect(w.find('[aria-label="خط عريض"]').exists()).toBe(true);
  });
});
