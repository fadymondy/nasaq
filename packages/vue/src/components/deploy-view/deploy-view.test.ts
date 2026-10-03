import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { NqDeployView, type DeployStep } from ".";

afterEach(() => {
  document.body.innerHTML = "";
  document.documentElement.lang = "en";
  document.documentElement.dir = "ltr";
});

const steps = (): DeployStep[] => [
  { id: "install", name: "Install", command: "pnpm install", status: "success", durationMs: 8200, logs: "ok" },
  { id: "build", name: "Build", status: "failed", durationMs: 1500, error: "Exit code 1", logs: "\u001b[31mboom\u001b[0m" },
  { id: "ship", name: "Ship", status: "pending" },
];

const mountIt = (props: Record<string, unknown> = {}) => mount(NqDeployView, { props: { title: "Deploy api", steps: steps(), ...props }, attachTo: document.body });

describe("NqDeployView", () => {
  it("derives the status and shows progress", () => {
    const w = mountIt();
    expect(w.attributes("data-slot")).toBe("deploy-view");
    expect(w.attributes("data-status")).toBe("failed");
    expect(w.find('[data-slot="deploy-status"]').text()).toContain("Failed");
    expect(w.find('[role="progressbar"]').attributes("aria-valuenow")).toBe("33.33333333333333");
    expect(w.findAll('[data-slot="deploy-step"]')).toHaveLength(3);
  });

  it("opens failed steps by default, with the error and logs", () => {
    const w = mountIt();
    expect(w.text()).toContain("Exit code 1");
    expect(w.find('[role="log"]').exists()).toBe(true);
    expect(w.findAll('[role="log"]')).toHaveLength(1);
  });

  it("toggles a step open", async () => {
    const w = mountIt();
    await w.findAll('[data-slot="collapsible-trigger"]')[0]!.trigger("click");
    await nextTick();
    expect(w.findAll('[role="log"]').length).toBeGreaterThan(1);
  });

  it("retries a failed step and shows a returned error", async () => {
    const onRetry = vi.fn(async () => ({ error: "Still broken" }));
    const w = mountIt({ onRetry });
    const retry = w.findAll("button").find((b) => b.text().includes("Retry step"))!;
    await retry.trigger("click");
    await vi.waitFor(() => expect(w.text()).toContain("Still broken"));
    expect(onRetry).toHaveBeenCalledWith("build");
  });

  it("shows cancel only while running", async () => {
    const onCancel = vi.fn(async () => {});
    const w = mountIt({ onCancel });
    expect(w.text()).not.toContain("Cancel deploy");
    await w.setProps({ steps: steps().map((s) => (s.id === "build" ? { ...s, status: "running" as const, startedAt: Date.now() } : s)) });
    expect(w.text()).toContain("Cancel deploy");
  });

  it("speaks Arabic", () => {
    document.documentElement.lang = "ar";
    const w = mountIt();
    expect(w.find('[data-slot="deploy-status"]').text()).toContain("فشل");
  });
});
