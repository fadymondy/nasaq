import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { NqChromeExtensionInstall } from ".";

const url = "https://chromewebstore.google.com/detail/x";

describe("NqChromeExtensionInstall", () => {
  it("not installed: step 1 is current, later steps are blocked, check button shows", async () => {
    const onCheck = vi.fn(async () => {});
    const w = mount(NqChromeExtensionInstall, { props: { storeUrl: url, installed: false, onCheck } });
    expect(w.attributes("data-state")).toBe("missing");
    const steps = w.findAll('[data-slot="extension-step"]');
    expect(steps.map((s) => s.attributes("data-state"))).toEqual(["current", "todo", "todo"]);
    expect(steps[0]!.attributes("aria-current")).toBe("step");
    expect(w.get('[data-slot="extension-store-link"]').attributes("href")).toBe(url);
    expect(w.text()).toContain("Do the step above first.");
    await w.get('[data-slot="extension-detected"] button').trigger("click");
    expect(onCheck).toHaveBeenCalled();
  });

  it("installed: pin is confirmed by the person, then sign-in is current", async () => {
    const onSignIn = vi.fn(async () => ({ error: "Nope" }));
    const w = mount(NqChromeExtensionInstall, { props: { storeUrl: url, installed: true, version: "1.2.0", onSignIn } });
    expect(w.attributes("data-state")).toBe("installed");
    expect(w.get('[data-slot="extension-detected"]').text()).toContain("version 1.2.0");
    const pin = w.findAll("button").find((b) => b.text() === "I pinned it")!;
    await pin.trigger("click");
    expect(w.emitted("update:pinned")![0]).toEqual([true]);
    expect(w.findAll('[data-slot="extension-step"]').map((s) => s.attributes("data-state"))).toEqual(["done", "done", "current"]);
    await w.findAll("button").find((b) => b.text() === "Sign in")!.trigger("click");
    await flushPromises();
    expect(w.get('[role="alert"]').text()).toBe("Nope");
  });

  it("all done is ready; unsupported shows a notice", () => {
    const w = mount(NqChromeExtensionInstall, { props: { storeUrl: url, installed: true, signedIn: true, pinned: true, supported: false } });
    expect(w.attributes("data-state")).toBe("ready");
    expect(w.text()).toContain("You are all set");
    expect(w.text()).toContain("Chrome extensions work in Chrome");
    expect(w.text()).toContain("Signed in");
  });
});
