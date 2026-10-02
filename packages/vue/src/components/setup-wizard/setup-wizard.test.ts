import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { NqAgentEnrollWait, NqSetupWizard } from ".";
import { clampStep, missingSteps, setupProgress } from "./setup-model";

const steps = [
  { id: "name", title: "Name" },
  { id: "extra", title: "Extra", optional: true },
  { id: "agent", title: "Agent" },
];
const slots = { "step-name": "<input aria-label='Name'>", "step-extra": "<p>extra body</p>", "step-agent": "<p>agent body</p>" };
const button = (w: ReturnType<typeof mount>, text: string) => w.findAll("button").find((b) => b.text().includes(text))!;

describe("setup model", () => {
  it("computes the gate and the progress", () => {
    expect(missingSteps(steps, ["name"]).map((s) => s.id)).toEqual(["agent"]);
    expect(missingSteps(steps)).toEqual([]);
    expect(setupProgress(1, 4)).toBe(25);
    expect(clampStep(9, 3)).toBe(2);
  });
});

describe("NqSetupWizard", () => {
  it("renders the first step with the rail and the step count", () => {
    const w = mount(NqSetupWizard, { props: { steps, onFinish: async () => {} }, slots });
    expect(w.attributes("data-slot")).toBe("setup-wizard");
    expect(w.attributes("data-step")).toBe("name");
    expect(w.find('[data-slot="stepper"]').exists()).toBe(true);
    expect(w.find("h2").text()).toBe("Name");
    expect(w.find('[data-slot="setup-wizard-body"]').html()).toContain("Name");
    expect(w.text()).toContain("Step 1 of 3");
    expect(w.text()).toContain("Optional");
  });

  it("runs onStepComplete, moves on, and can skip the optional step", async () => {
    const onStepComplete = vi.fn(async () => {});
    const onCurrentChange = vi.fn();
    const w = mount(NqSetupWizard, { props: { steps, onFinish: async () => {}, onStepComplete, onCurrentChange }, slots });
    await button(w, "Continue").trigger("click");
    await flushPromises();
    expect(onStepComplete).toHaveBeenCalledWith("name");
    expect(onCurrentChange).toHaveBeenCalledWith(1, "extra");
    expect(w.attributes("data-step")).toBe("extra");
    expect(w.text()).toContain("extra body");
    await button(w, "Skip for now").trigger("click");
    expect(w.attributes("data-step")).toBe("agent");
    expect(button(w, "Finish setup")).toBeTruthy();
  });

  it("stays put and shows the error when onStepComplete fails", async () => {
    const w = mount(NqSetupWizard, { props: { steps, onFinish: async () => {}, onStepComplete: async () => ({ error: "Name is taken" }) }, slots });
    await button(w, "Continue").trigger("click");
    await flushPromises();
    expect(w.attributes("data-step")).toBe("name");
    expect(w.text()).toContain("Name is taken");
  });

  it("gates Finish on the missing required steps and the server verdict, then completes", async () => {
    const onFinish = vi.fn(async () => {});
    const w = mount(NqSetupWizard, {
      props: { steps, defaultCurrent: 2, completed: [], canFinish: false, gateMessage: "Connect an agent first.", onFinish },
      slots: { ...slots, "done-action": "<a href='/go'>Open</a>" },
    });
    expect(w.text()).toContain("Connect an agent first.");
    expect(w.findAll("[role=alert] li button").map((b) => b.text())).toEqual(["Name"]);
    expect(button(w, "Finish setup").attributes("disabled")).toBeDefined();
    await w.setProps({ completed: ["name"], canFinish: true });
    expect(button(w, "Finish setup").attributes("disabled")).toBeUndefined();
    await button(w, "Finish setup").trigger("click");
    await flushPromises();
    expect(onFinish).toHaveBeenCalled();
    expect(w.attributes("data-state")).toBe("done");
    expect(w.text()).toContain("You are all set");
    expect(w.find("a[href='/go']").exists()).toBe(true);
  });

  it("holds Continue while the step is not ready, and hides Back on the first step", () => {
    const w = mount(NqSetupWizard, { props: { steps: [{ id: "a", title: "A", ready: false }, { id: "b", title: "B" }], onFinish: async () => {} }, slots: {} });
    expect(button(w, "Continue").attributes("disabled")).toBeDefined();
    expect(button(w, "Back").classes()).toContain("invisible");
  });
});

describe("NqAgentEnrollWait", () => {
  it("waits with a timer, then shows the agent", async () => {
    const w = mount(NqAgentEnrollWait, { props: { command: "curl x | sh", status: "waiting", elapsed: 75 } });
    expect(w.attributes("data-status")).toBe("waiting");
    expect(w.find("input").element.value).toBe("curl x | sh");
    expect(w.find("[data-slot=agent-enroll-status]").text()).toContain("Waiting for your agent to connect");
    expect(w.text()).toContain("Waiting 1:15");
    await w.setProps({ status: "connected", agent: { name: "edge-1", host: "10.0.0.2", version: "1.2.3" } });
    expect(w.text()).toContain("Agent connected");
    expect(w.find("dl").text()).toContain("10.0.0.2");
  });

  it("offers a retry on timeout only when listened to", async () => {
    const onRetry = vi.fn();
    const w = mount(NqAgentEnrollWait, { props: { command: "x", status: "timeout", onRetry } });
    await button(w, "Check again").trigger("click");
    expect(onRetry).toHaveBeenCalled();
    const bare = mount(NqAgentEnrollWait, { props: { command: "x", status: "failed", error: "Bad token" } });
    expect(bare.text()).toContain("Bad token");
    expect(bare.findAll("button").some((b) => b.text().includes("Check again"))).toBe(false);
  });
});
