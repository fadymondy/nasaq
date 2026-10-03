import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NqInstallPrompt, NqPushOptIn, detectInstallPlatform, nextAskAt, shouldAsk } from ".";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("helpers", () => {
  it("detects the platform and the snooze", () => {
    expect(detectInstallPlatform("x", true)).toBe("installed");
    expect(detectInstallPlatform("Mozilla iPhone", false)).toBe("ios");
    expect(detectInstallPlatform("x", false, true)).toBe("prompt");
    expect(detectInstallPlatform("x", false)).toBe("unsupported");
    expect(shouldAsk(10, nextAskAt(0, 1))).toBe(false);
    expect(shouldAsk(nextAskAt(0, 1), nextAskAt(0, 1))).toBe(true);
  });
});

describe("NqInstallPrompt", () => {
  it("shows the benefits, installs and dismisses", async () => {
    const onInstall = vi.fn();
    const onDismiss = vi.fn();
    const w = mount(NqInstallPrompt, { props: { open: true, platform: "prompt", appName: "Nasaq", onInstall, onDismiss }, attachTo: document.body });
    await flushPromises();
    const root = document.body.querySelector('[data-slot="install-prompt"]');
    expect(root?.getAttribute("data-platform")).toBe("prompt");
    expect(root?.textContent).toContain("Install Nasaq");
    expect(root?.querySelectorAll("li")).toHaveLength(3);
    const buttons = [...document.body.querySelectorAll("button")];
    buttons.find((b) => b.textContent?.includes("Install"))?.click();
    await flushPromises();
    expect(onInstall).toHaveBeenCalled();
    buttons.find((b) => b.textContent?.includes("Not now"))?.click();
    await flushPromises();
    expect(onDismiss).toHaveBeenCalled();
    expect(w.emitted("update:open")?.[0]).toEqual([false]);
    w.unmount();
  });

  it("walks iOS through two steps", async () => {
    const w = mount(NqInstallPrompt, { props: { open: true, platform: "ios", appName: "Nasaq" }, attachTo: document.body });
    await flushPromises();
    expect(document.body.querySelectorAll('[data-slot="install-prompt"] ol li')).toHaveLength(2);
    w.unmount();
  });

  it("confirms when installed", async () => {
    const w = mount(NqInstallPrompt, { props: { open: true, platform: "installed", appName: "Nasaq" }, attachTo: document.body });
    await flushPromises();
    expect(document.body.textContent).toContain("Nasaq is installed");
    w.unmount();
  });
});

describe("NqPushOptIn", () => {
  it("asks for permission first", () => {
    const w = mount(NqPushOptIn, { props: { permission: "default", onRequestPermission: vi.fn(), subscribed: false, onSubscribedChange: vi.fn() } });
    expect(w.attributes("data-slot")).toBe("push-opt-in");
    expect(w.find('[role="switch"]').exists()).toBe(false);
  });

  it("toggles this device, lists devices and removes one", async () => {
    const onSubscribedChange = vi.fn().mockResolvedValue({ error: "Failed" });
    const onRemoveDevice = vi.fn().mockResolvedValue(undefined);
    const w = mount(NqPushOptIn, {
      props: {
        permission: "granted",
        onRequestPermission: vi.fn(),
        subscribed: true,
        onSubscribedChange,
        onRemoveDevice,
        devices: [
          { id: "a", name: "iPhone", kind: "phone" as const, current: true },
          { id: "b", name: "Laptop" },
        ],
        class: "ms-2",
      },
    });
    expect(w.classes()).toContain("ms-2");
    expect(w.text()).toContain("This device will get notifications.");
    expect(w.findAll("li")).toHaveLength(2);
    await w.find('[role="switch"]').trigger("click");
    await flushPromises();
    expect(onSubscribedChange).toHaveBeenCalledWith(false);
    expect(w.text()).toContain("Failed");
    await w.find('button[aria-label="Remove Laptop"]').trigger("click");
    await flushPromises();
    expect(onRemoveDevice).toHaveBeenCalledWith("b");
    expect(w.find('button[aria-label="Remove iPhone"]').exists()).toBe(false);
  });
});
