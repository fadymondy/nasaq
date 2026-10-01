import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NqInstallButton } from ".";

describe("NqInstallButton", () => {
  it("available: a secondary Install button with the app name in its accessible name", async () => {
    const w = mount(NqInstallButton, { props: { appName: "Mahaam" } });
    expect(w.attributes("data-slot")).toBe("install-button");
    expect(w.attributes("data-state")).toBe("available");
    expect(w.attributes("aria-label")).toBe("Install Mahaam");
    expect(w.text()).toBe("Install");
    expect(w.classes()).toContain("border-border");
    await w.trigger("click");
    expect(w.emitted("install")).toHaveLength(1);
  });

  it("free apps say Get; update says Update and emits update", async () => {
    expect(mount(NqInstallButton, { props: { appName: "A", free: true } }).text()).toBe("Get");
    const w = mount(NqInstallButton, { props: { appName: "A", state: "update" } });
    expect(w.text()).toBe("Update");
    await w.trigger("click");
    expect(w.emitted("update")).toHaveLength(1);
  });

  it("installing is busy and blocks clicks", async () => {
    const w = mount(NqInstallButton, { props: { appName: "A", state: "installing" } });
    expect(w.attributes("aria-busy")).toBe("true");
    await w.trigger("click");
    expect(w.emitted("install")).toBeUndefined();
  });

  it("installed becomes a quiet Open with a check", async () => {
    const w = mount(NqInstallButton, { props: { appName: "Mahaam", state: "installed" } });
    expect(w.attributes("aria-label")).toBe("Open Mahaam");
    expect(w.find("svg").classes()).toContain("text-nq-success-text");
    expect(w.classes()).toContain("hover:bg-nq-hover");
    await w.trigger("click");
    expect(w.emitted("open")).toHaveLength(1);
  });
});
