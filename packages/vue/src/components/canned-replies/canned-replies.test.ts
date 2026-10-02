import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { h } from "vue";
import { NasaqProvider } from "../../provider";
import { NqCannedRepliesManager, type CannedReply } from ".";

afterEach(() => {
  document.body.innerHTML = "";
});

const replies: CannedReply[] = [
  { id: "1", shortcut: "refund", title: "Refund policy", body: "Hi {{name}}, refunds take 5 days.", uses: 38 },
  { id: "2", shortcut: "thanks", title: "Thank you", body: "Thanks, {{name}}.", uses: 112 },
];
const dialog = () => document.body.querySelector<HTMLElement>('[data-slot="canned-reply-editor"]');
const button = (text: string) => [...document.body.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.trim() === text);

describe("NqCannedRepliesManager", () => {
  it("lists replies by shortcut with the add action", () => {
    const w = mount(NqCannedRepliesManager, { props: { replies, onSave: vi.fn(async () => ({})) }, attachTo: document.body });
    expect(w.attributes("data-slot")).toBe("canned-replies");
    expect(w.text()).toContain("/refund");
    expect(w.text()).toContain("Thank you");
    expect(w.text()).toContain("New reply");
  });

  it("searches the body and shows the empty state", async () => {
    const w = mount(NqCannedRepliesManager, { props: { replies }, attachTo: document.body });
    await w.find("input[type=search]").setValue("5 days");
    expect(w.findAll("tbody tr[data-row]")).toHaveLength(1);
    expect(mount(NqCannedRepliesManager, { props: { replies: [] }, attachTo: document.body }).text()).toContain("No canned replies yet");
  });

  it("validates the editor, previews the body and saves a new reply", async () => {
    const onSave = vi.fn(async () => ({}));
    const w = mount(NqCannedRepliesManager, { props: { replies, onSave }, attachTo: document.body });
    button("New reply")!.click();
    await flushPromises();
    expect(dialog()).not.toBeNull();
    button("Save reply")!.click();
    await flushPromises();
    expect(onSave).not.toHaveBeenCalled();
    expect(dialog()!.textContent).toContain("Give the reply a title.");

    const [title, shortcut] = dialog()!.querySelectorAll<HTMLInputElement>("input");
    title!.value = "Greeting";
    title!.dispatchEvent(new Event("input"));
    shortcut!.value = "Hello";
    shortcut!.dispatchEvent(new Event("input"));
    const body = dialog()!.querySelector<HTMLTextAreaElement>("textarea")!;
    body.value = "Hi {{name}}";
    body.dispatchEvent(new Event("input"));
    await flushPromises();
    expect(dialog()!.querySelector('[data-slot="canned-reply-preview"]')!.textContent).toBe("Hi Sara");
    button("Save reply")!.click();
    await flushPromises();
    expect(onSave).toHaveBeenCalledTimes(1);
    const saved = (onSave.mock.calls[0] as unknown as [CannedReply])[0];
    expect(saved).toMatchObject({ title: "Greeting", shortcut: "hello", body: "Hi {{name}}" });
    expect(saved.id.startsWith("new-")).toBe(true);
    w.unmount();
  });

  it("rejects a duplicate shortcut", async () => {
    const onSave = vi.fn(async () => ({}));
    mount(NqCannedRepliesManager, { props: { replies, onSave }, attachTo: document.body });
    button("New reply")!.click();
    await flushPromises();
    const [title, shortcut] = dialog()!.querySelectorAll<HTMLInputElement>("input");
    title!.value = "Again";
    title!.dispatchEvent(new Event("input"));
    shortcut!.value = "refund";
    shortcut!.dispatchEvent(new Event("input"));
    const body = dialog()!.querySelector<HTMLTextAreaElement>("textarea")!;
    body.value = "x";
    body.dispatchEvent(new Event("input"));
    button("Save reply")!.click();
    await flushPromises();
    expect(onSave).not.toHaveBeenCalled();
    expect(dialog()!.textContent).toContain("already");
  });

  it("deletes through a confirmation", async () => {
    const onDelete = vi.fn(async () => ({}));
    const w = mount(NqCannedRepliesManager, { props: { replies, onDelete }, attachTo: document.body });
    await w.findAll("tbody tr[data-row]")[0]!.trigger("contextmenu", { clientX: 4, clientY: 4 });
    await flushPromises();
    const item = [...document.body.querySelectorAll<HTMLElement>("[role=menuitem]")].find((i) => i.textContent?.includes("Delete"))!;
    item.click();
    await flushPromises();
    expect(document.body.textContent).toContain("Delete “Refund policy”?");
    expect(onDelete).not.toHaveBeenCalled();
    [...document.body.querySelectorAll<HTMLButtonElement>("[role=alertdialog] button")].find((b) => b.textContent?.trim() === "Delete")!.click();
    await flushPromises();
    expect(onDelete).toHaveBeenCalledWith(replies[0]);
  });

  it("speaks Arabic", () => {
    const w = mount({ render: () => h(NasaqProvider, { locale: "ar" }, () => h(NqCannedRepliesManager, { replies, onSave: async () => ({}) })) }, { attachTo: document.body });
    expect(w.text()).toContain("رد جديد");
  });
});
