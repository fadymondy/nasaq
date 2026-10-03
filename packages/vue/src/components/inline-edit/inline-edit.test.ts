import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { NasaqProvider } from "../../provider";
import { NqInlineEdit, inlineKeyAction, resolveInlineCommit } from ".";

describe("inline edit logic", () => {
  it("resolves commits", () => {
    expect(resolveInlineCommit({ draft: " hi ", initial: "hi" })).toEqual({ kind: "unchanged", value: "hi" });
    expect(resolveInlineCommit({ draft: " ", initial: "hi", required: true })).toMatchObject({ kind: "invalid", reason: "required" });
    expect(resolveInlineCommit({ draft: "٣٫٥", initial: "", type: "number" })).toEqual({ kind: "save", value: "3.5" });
    expect(resolveInlineCommit({ draft: "javascript:x", initial: "", type: "url" })).toMatchObject({ reason: "type" });
    expect(resolveInlineCommit({ draft: "abcd", initial: "", maxLength: 3 })).toMatchObject({ reason: "length" });
  });

  it("maps keys", () => {
    expect(inlineKeyAction({ key: "Enter" }, false)).toBe("save");
    expect(inlineKeyAction({ key: "Enter" }, true)).toBeNull();
    expect(inlineKeyAction({ key: "Enter", ctrlKey: true }, true)).toBe("save");
    expect(inlineKeyAction({ key: "Escape" }, false)).toBe("cancel");
    expect(inlineKeyAction({ key: "Enter", isComposing: true }, false)).toBeNull();
  });
});

describe("NqInlineEdit", () => {
  it("shows the value as a button that opens an editor", async () => {
    const w = mount(NqInlineEdit, { props: { value: "Launch plan", label: "title", onSave: () => {} }, attachTo: document.body });
    expect(w.attributes("data-state")).toBe("display");
    const btn = w.find("button");
    expect(btn.attributes("aria-label")).toBe("Edit title");
    expect(btn.text()).toBe("Launch plan");
    await btn.trigger("click");
    expect(w.attributes("data-state")).toBe("editing");
    expect(w.attributes("role")).toBe("group");
    expect((w.find("input").element as HTMLInputElement).value).toBe("Launch plan");
    w.unmount();
  });

  it("saves on Enter and returns to display", async () => {
    const onSave = vi.fn();
    const w = mount(NqInlineEdit, { props: { value: "a", label: "title", onSave }, attachTo: document.body });
    await w.find("button").trigger("click");
    const input = w.find("input");
    await input.setValue("b");
    await input.trigger("keydown", { key: "Enter" });
    await flushPromises();
    expect(onSave).toHaveBeenCalledWith("b");
    expect(w.attributes("data-state")).toBe("display");
    w.unmount();
  });

  it("cancels on Escape without saving", async () => {
    const onSave = vi.fn();
    const w = mount(NqInlineEdit, { props: { value: "a", label: "title", onSave }, attachTo: document.body });
    await w.find("button").trigger("click");
    await w.find("input").setValue("b");
    await w.find("input").trigger("keydown", { key: "Escape" });
    await flushPromises();
    expect(onSave).not.toHaveBeenCalled();
    expect(w.attributes("data-state")).toBe("display");
    w.unmount();
  });

  it("keeps editing and shows the message when the save returns an error or the value is invalid", async () => {
    const w = mount(NqInlineEdit, { props: { value: "a", label: "email", type: "email", onSave: () => ({ error: "Taken" }) }, attachTo: document.body });
    await w.find("button").trigger("click");
    await w.find("input").setValue("nope");
    await w.find("input").trigger("keydown", { key: "Enter" });
    await flushPromises();
    expect(w.find('[role="alert"]').text()).toBe("Enter a valid email address.");
    expect(w.find("input").attributes("aria-invalid")).toBe("true");
    expect(w.find("input").attributes("dir")).toBe("ltr");
    await w.find("input").setValue("a@b.co");
    await w.find("input").trigger("keydown", { key: "Enter" });
    await flushPromises();
    expect(w.find('[role="alert"]').text()).toBe("Taken");
    expect(w.attributes("data-state")).toBe("editing");
    w.unmount();
  });

  it("multiline uses a textarea and Ctrl+Enter", async () => {
    const onSave = vi.fn();
    const w = mount(NqInlineEdit, { props: { value: "a", label: "bio", multiline: true, onSave }, attachTo: document.body });
    await w.find("button").trigger("click");
    const ta = w.find("textarea");
    expect(w.text()).toContain("Ctrl+Enter to save, Esc to cancel");
    await ta.setValue("b");
    await ta.trigger("keydown", { key: "Enter" });
    expect(onSave).not.toHaveBeenCalled();
    await ta.trigger("keydown", { key: "Enter", ctrlKey: true });
    await flushPromises();
    expect(onSave).toHaveBeenCalledWith("b");
    w.unmount();
  });

  it("read-only shows no edit affordance, empty shows the add text, Arabic words", async () => {
    const ro = mount(NqInlineEdit, { props: { value: "x", label: "title", onSave: () => {}, readOnly: true } });
    expect(ro.find("button").attributes("disabled")).toBeDefined();
    expect(ro.find("svg").exists()).toBe(false);
    const empty = mount(NqInlineEdit, { props: { value: "", label: "title", onSave: () => {} } });
    expect(empty.text()).toBe("Add title");
    const ar = mount({ components: { NasaqProvider, NqInlineEdit }, template: '<NasaqProvider locale="ar"><NqInlineEdit value="" label="العنوان" :on-save="() => {}" /></NasaqProvider>' });
    expect(ar.text()).toContain("أضف العنوان");
  });
});
