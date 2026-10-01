import { flushPromises, mount } from "@vue/test-utils";
import { Inbox } from "lucide-vue-next";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NqCommandPalette, NqSearchTrigger } from ".";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("NqCommandPalette", () => {
  const perform = vi.fn();
  const commands = [
    { id: "app.go.inbox", section: "navigation" as const, label: "Inbox", icon: Inbox, shortcut: "G I", perform },
    { id: "app.new.issue", section: "create" as const, label: "New issue", perform: () => {} },
  ];

  it("opens, lists sections, filters and runs a command", async () => {
    const w = mount(NqCommandPalette, { props: { open: true, commands }, attachTo: document.body });
    await flushPromises();
    const input = document.querySelector<HTMLInputElement>('input[role="combobox"]')!;
    expect(input).toBeTruthy();
    const options = () => [...document.querySelectorAll<HTMLElement>('[role="option"]')];
    expect(options().length).toBe(2);
    input.value = "inb";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await flushPromises();
    expect(options().map((o) => o.textContent)).toEqual([expect.stringContaining("Inbox")]);
    options()[0]!.click();
    await flushPromises();
    expect(perform).toHaveBeenCalled();
    w.unmount();
  });

  it("shows the empty label when nothing matches", async () => {
    const w = mount(NqCommandPalette, { props: { open: true, commands }, attachTo: document.body });
    await flushPromises();
    const input = document.querySelector<HTMLInputElement>('input[role="combobox"]')!;
    input.value = "zzzzzz";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await flushPromises();
    expect(document.querySelectorAll('[role="option"]').length).toBe(0);
    expect(document.body.textContent).toMatch(/no results|nothing/i);
    w.unmount();
  });

  it("Ctrl+K asks to open", async () => {
    const w = mount(NqCommandPalette, { props: { open: false, commands }, attachTo: document.body });
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }));
    await flushPromises();
    expect(w.emitted("update:open")?.[0]).toEqual([true]);
    w.unmount();
  });
});

describe("NqSearchTrigger", () => {
  it("renders a labelled button with the shortcut hint", () => {
    const w = mount(NqSearchTrigger);
    expect(w.attributes("data-slot")).toBe("search-trigger");
    expect(w.attributes("aria-keyshortcuts")).toBe("Meta+K Control+K");
  });
});
