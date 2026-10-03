import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { h } from "vue";
import { NasaqProvider } from "../../provider";
import { applyMarkdownEditorFormat } from "./markdown-editor-format";
import { NqMarkdownEditor } from ".";

afterEach(() => {
  document.body.innerHTML = "";
  document.documentElement.lang = "en";
  document.documentElement.dir = "ltr";
});

describe("applyMarkdownEditorFormat", () => {
  it("wraps, unwraps and prefixes", () => {
    expect(applyMarkdownEditorFormat("hi", 0, 2, "bold")).toEqual({ value: "**hi**", start: 2, end: 4 });
    expect(applyMarkdownEditorFormat("**hi**", 2, 4, "bold").value).toBe("hi");
    expect(applyMarkdownEditorFormat("a\nb", 0, 3, "bullet").value).toBe("- a\n- b");
    expect(applyMarkdownEditorFormat("x", 0, 1, "link").value).toBe("[x](url)");
  });

  it("fences a code block on its own lines", () => {
    expect(applyMarkdownEditorFormat("a", 1, 1, "codeBlock").value).toBe("a\n```\n\n```\n");
    expect(applyMarkdownEditorFormat("code", 0, 4, "codeBlock").value).toBe("```\ncode\n```\n");
  });
});

describe("NqMarkdownEditor", () => {
  it("renders the toolbar, the text area and reflects the view", () => {
    const w = mount(NqMarkdownEditor, { props: { defaultValue: "# Hi" } });
    expect(w.attributes("data-slot")).toBe("markdown-editor");
    expect(w.attributes("data-view")).toBe("write");
    expect(w.find("[role='toolbar']").attributes("aria-label")).toBe("Formatting");
    expect(w.findAll("[role='toolbar'] button")).toHaveLength(11);
    const area = w.find("textarea");
    expect(area.attributes("dir")).toBe("auto");
    expect((area.element as HTMLTextAreaElement).value).toBe("# Hi");
    expect(w.find("[data-slot='markdown-editor-preview']").exists()).toBe(false);
  });

  it("shows the live preview in split view and the empty hint without text", async () => {
    const w = mount(NqMarkdownEditor, { props: { defaultView: "split", defaultValue: "" } });
    expect(w.find("[data-slot='markdown-editor-preview']").attributes("aria-live")).toBe("polite");
    expect(w.find("[data-slot='markdown-editor-preview']").text()).toBe("Nothing to preview yet.");
    await w.find("textarea").setValue("## Title\n\nSome **bold**");
    const preview = w.find("[data-slot='markdown-editor-preview']");
    expect(preview.find("h2").text()).toBe("Title");
    expect(preview.find("strong").text()).toBe("bold");
  });

  it("emits update:modelValue when typing and applies a toolbar command", async () => {
    const w = mount(NqMarkdownEditor, { props: { modelValue: "hello" }, attachTo: document.body });
    const area = w.find("textarea");
    (area.element as HTMLTextAreaElement).setSelectionRange(0, 5);
    await w.find("button[aria-label='Bold']").trigger("click");
    expect(w.emitted("update:modelValue")?.at(-1)).toEqual(["**hello**"]);
    await area.setValue("typed");
    expect(w.emitted("update:modelValue")?.at(-1)).toEqual(["typed"]);
  });

  it("applies Ctrl+B and ignores other keys", async () => {
    const w = mount(NqMarkdownEditor, { props: { modelValue: "ab" }, attachTo: document.body });
    const area = w.find("textarea");
    (area.element as HTMLTextAreaElement).setSelectionRange(0, 2);
    await area.trigger("keydown", { key: "b", ctrlKey: true });
    expect(w.emitted("update:modelValue")?.at(-1)).toEqual(["**ab**"]);
    await area.trigger("keydown", { key: "x", ctrlKey: true });
    expect(w.emitted("update:modelValue")).toHaveLength(1);
  });

  it("switches the view and emits update:view", async () => {
    const w = mount(NqMarkdownEditor, { props: { defaultValue: "x" } });
    await w.find("button[aria-label='Preview']").trigger("click");
    expect(w.emitted("update:view")?.[0]).toEqual(["preview"]);
    expect(w.attributes("data-view")).toBe("preview");
    expect(w.find("textarea").exists()).toBe(false);
  });

  it("carries the value in a hidden input and disables the toolbar when disabled", () => {
    const w = mount(NqMarkdownEditor, { props: { defaultValue: "x", name: "body", disabled: true } });
    const hidden = w.find("input[type='hidden']");
    expect(hidden.attributes("name")).toBe("body");
    expect((hidden.element as HTMLInputElement).value).toBe("x");
    expect(w.find("[role='toolbar'] button").attributes("disabled")).toBeDefined();
    expect(w.classes()).toContain("opacity-60");
  });

  it("speaks Arabic under an Arabic provider", () => {
    const w = mount(() => h(NasaqProvider, { locale: "ar" }, () => h(NqMarkdownEditor)));
    expect(w.find("[role='toolbar']").attributes("aria-label")).toBe("التنسيق");
    expect(w.find("textarea").attributes("placeholder")).toBe("اكتب بصيغة ماركداون…");
  });
});
