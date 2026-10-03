import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NqOnboardingFlow, checklistSummary, parseInviteEmails } from ".";

const button = (w: ReturnType<typeof mount>, text: string) => w.findAll("button").find((b) => b.text().includes(text))!;
const click = async (w: ReturnType<typeof mount>, text: string) => {
  await button(w, text).trigger("click");
  await flushPromises();
};
const make = (props: Record<string, unknown> = {}) => mount(NqOnboardingFlow, { props: { onFinish: async () => undefined, ...props }, attachTo: document.body });
const named = { workspace: { mode: "create", name: "Acme", code: "" } };

beforeEach(() => {
  window.localStorage.clear();
  document.body.innerHTML = "";
});

describe("model helpers", () => {
  it("parses invite emails and summarises a checklist", () => {
    expect(parseInviteEmails("a@b.co, bad, a@b.co", []).invalid).toEqual(["bad"]);
    expect(checklistSummary([{ id: "x", done: true }, { id: "y" }]).percent).toBe(50);
  });
});

describe("NqOnboardingFlow", () => {
  it("renders the welcome step inside the setup wizard", () => {
    const w = make({ userName: "Sara" });
    expect(w.attributes("data-slot")).toBe("onboarding-flow");
    expect(w.find('[data-slot="setup-wizard"]').exists()).toBe(true);
    expect(w.find('[data-slot="onboarding-welcome"]').text()).toContain("Welcome, Sara");
    expect(w.find('[data-slot="onboarding-welcome"] ul').findAll("li")).toHaveLength(5);
    expect(w.text()).toContain("Step 1 of 7");
    w.unmount();
  });

  it("merges the class and hides optional steps", () => {
    const w = make({ class: "extra", hideSteps: ["invite", "integration"] });
    expect(w.classes()).toContain("extra");
    expect(w.text()).toContain("Step 1 of 5");
    expect(w.find('[data-slot="onboarding-welcome"] ul').findAll("li")).toHaveLength(3);
    w.unmount();
  });

  it("validates the profile name before moving on", async () => {
    const onSaveProfile = vi.fn(async () => undefined);
    const w = make({ onSaveProfile });
    await click(w, "Continue");
    expect(w.find('[data-slot="onboarding-profile"]').exists()).toBe(true);
    await click(w, "Continue");
    expect(onSaveProfile).not.toHaveBeenCalled();
    expect(w.text()).toContain("Enter your name.");
    expect(w.find('[data-slot="onboarding-profile"] input[aria-invalid="true"]').exists()).toBe(true);
    await w.find('[data-slot="onboarding-profile"] input[autocomplete="name"]').setValue("Sara Ali");
    await click(w, "Continue");
    expect(onSaveProfile).toHaveBeenCalledWith(expect.objectContaining({ name: "Sara Ali" }));
    expect(w.find('[data-slot="onboarding-workspace"]').exists()).toBe(true);
    w.unmount();
  });

  it("stays on the step and shows the error a save resolves", async () => {
    const w = make({ userName: "Sara", onSaveProfile: async () => ({ error: "Server said no" }) });
    await click(w, "Continue");
    await click(w, "Continue");
    expect(w.find('[data-slot="onboarding-profile"]').exists()).toBe(true);
    expect(w.text()).toContain("Server said no");
    w.unmount();
  });

  it("skips an optional step, marks it skipped, and reviews at the end", async () => {
    const onProgress = vi.fn();
    const w = make({ userName: "Sara", defaultValues: named, hideSteps: ["preferences", "integration"], "onUpdate:progress": onProgress });
    await click(w, "Continue"); // welcome
    await click(w, "Continue"); // profile
    await click(w, "Continue"); // workspace
    expect(w.find('[data-slot="onboarding-invite"]').exists()).toBe(true);
    await click(w, "Skip for now");
    expect(w.find('[data-slot="onboarding-finish"]').exists()).toBe(true);
    const last = onProgress.mock.calls.at(-1)![0];
    expect(last.skipped).toContain("invite");
    expect(last.completed).toEqual(expect.arrayContaining(["welcome", "profile", "workspace"]));
    const review = w.find('[data-slot="onboarding-finish"]').text();
    expect(review).toContain("Skipped");
    expect(review).toContain("Done");
    expect(review).toContain("You can finish skipped steps");
    w.unmount();
  });

  it("finishes, calls onFinish with the values and clears the saved progress", async () => {
    const onFinish = vi.fn(async () => undefined);
    const w = make({ userName: "Sara", defaultValues: named, hideSteps: ["invite", "preferences", "integration"], onFinish, storageKey: "k" });
    await click(w, "Continue");
    await click(w, "Continue");
    await click(w, "Continue");
    await click(w, "Finish setup");
    expect(onFinish).toHaveBeenCalledWith(expect.objectContaining({ profile: expect.objectContaining({ name: "Sara" }) }));
    expect(w.text()).toContain("You are ready");
    expect(window.localStorage.getItem("k")).toBeNull();
    w.unmount();
  });

  it("connects an integration and shows it connected", async () => {
    const onConnect = vi.fn(async () => undefined);
    const w = make({ userName: "Sara", defaultValues: named, hideSteps: ["invite", "preferences"], onConnect });
    for (let i = 0; i < 3; i++) await click(w, "Continue");
    expect(w.find('[data-slot="onboarding-integration"]').exists()).toBe(true);
    await w.find('[aria-label="Connect GitHub"]').trigger("click");
    await flushPromises();
    expect(onConnect).toHaveBeenCalledWith("github");
    expect(w.find('[data-slot="onboarding-integration"]').text()).toContain("Connected");
    w.unmount();
  });

  it("saves progress to localStorage and resumes from it", async () => {
    const w = make({ userName: "Sara", storageKey: "onb" });
    await flushPromises();
    await click(w, "Continue");
    const saved = JSON.parse(window.localStorage.getItem("onb")!);
    expect(saved.current).toBe("profile");
    expect(saved.completed).toContain("welcome");
    w.unmount();
    const again = make({ userName: "Sara", storageKey: "onb" });
    await flushPromises();
    expect(again.find('[data-slot="onboarding-profile"]').exists()).toBe(true);
    expect(again.text()).not.toContain("Welcome back");
    again.unmount();
  });

  it("validates the invite code on the join tab", async () => {
    const w = make({ userName: "Sara" });
    await click(w, "Continue");
    await click(w, "Continue");
    const join = w.findAll('[role="tab"]').find((b) => b.text().includes("Join with a code"))!;
    await join.trigger("mousedown");
    await join.trigger("click");
    await flushPromises();
    await click(w, "Continue");
    expect(w.text()).toContain("Enter the invite code.");
    w.unmount();
  });

  it("is Arabic when the document language is Arabic", () => {
    document.documentElement.lang = "ar";
    const w = make({ userName: "سارة" });
    expect(w.text()).toContain("أهلًا بك يا سارة");
    document.documentElement.lang = "en";
    w.unmount();
  });
});
