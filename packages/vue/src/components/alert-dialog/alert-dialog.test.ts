import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { defineComponent } from "vue";
import {
  NqAlertDialog,
  NqAlertDialogAction,
  NqAlertDialogCancel,
  NqAlertDialogContent,
  NqAlertDialogDescription,
  NqAlertDialogFooter,
  NqAlertDialogHeader,
  NqAlertDialogTitle,
  NqAlertDialogTrigger,
  NqConfirmButton,
} from ".";

const settle = () => new Promise((r) => setTimeout(r, 250));

const Demo = defineComponent({
  components: {
    NqAlertDialog,
    NqAlertDialogAction,
    NqAlertDialogCancel,
    NqAlertDialogContent,
    NqAlertDialogDescription,
    NqAlertDialogFooter,
    NqAlertDialogHeader,
    NqAlertDialogTitle,
    NqAlertDialogTrigger,
  },
  template: `<NqAlertDialog><NqAlertDialogTrigger>Delete</NqAlertDialogTrigger><NqAlertDialogContent class="max-w-sm">
    <NqAlertDialogHeader><NqAlertDialogTitle>Delete?</NqAlertDialogTitle><NqAlertDialogDescription>Gone for good.</NqAlertDialogDescription></NqAlertDialogHeader>
    <NqAlertDialogFooter><NqAlertDialogCancel>Keep</NqAlertDialogCancel><NqAlertDialogAction>Delete</NqAlertDialogAction></NqAlertDialogFooter></NqAlertDialogContent></NqAlertDialog>`,
});

describe("NqAlertDialog", () => {
  it("opens as an alertdialog with the React classes, has no x, and closes from Cancel", async () => {
    const w = mount(Demo, { attachTo: document.body });
    expect(document.querySelector('[data-slot="alert-dialog-content"]')).toBeNull();
    await w.find('[data-slot="alert-dialog-trigger"]').trigger("click");
    await flushPromises();
    const content = document.querySelector<HTMLElement>('[data-slot="alert-dialog-content"]')!;
    expect(content.getAttribute("role")).toBe("alertdialog");
    expect(content.getAttribute("aria-labelledby")).toBe(document.querySelector('[data-slot="alert-dialog-title"]')!.id);
    expect(content.className).toContain("rounded-floating");
    expect(content.className).toContain("max-w-sm");
    expect(content.className).not.toMatch(/\bmax-w-md\b/);
    expect(document.querySelector('[data-slot="alert-dialog-backdrop"]')).not.toBeNull();
    expect(document.querySelector('[data-slot="dialog-close"]')).toBeNull();
    const action = document.querySelector<HTMLElement>('[data-slot="alert-dialog-action"]')!;
    expect(action.className).toContain("bg-destructive");
    const cancel = document.querySelector<HTMLElement>('[data-slot="alert-dialog-cancel"]')!;
    expect(cancel.className).toContain("hover:bg-nq-hover");
    cancel.click();
    await flushPromises();
    await settle();
    expect(document.querySelector('[data-slot="alert-dialog-content"]')).toBeNull();
    w.unmount();
  });
});

describe("NqConfirmButton", () => {
  it("asks first, runs onConfirm, and closes", async () => {
    const onConfirm = vi.fn();
    const w = mount(NqConfirmButton, { props: { title: "Delete this project?", description: "Cannot be undone.", onConfirm }, slots: { default: "Delete project" }, attachTo: document.body });
    const trigger = w.find('[data-slot="alert-dialog-trigger"]');
    expect(trigger.classes()).toContain("bg-destructive");
    await trigger.trigger("click");
    await flushPromises();
    expect(document.querySelector('[data-slot="alert-dialog-title"]')!.textContent).toBe("Delete this project?");
    expect(onConfirm).not.toHaveBeenCalled();
    const confirm = document.querySelector<HTMLElement>('[data-slot="confirm-button-action"]')!;
    expect(confirm.textContent!.trim()).toBe("Delete project");
    confirm.click();
    await flushPromises();
    await settle();
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(document.querySelector('[data-slot="alert-dialog-content"]')).toBeNull();
    w.unmount();
  });

  it("stays open while a promise is pending and when it rejects", async () => {
    let reject!: () => void;
    const onConfirm = vi.fn(() => new Promise<void>((_, r) => (reject = r)));
    const w = mount(NqConfirmButton, { props: { title: "Sure?", confirmLabel: "Yes", cancelLabel: "No", onConfirm }, slots: { default: "Go" }, attachTo: document.body });
    await w.find('[data-slot="alert-dialog-trigger"]').trigger("click");
    await flushPromises();
    const confirm = document.querySelector<HTMLElement>('[data-slot="confirm-button-action"]')!;
    expect(confirm.textContent!.trim()).toBe("Yes");
    expect(document.querySelector('[data-slot="alert-dialog-cancel"]')!.textContent).toBe("No");
    confirm.click();
    await flushPromises();
    expect(confirm.getAttribute("aria-busy")).toBe("true");
    reject();
    await flushPromises();
    await settle();
    expect(document.querySelector('[data-slot="alert-dialog-content"]')).not.toBeNull();
    expect(confirm.getAttribute("aria-busy")).toBeNull();
    w.unmount();
  });
});
