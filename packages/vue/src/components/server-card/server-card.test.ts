import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NqServerCard, isTransitional, powerActionsFor, validateLimits, type ServerInfo } from ".";
import { NasaqProvider } from "../../provider";
import { defineComponent, h } from "vue";

const settle = () => new Promise((r) => setTimeout(r, 250));

const server: ServerInfo = {
  id: "srv-1",
  name: "web-01",
  status: "running",
  address: "203.0.113.24",
  region: "Frankfurt",
  limits: { cpuCores: 4, memoryMb: 8192, diskGb: 160 },
  metrics: { cpu: 42.4, memory: 71, disk: 38, cpuHistory: [30, 36, 33, 41] },
  lastDeploy: { ref: "a1b2c3d", at: "2026-09-29T08:00:00Z", status: "success", by: "Layla" },
  snapshots: [
    { id: "s1", name: "Before upgrade", createdAt: "2026-09-27T08:00:00Z", sizeLabel: "18.4 GB" },
    { id: "s2", name: "Nightly", createdAt: "2026-09-28T08:00:00Z", status: "creating" },
  ],
};

afterEach(() => {
  document.body.innerHTML = "";
});

describe("server-card helpers", () => {
  it("offers power actions by state", () => {
    expect(powerActionsFor("running")).toEqual(["restart", "stop", "force-stop"]);
    expect(powerActionsFor("stopped")).toEqual(["start"]);
    expect(powerActionsFor("stopping")).toEqual(["force-stop"]);
    expect(powerActionsFor("suspended")).toEqual([]);
    expect(isTransitional("provisioning")).toBe(true);
    expect(validateLimits({ cpuCores: "2", memoryMb: "10", diskGb: "x" }).errors).toEqual({ memoryMb: "range", diskGb: "integer" });
  });
});

describe("NqServerCard", () => {
  it("renders status, hardware, meters and the snapshot rows", () => {
    const w = mount(NqServerCard, { props: { server, onPower: async () => undefined, onTakeSnapshot: async () => undefined, onRollback: async () => undefined, class: "extra" } });
    expect(w.attributes("data-slot")).toBe("server-card");
    expect(w.attributes("data-status")).toBe("running");
    expect(w.classes()).toContain("extra");
    expect(w.find("h3").text()).toBe("web-01");
    expect(w.text()).toContain("Running");
    expect(w.text()).toContain("4 vCPU");
    expect(w.text()).toContain("8 GB");
    expect(w.text()).toContain("160 GB");
    const meters = w.findAll('[data-slot="meter"]');
    expect(meters).toHaveLength(3);
    expect(meters[0]!.attributes("aria-valuenow")).toBe("42.4");
    expect(meters[0]!.text()).toContain("42%");
    expect(w.find('[data-slot="sparkline"]').attributes("aria-label")).toBe("CPU load of web-01, recent");
    expect(w.findAll('[data-slot="server-power"] button').map((b) => b.text())).toEqual(["Restart", "Stop", "Force stop"]);
    expect(w.findAll('[data-slot="server-snapshot"]')).toHaveLength(2);
    expect(w.findAll('[data-slot="server-snapshot"]')[1]!.text()).toContain("Creating");
  });

  it("shows the no-metrics note and a transitional state, and a skeleton while loading", () => {
    const off = mount(NqServerCard, { props: { server: { ...server, status: "stopping", metrics: undefined }, onPower: async () => undefined } });
    expect(off.text()).toContain("Live usage is not available");
    expect(off.text()).toContain("Stopping…");
    expect(off.findAll('[data-slot="server-power"] button').map((b) => b.text())).toEqual(["Force stop"]);
    const loading = mount(NqServerCard, { props: { server, loading: true, onPower: async () => undefined } });
    expect(loading.attributes("aria-busy")).toBe("true");
    expect(loading.find("h3").exists()).toBe(false);
  });

  it("runs restart at once and shows the server error", async () => {
    const onPower = vi.fn().mockResolvedValueOnce({ error: "Quota exceeded" });
    const w = mount(NqServerCard, { props: { server, onPower } });
    await w.findAll('[data-slot="server-power"] button')[0]!.trigger("click");
    await flushPromises();
    expect(onPower).toHaveBeenCalledWith("restart");
    expect(w.find('[data-slot="alert"]').text()).toContain("Quota exceeded");
  });

  it("asks before stop and runs it on confirm", async () => {
    const onPower = vi.fn().mockResolvedValue(undefined);
    const w = mount(NqServerCard, { props: { server, onPower }, attachTo: document.body });
    await w.findAll('[data-slot="server-power"] button')[1]!.trigger("click");
    await flushPromises();
    expect(onPower).not.toHaveBeenCalled();
    expect(document.querySelector('[data-slot="alert-dialog-title"]')!.textContent).toBe("Stop web-01?");
    document.querySelector<HTMLElement>('[data-slot="alert-dialog-action"]')!.click();
    await flushPromises();
    await settle();
    expect(onPower).toHaveBeenCalledWith("stop");
    w.unmount();
  });

  it("deletes a snapshot from its menu after the confirm", async () => {
    const onDeleteSnapshot = vi.fn().mockResolvedValue(undefined);
    const w = mount(NqServerCard, { props: { server, onPower: async () => undefined, onDeleteSnapshot }, attachTo: document.body });
    await w.find('[aria-label="Actions for Before upgrade"]').trigger("click");
    await w.find('[aria-label="Actions for Before upgrade"]').trigger("pointerdown", { button: 0, pointerType: "mouse" });
    await flushPromises();
    const item = document.querySelector<HTMLElement>('[data-slot="dropdown-menu-item"]');
    expect(item?.textContent).toContain("Delete");
    item!.click();
    await flushPromises();
    expect(document.querySelector('[data-slot="alert-dialog-title"]')!.textContent).toBe("Delete Before upgrade?");
    document.querySelector<HTMLElement>('[data-slot="alert-dialog-action"]')!.click();
    await flushPromises();
    expect(onDeleteSnapshot).toHaveBeenCalledWith("s1");
    w.unmount();
  });

  it("validates the limits editor and saves parsed numbers", async () => {
    const onSaveLimits = vi.fn().mockResolvedValue(undefined);
    const w = mount(NqServerCard, { props: { server, onPower: async () => undefined, onSaveLimits }, attachTo: document.body });
    const open = w.findAll("button").find((b) => b.text() === "Resource limits")!;
    await open.trigger("click");
    await flushPromises();
    const inputs = document.querySelectorAll<HTMLInputElement>('[data-slot="server-limits"] input');
    expect(inputs).toHaveLength(3);
    inputs[0]!.value = "0";
    inputs[0]!.dispatchEvent(new Event("input"));
    await flushPromises();
    document.querySelector<HTMLFormElement>('[data-slot="server-limits"] form')!.dispatchEvent(new Event("submit", { cancelable: true }));
    await flushPromises();
    expect(onSaveLimits).not.toHaveBeenCalled();
    expect(document.querySelector('[data-slot="field-error"]')!.textContent).toBe("Enter a number from 1 to 64.");
    inputs[0]!.value = "8";
    inputs[0]!.dispatchEvent(new Event("input"));
    await flushPromises();
    document.querySelector<HTMLFormElement>('[data-slot="server-limits"] form')!.dispatchEvent(new Event("submit", { cancelable: true }));
    await flushPromises();
    expect(onSaveLimits).toHaveBeenCalledWith({ cpuCores: 8, memoryMb: 8192, diskGb: 160 });
    w.unmount();
  });

  it("speaks Arabic under an Arabic provider", () => {
    const Host = defineComponent({ render: () => h(NasaqProvider, { locale: "ar", target: "scope" }, () => h(NqServerCard, { server: { ...server, status: "stopped", metrics: undefined }, onPower: async () => undefined })) });
    const w = mount(Host);
    expect(w.text()).toContain("متوقف");
    expect(w.findAll('[data-slot="server-power"] button').map((b) => b.text())).toEqual(["تشغيل"]);
  });
});
