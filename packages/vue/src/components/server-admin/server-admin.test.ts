import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NqJobQueueMonitor, NqPackageUpdatesPanel, NqServiceUnitsList, NqSshKeyManager, parseSshPublicKey, serviceActionsFor, type QueueJob, type ServiceUnit } from ".";

afterEach(() => {
  document.body.innerHTML = "";
  document.documentElement.lang = "en";
  document.documentElement.dir = "ltr";
});

const services = (): ServiceUnit[] => [
  { id: "a", name: "nginx.service", state: "active", enabled: true, memoryBytes: 2048 },
  { id: "b", name: "cron.service", state: "inactive", enabled: false },
];

describe("helpers", () => {
  it("offers the right service actions", () => {
    expect(serviceActionsFor({ state: "inactive", enabled: false })).toEqual(["start", "enable"]);
    expect(serviceActionsFor({ state: "active", enabled: true })).toEqual(["restart", "reload", "stop", "disable"]);
  });
  it("never accepts a private key", () => {
    expect(parseSshPublicKey("-----BEGIN OPENSSH PRIVATE KEY-----\nabc")).toEqual({ ok: false, problem: "private" });
  });
});

describe("NqServiceUnitsList", () => {
  it("renders the units with state and memory", () => {
    const w = mount(NqServiceUnitsList, { props: { services: services(), onAction: vi.fn(async () => {}) }, attachTo: document.body });
    expect(w.attributes("data-slot")).toBe("service-units");
    expect(w.text()).toContain("nginx.service");
    expect(w.text()).toContain("Running");
    expect(w.text()).toContain("Stopped");
    expect(w.text()).toContain("2 KB");
  });

  it("speaks Arabic", () => {
    document.documentElement.lang = "ar";
    const w = mount(NqServiceUnitsList, { props: { services: services(), onAction: vi.fn(async () => {}) }, attachTo: document.body });
    expect(w.text()).toContain("الخدمات");
  });
});

describe("NqPackageUpdatesPanel", () => {
  const packages = [
    { name: "openssl", currentVersion: "3.0.1", newVersion: "3.0.2", kind: "security" as const, sizeBytes: 1_048_576 },
    { name: "htop", currentVersion: "3.2", newVersion: "3.3", kind: "regular" as const },
  ];
  it("summarises the updates and shows the reboot banner", () => {
    const w = mount(NqPackageUpdatesPanel, { props: { packages, rebootRequired: true, onReboot: vi.fn(async () => {}), onCheck: vi.fn(async () => {}), onUpdate: vi.fn(async () => {}) }, attachTo: document.body });
    expect(w.text()).toContain("2 updates");
    expect(w.text()).toContain("1 security");
    expect(w.text()).toContain("A restart is needed");
    expect(w.text()).toContain("Not checked yet");
  });
  it("checks for updates", async () => {
    const onCheck = vi.fn(async () => {});
    const w = mount(NqPackageUpdatesPanel, { props: { packages, onCheck, onUpdate: vi.fn(async () => {}) }, attachTo: document.body });
    await w.findAll("button").find((b) => b.text().includes("Check for updates"))!.trigger("click");
    await flushPromises();
    expect(onCheck).toHaveBeenCalled();
  });
});

describe("NqSshKeyManager", () => {
  it("installs a key on a server from its checkbox", async () => {
    const onInstallChange = vi.fn(async () => {});
    const w = mount(NqSshKeyManager, {
      props: {
        servers: [{ id: "s1", name: "web-1" }],
        keys: [{ id: "k1", name: "Laptop", type: "ed25519", fingerprint: "SHA256:abcdefghijklmnopqrstuvwxyz0123456789", addedAt: "2026-01-01", installedOn: [] }],
        onInstallChange,
        onAdd: vi.fn(async () => {}),
      },
      attachTo: document.body,
    });
    const box = w.find('[role="checkbox"]');
    expect(box.attributes("aria-label")).toBe("Laptop on web-1");
    await box.trigger("click");
    await flushPromises();
    expect(onInstallChange).toHaveBeenCalledWith("k1", "s1", true);
  });
});

describe("NqJobQueueMonitor", () => {
  const jobs = (): QueueJob[] => [
    { id: "1", name: "SendInvoice", queue: "mail", status: "failed", attempts: 3, at: "2026-09-29T08:00:00Z", error: "SMTP down\nstack" },
    { id: "2", name: "Resize", queue: "media", status: "completed", attempts: 1, at: "2026-09-29T08:30:00Z" },
  ];
  it("counts by status and filters when a count is pressed", async () => {
    const w = mount(NqJobQueueMonitor, { props: { jobs: jobs(), onRetry: vi.fn(async () => {}) }, attachTo: document.body });
    expect(w.text()).toContain("SendInvoice");
    expect(w.text()).toContain("SMTP down");
    const failed = w.findAll('[role="group"] button').find((b) => b.text().includes("Failed"))!;
    await failed.trigger("click");
    expect(failed.attributes("aria-pressed")).toBe("true");
    expect(w.text()).not.toContain("Resize");
  });
});
