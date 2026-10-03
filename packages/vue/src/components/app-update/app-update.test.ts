import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { h } from "vue";
import { NasaqProvider } from "../../provider";
import { NqForcedUpdateGate, NqReleaseManager, NqUpdatePill, NqUpdateSheet, clampUpdatePercent, formatUpdateSize, isUpdateRequired, minBuildProblem, secondsLeft } from ".";

const release = {
  version: "2.4.0",
  build: 240,
  size: 48_200_000,
  channel: "beta" as const,
  date: "2026-09-28",
  notes: [
    { type: "new" as const, text: "Offline mode" },
    { type: "fixed" as const, text: "Receipts" },
  ],
};

describe("helpers", () => {
  it("decides, clamps and formats", () => {
    expect(isUpdateRequired(10, 12)).toBe(true);
    expect(isUpdateRequired(12, 12)).toBe(false);
    expect(isUpdateRequired(1, null)).toBe(false);
    expect(clampUpdatePercent(140)).toBe(100);
    expect(clampUpdatePercent(Number.NaN)).toBe(0);
    expect(formatUpdateSize(48_200_000)).toBe("46 MB");
    expect(secondsLeft(100, 50, 10)).toBe(5);
    expect(minBuildProblem(5, 4)).toBe("too-high");
    expect(minBuildProblem(-1, 4)).toBe("invalid");
    expect(minBuildProblem(3, 4)).toBeNull();
  });
});

describe("NqUpdatePill", () => {
  it("shows the state, the fill while downloading and merges classes", () => {
    const w = mount(NqUpdatePill, { props: { status: "downloading", progress: 42.4, version: "2.4.0", class: "ms-2" } });
    expect(w.attributes("data-slot")).toBe("update-pill");
    expect(w.attributes("data-status")).toBe("downloading");
    expect(w.attributes("title")).toBe("Version 2.4.0");
    expect(w.text()).toBe("Downloading 42%");
    expect(w.classes()).toEqual(expect.arrayContaining(["rounded-full", "ms-2", "border-border"]));
    expect(w.find('[data-slot="update-pill-fill"]').attributes("style")).toContain("42%");
    expect(w.find("svg").classes()).toContain("motion-safe:animate-spin");
  });

  it("is green when ready, red on error, and has no fill", () => {
    const ready = mount(NqUpdatePill, { props: { status: "ready" } });
    expect(ready.text()).toBe("Restart to update");
    expect(ready.classes()).toContain("bg-nq-success-soft");
    expect(ready.find('[data-slot="update-pill-fill"]').exists()).toBe(false);
    const error = mount(NqUpdatePill, { props: { status: "error" } });
    expect(error.classes()).toContain("bg-nq-danger-soft");
  });

  it("speaks Arabic from the provider", () => {
    const w = mount({ render: () => h(NasaqProvider, { defaultLocale: "ar", target: "scope" }, () => h(NqUpdatePill, { status: "available" })) });
    expect(w.text()).toBe("تحديث متاح");
  });

  it("emits click", async () => {
    const w = mount(NqUpdatePill, { props: { status: "available" } });
    await w.trigger("click");
    expect(w.emitted("click")).toHaveLength(1);
  });
});

describe("NqUpdateSheet", () => {
  it("renders notes and size, downloads, and closes with Later", async () => {
    const onDownload = vi.fn();
    const onLater = vi.fn();
    const w = mount(NqUpdateSheet, { props: { open: true, release, status: "available", onDownload, onLater }, attachTo: document.body });
    await flushPromises();
    const content = document.querySelector<HTMLElement>('[data-slot="update-sheet"]')!;
    expect(content.getAttribute("data-status")).toBe("available");
    expect(content.getAttribute("role")).toBe("dialog");
    expect(content.textContent).toContain("Version 2.4.0 is ready");
    expect(content.textContent).toContain("Build 240");
    expect(content.textContent).toContain("Offline mode");
    expect(content.textContent).toContain("Beta");
    expect(content.textContent).toContain("46 MB");
    const buttons = [...content.querySelectorAll<HTMLButtonElement>('[data-slot="button"]')];
    buttons.find((b) => b.textContent?.trim() === "Download update")!.click();
    expect(onDownload).toHaveBeenCalledTimes(1);
    buttons.find((b) => b.textContent?.trim() === "Later")!.click();
    expect(onLater).toHaveBeenCalledTimes(1);
    expect(w.emitted("update:open")?.[0]).toEqual([false]);
    w.unmount();
  });

  it("shows speed and time left while downloading, and Restart when ready", async () => {
    const w = mount(NqUpdateSheet, { props: { open: true, release, status: "downloading", progress: 50, speed: 3_200_000 }, attachTo: document.body });
    await flushPromises();
    const content = document.querySelector<HTMLElement>('[data-slot="update-sheet"]')!;
    const bar = content.querySelector('[role="progressbar"]')!;
    expect(bar.getAttribute("aria-valuenow")).toBe("50");
    expect(content.querySelector('[data-slot="update-progress"]')!.textContent).toContain("3.1 MB/s");
    expect(content.querySelector('[data-slot="update-progress"]')!.textContent).toContain("left");
    await w.setProps({ status: "ready" });
    await flushPromises();
    expect(content.textContent).toContain("Restart now");
    expect(content.querySelector('[role="status"]')!.textContent).toContain("The update is downloaded");
    await w.setProps({ status: "error" });
    await flushPromises();
    expect(content.textContent).toContain("Try again");
    expect(content.querySelector('[role="alert"]')).not.toBeNull();
    w.unmount();
  });
});

describe("NqForcedUpdateGate", () => {
  it("renders the app when the build is supported", () => {
    const w = mount(NqForcedUpdateGate, { props: { currentBuild: 240, minSupportedBuild: 200, release, status: "available" }, slots: { default: "<p>APPCONTENT</p>" } });
    expect(w.text()).toBe("APPCONTENT");
    expect(w.find("main").exists()).toBe(false);
  });

  it("blocks an old build with the only action being update", async () => {
    const onDownload = vi.fn();
    const w = mount(NqForcedUpdateGate, {
      props: { currentBuild: 100, minSupportedBuild: 200, release, status: "available", onDownload, class: "bg-card" },
      slots: { default: "<p>APPCONTENT</p>" },
    });
    const main = w.find("main");
    expect(main.attributes("data-slot")).toBe("forced-update-gate");
    expect(main.classes()).toEqual(expect.arrayContaining(["min-h-dvh", "bg-card"]));
    expect(w.text()).not.toContain("APPCONTENT");
    expect(w.text()).toContain("Please update to continue");
    expect(w.text()).toContain("You have build 100. The oldest supported build is 200.");
    expect(w.find('[data-slot="product-mark"]').exists()).toBe(true);
    await w.find('[data-slot="button"]').trigger("click");
    expect(onDownload).toHaveBeenCalledTimes(1);
  });

  it("replaces the logo with the slot and shows only three notes", () => {
    const many = { ...release, notes: ["a", "b", "c", "d"].map((text) => ({ type: "new" as const, text })) };
    const w = mount(NqForcedUpdateGate, { props: { currentBuild: 1, minSupportedBuild: 2, release: many, status: "ready" }, slots: { logo: "<i data-slot=\"my-logo\"></i>" } });
    expect(w.find('[data-slot="my-logo"]').exists()).toBe(true);
    expect(w.findAll("li")).toHaveLength(3);
    expect(w.text()).toContain("Restart now");
  });
});

const releases = [
  { id: "r1", version: "2.4.0", build: 240, status: "live" as const, rollout: 50, channel: "stable" as const, date: "2026-09-28" },
  { id: "r2", version: "2.5.0-beta", build: 250, status: "draft" as const, channel: "beta" as const },
];

describe("NqReleaseManager", () => {
  it("lists the releases with the right actions and the Min tag", () => {
    const w = mount(NqReleaseManager, { props: { releases, minSupportedBuild: 240, onSetMinSupportedBuild: async () => {}, onPublish: async () => {}, onRollback: async () => {} } });
    expect(w.attributes("data-slot")).toBe("release-manager");
    const rows = w.findAll("tbody tr");
    expect(rows).toHaveLength(2);
    expect(rows[0]!.text()).toContain("Min");
    expect(rows[0]!.text()).toContain("Roll back");
    expect(rows[0]!.text()).toContain("50%");
    expect(rows[1]!.text()).toContain("Publish");
    expect(rows[1]!.text()).toContain("Draft");
    expect(rows[1]!.text()).toContain("—");
  });

  it("shows the empty state", () => {
    const w = mount(NqReleaseManager, { props: { releases: [], minSupportedBuild: 0, onSetMinSupportedBuild: async () => {} } });
    expect(w.find("td[colspan='7']").text()).toBe("No releases yet.");
  });

  it("validates, warns how many are blocked, saves and reports", async () => {
    const save = vi.fn(async () => {});
    const w = mount(NqReleaseManager, {
      props: { releases, minSupportedBuild: 200, usage: [{ build: 200, users: 1200 }, { build: 240, users: 30 }], onSetMinSupportedBuild: save },
    });
    const input = w.find("input");
    const saveButton = w.findAll("button").find((b) => b.text() === "Save")!;
    expect(saveButton.attributes("disabled")).toBeDefined();
    await input.setValue("999");
    expect(w.text()).toContain("That is newer than the latest release.");
    expect(input.attributes("aria-invalid")).toBe("true");
    expect(saveButton.attributes("disabled")).toBeDefined();
    await input.setValue("x");
    expect(w.text()).toContain("Enter a whole number, 0 or more.");
    await input.setValue("240");
    expect(w.find('[data-slot="alert"]').text()).toContain("1,200 people are on a build below this");
    await saveButton.trigger("click");
    await flushPromises();
    expect(save).toHaveBeenCalledWith(240);
    expect(w.find('[role="status"]:not([data-slot])').text()).toBe("Saved");
  });

  it("shows an error from the save and runs publish and roll back", async () => {
    const publish = vi.fn(async () => {});
    const rollback = vi.fn(async () => {});
    const w = mount(NqReleaseManager, {
      props: { releases, minSupportedBuild: 200, onSetMinSupportedBuild: async () => ({ error: "Not allowed" }), onPublish: publish, onRollback: rollback },
    });
    await w.find("input").setValue("210");
    await w.findAll("button").find((b) => b.text() === "Save")!.trigger("click");
    await flushPromises();
    expect(w.find('[role="status"]:not([data-slot])').text()).toBe("Not allowed");
    await w.findAll("button").find((b) => b.text() === "Publish")!.trigger("click");
    await w.findAll("button").find((b) => b.text() === "Roll back")!.trigger("click");
    expect(publish).toHaveBeenCalledWith("r2");
    expect(rollback).toHaveBeenCalledWith("r1");
  });
});
