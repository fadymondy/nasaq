import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";
import { NqConfirmProvider, useConfirm, type ConfirmFn } from ".";

const settle = () => new Promise((r) => setTimeout(r, 250));

function setup() {
  let confirm!: ConfirmFn;
  const Child = defineComponent({
    setup() {
      confirm = useConfirm();
      return () => h("span", "child");
    },
  });
  const w = mount(NqConfirmProvider, { slots: { default: () => h(Child) }, attachTo: document.body });
  return { w, ask: (o: Parameters<ConfirmFn>[0]) => confirm(o) };
}
const q = (slot: string) => document.querySelector<HTMLElement>(`[data-slot="${slot}"]`);

describe("NqConfirmProvider", () => {
  it("resolves true on confirm, with a danger button by default", async () => {
    const { w, ask } = setup();
    const answer = ask({ title: "Delete Billing?", description: "Gone.", confirmLabel: "Delete" });
    await flushPromises();
    expect(q("confirm-dialog")).not.toBeNull();
    expect(q("alert-dialog-title")!.textContent).toBe("Delete Billing?");
    const buttons = [...document.querySelectorAll<HTMLElement>('[data-slot="confirm-dialog"] button')];
    const confirm = buttons.find((b) => b.textContent!.trim() === "Delete")!;
    expect(confirm.className).toContain("bg-destructive");
    confirm.click();
    expect(await answer).toBe(true);
    await flushPromises();
    await settle();
    expect(q("confirm-dialog")).toBeNull();
    w.unmount();
  });

  it("resolves false on cancel, uses default labels and primary when danger is false", async () => {
    const { w, ask } = setup();
    const answer = ask({ title: "Leave?", danger: false });
    await flushPromises();
    const buttons = [...document.querySelectorAll<HTMLElement>('[data-slot="confirm-dialog"] button')];
    expect(buttons.find((b) => b.textContent!.trim() === "Confirm")!.className).toContain("bg-primary");
    q("alert-dialog-cancel")!.click();
    expect(await answer).toBe(false);
    await flushPromises();
    await settle();
    w.unmount();
  });

  it("a second request resolves the first with false", async () => {
    const { w, ask } = setup();
    const first = ask({ title: "One" });
    await flushPromises();
    const second = ask({ title: "Two" });
    expect(await first).toBe(false);
    await flushPromises();
    expect(q("alert-dialog-title")!.textContent).toBe("Two");
    q("alert-dialog-cancel")!.click();
    expect(await second).toBe(false);
    await flushPromises();
    await settle();
    w.unmount();
  });

  it("useConfirm throws without a provider", () => {
    const Bare = defineComponent({
      setup() {
        useConfirm();
        return () => null;
      },
    });
    expect(() => mount(Bare)).toThrow(/ConfirmProvider/);
  });
});
