import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import { NqIdleLock, NqIdleWarningDialog, useIdleLock } from ".";

const lockScreen = ({ unlock }: { unlock: () => void }) => h("button", { "data-test": "unlock", onClick: unlock }, "Unlock");
const make = (props: Record<string, unknown> = {}) =>
  mount(NqIdleLock, { props: { timeoutSeconds: 60, warningSeconds: 10, ...props }, slots: { default: () => h("p", "App"), lockScreen }, attachTo: document.body });
const advance = async (ms: number) => {
  await vi.advanceTimersByTimeAsync(ms);
  await flushPromises();
};
const warnButton = (text: string) => [...document.querySelectorAll<HTMLButtonElement>('[data-slot="idle-warning"] button')].find((b) => b.textContent!.includes(text))!;

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = "";
});

describe("NqIdleLock", () => {
  it("renders the app with the root slots and no lock screen", () => {
    const w = make();
    expect(w.attributes("data-slot")).toBe("idle-lock");
    expect(w.attributes("class")).toContain("contents");
    expect(w.attributes("data-locked")).toBeUndefined();
    expect(w.find('[data-slot="idle-lock-app"]').text()).toBe("App");
    expect(w.find('[data-slot="idle-lock-screen"]').exists()).toBe(false);
    expect(document.querySelector('[data-slot="idle-warning"]')).toBeNull();
    w.unmount();
  });

  it("warns, then locks after the timeout and emits why", async () => {
    const w = make();
    await advance(50_000);
    const dialog = document.querySelector<HTMLElement>('[data-slot="idle-warning"]')!;
    expect(dialog.getAttribute("role")).toBe("alertdialog");
    expect(dialog.textContent).toContain("Still there?");
    expect(dialog.querySelector('[role="timer"]')!.textContent!.trim()).toBe("0:10");
    expect(dialog.querySelector('[role="progressbar"]')!.getAttribute("aria-valuenow")).toBe("100");
    await advance(10_000);
    expect(w.attributes("data-locked")).toBe("");
    expect(w.emitted("lockedChange")![0]).toEqual([true, "idle"]);
    const app = w.find('[data-slot="idle-lock-app"]');
    expect(app.attributes("inert")).toBeDefined();
    expect(app.attributes("aria-hidden")).toBe("true");
    expect(w.find('[data-slot="idle-lock-screen"]').classes()).toContain("z-[60]");
    w.unmount();
  });

  it("Stay signed in resets the timer", async () => {
    const w = make();
    await advance(55_000);
    warnButton("Stay signed in").click();
    await advance(300);
    expect(document.querySelector('[data-slot="idle-warning"]')).toBeNull();
    await advance(40_000);
    expect(w.attributes("data-locked")).toBeUndefined();
    w.unmount();
  });

  it("Lock now locks as manual, and unlock hands control back", async () => {
    const w = make();
    await advance(51_000);
    warnButton("Lock now").click();
    await advance(10);
    expect(w.emitted("lockedChange")![0]).toEqual([true, "manual"]);
    await w.find('[data-test="unlock"]').trigger("click");
    expect(w.emitted("lockedChange")![1]).toEqual([false, "manual"]);
    expect(w.attributes("data-locked")).toBeUndefined();
    expect(w.find('[data-slot="idle-lock-screen"]').exists()).toBe(false);
    w.unmount();
  });

  it("is controlled with v-model:locked and can unmount the app while locked", async () => {
    const w = make({ locked: true, unmountWhenLocked: true });
    expect(w.find('[data-slot="idle-lock-app"]').exists()).toBe(false);
    await w.find('[data-test="unlock"]').trigger("click");
    expect(w.emitted("update:locked")![0]).toEqual([false]);
    expect(w.attributes("data-locked")).toBe("");
    await w.setProps({ locked: false });
    expect(w.find('[data-slot="idle-lock-app"]').exists()).toBe(true);
    w.unmount();
  });

  it("does not run while disabled", async () => {
    const w = make({ disabled: true });
    await advance(120_000);
    expect(w.attributes("data-locked")).toBeUndefined();
    w.unmount();
  });
});

describe("NqIdleWarningDialog", () => {
  it("shows overridden labels with a left-to-right countdown", async () => {
    const w = mount(NqIdleWarningDialog, { props: { open: true, secondsLeft: 27, warningSeconds: 30, labels: { title: "هل ما زلت هنا؟" } }, attachTo: document.body });
    await flushPromises();
    expect(document.querySelector('[data-slot="idle-warning"]')!.textContent).toContain("هل ما زلت هنا؟");
    const timer = document.querySelector('[role="timer"]')!;
    expect(timer.getAttribute("dir")).toBe("ltr");
    expect(timer.textContent!.trim()).toBe("0:27");
    expect(timer.getAttribute("aria-live")).toBe("off");
    w.unmount();
  });
});

describe("useIdleLock", () => {
  it("moves through the phases", async () => {
    let controls!: ReturnType<typeof useIdleLock>;
    const onIdle = vi.fn();
    const w = mount(
      defineComponent({
        setup() {
          controls = useIdleLock({ timeoutSeconds: 20, warningSeconds: 5, onIdle });
          return () => h("div");
        },
      }),
    );
    expect(controls.phase.value).toBe("active");
    await advance(16_000);
    expect(controls.phase.value).toBe("warning");
    expect(controls.secondsLeft.value).toBe(4);
    await advance(5000);
    expect(controls.phase.value).toBe("locked");
    expect(onIdle).toHaveBeenCalledTimes(1);
    w.unmount();
  });
});
