import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NasaqProvider } from "../../provider";
import { NqDesktopNotification, NqDesktopNotificationStack, NqNotificationPermissionPrompt, permissionStep } from ".";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("NqDesktopNotification", () => {
  it("draws the macOS card with the app tile, title, body and a close button", async () => {
    const closed = vi.fn();
    const w = mount(NqDesktopNotification, { props: { appName: "Nasaq", title: "Deploy finished", body: "Production is on v1.4.2.", onClose: closed, class: "w-80" } });
    expect(w.attributes("role")).toBe("alert");
    expect(w.attributes("data-slot")).toBe("desktop-notification");
    expect(w.attributes("data-platform")).toBe("macos");
    expect(w.classes()).toEqual(expect.arrayContaining(["rounded-[1.1rem]", "w-80"]));
    expect(w.text()).toContain("N");
    expect(w.text()).toContain("Deploy finished");
    expect(w.text()).toContain("now");
    expect(w.find("button[disabled]").exists()).toBe(true);
    await w.find('button[aria-label="Close"]').trigger("click");
    expect(closed).toHaveBeenCalledTimes(1);
  });

  it("draws the Windows card with the app name above the title and a button per action", async () => {
    const onAction = vi.fn();
    const w = mount(NqDesktopNotification, { props: { platform: "windows", appName: "Nasaq", title: "Hi", actions: [{ id: "open", label: "Open" }, { id: "snooze", label: "Snooze" }], onAction } });
    expect(w.attributes("data-platform")).toBe("windows");
    expect(w.find('[role="group"]').attributes("aria-label")).toBe("Nasaq");
    const buttons = w.findAll('[role="group"] button');
    expect(buttons.map((b) => b.text())).toEqual(["Open", "Snooze"]);
    await buttons[1]!.trigger("click");
    expect(onAction).toHaveBeenCalledWith("snooze");
    expect(w.find('button[aria-label="Options"]').exists()).toBe(true);
  });

  it("closes itself after dismissAfter and pauses while hovered", async () => {
    const closed = vi.fn();
    const w = mount(NqDesktopNotification, { props: { appName: "A", title: "T", dismissAfter: 1000, onClose: closed } });
    await w.trigger("mouseenter");
    vi.advanceTimersByTime(5000);
    expect(closed).not.toHaveBeenCalled();
    await w.trigger("mouseleave");
    vi.advanceTimersByTime(999);
    expect(closed).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2);
    expect(closed).toHaveBeenCalledTimes(1);
  });

  it("speaks Arabic from the provider", () => {
    const ar = mount({ components: { NasaqProvider, NqDesktopNotification }, template: '<NasaqProvider locale="ar" target="scope"><NqDesktopNotification app-name="ن" title="ت" platform="windows" /></NasaqProvider>' });
    expect(ar.find('button[aria-label="إغلاق"]').exists()).toBe(true);
    expect(ar.text()).toContain("الآن");
  });
});

describe("NqDesktopNotificationStack", () => {
  const items = [1, 2, 3, 4].map((n) => ({ id: `n${n}`, appName: "App", title: `T${n}` }));

  it("shows the newest cards first on macOS and caps them at max", () => {
    const w = mount(NqDesktopNotificationStack, { props: { items, onClose: () => {}, max: 3 } });
    expect(w.attributes("role")).toBe("region");
    expect(w.attributes("aria-label")).toBe("Notifications");
    expect(w.classes()).toEqual(expect.arrayContaining(["absolute", "end-0", "top-0"]));
    const titles = w.findAll('[data-slot="desktop-notification"]').map((n) => n.find(".truncate.text-label").text());
    expect(titles).toEqual(["T4", "T3", "T2"]);
  });

  it("keeps Windows order, sits bottom end and reports the id on close", async () => {
    const onClose = vi.fn();
    const w = mount(NqDesktopNotificationStack, { props: { items, platform: "windows", placement: "fixed", onClose } });
    expect(w.classes()).toEqual(expect.arrayContaining(["fixed", "bottom-0", "end-0"]));
    const cards = w.findAll('[data-slot="desktop-notification"]');
    expect(cards).toHaveLength(3);
    await cards[0]!.find('button[aria-label="Close"]').trigger("click");
    expect(onClose).toHaveBeenCalledWith("n2");
  });
});

describe("permissionStep and NqNotificationPermissionPrompt", () => {
  it("maps permission and the open dialog to a step", () => {
    expect(permissionStep("default", false)).toBe("ask");
    expect(permissionStep("default", true)).toBe("asking");
    expect(permissionStep("granted", true)).toBe("granted");
    expect(permissionStep("denied", false)).toBe("denied");
    expect(permissionStep("unsupported", false)).toBe("unsupported");
  });

  it("asks, waits while the request is pending, then follows the permission", async () => {
    vi.useRealTimers();
    let resolve!: () => void;
    const onRequest = vi.fn(() => new Promise<void>((r) => (resolve = r)));
    const w = mount(NqNotificationPermissionPrompt, { props: { permission: "default", onRequest, onDismiss: () => {} } });
    expect(w.attributes("data-step")).toBe("ask");
    expect(w.find("h3").text()).toBe("Turn on desktop notifications?");
    expect(w.findAll("button").map((b) => b.text())).toEqual(["Not now", "Turn on"]);
    await w.findAll("button")[1]!.trigger("click");
    expect(onRequest).toHaveBeenCalledTimes(1);
    expect(w.attributes("data-step")).toBe("asking");
    expect(w.find("h3").text()).toBe("Waiting for your system");
    expect(w.findAll("button")[0]!.attributes("disabled")).toBeDefined();
    expect(w.findAll("button")[1]!.attributes("aria-busy")).toBe("true");
    resolve();
    await new Promise((r) => setTimeout(r, 0));
    expect(w.attributes("data-step")).toBe("ask");
    await w.setProps({ permission: "granted", onTest: () => {} });
    expect(w.attributes("data-step")).toBe("granted");
    expect(w.findAll("button").map((b) => b.text())).toEqual(["Send a test"]);
    await w.setProps({ permission: "denied", onOpenSettings: () => {} });
    expect(w.findAll("button").map((b) => b.text())).toEqual(["Open settings"]);
  });
});
