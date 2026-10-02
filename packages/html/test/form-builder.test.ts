// The Blade form-builder example under real Alpine.
import { describe, expect, it, vi } from "vitest";
import { mount, setup, tick } from "./_float-setup";
import Alpine from "alpinejs";

setup();
const root = (host: HTMLElement) => host.querySelector<HTMLElement>('[data-slot="form-builder"]')!;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data = (host: HTMLElement) => Alpine.$data(root(host)) as any;
const rows = (host: HTMLElement) => [...host.querySelectorAll<HTMLElement>('[data-slot="form-builder-field"]')].map((r) => r.getAttribute("data-id"));

describe("form-builder (Blade example)", () => {
  it("lists the fields of the definition and selects the first", async () => {
    const host = await mount("form-builder");
    await tick(100);
    expect(rows(host)).toEqual(["name", "email", "topic", "message"]);
    expect(host.querySelector('[data-slot="form-builder-field"] [data-field-select]')!.getAttribute("aria-current")).toBe("true");
    expect(host.querySelector('aside[aria-label="Live preview"]')).not.toBeNull();
  });

  it("adds, moves, duplicates and removes fields, and reports the change", async () => {
    const host = await mount("form-builder");
    await tick(100);
    const changes: unknown[] = [];
    root(host).addEventListener("nq-form-builder-change", (e) => changes.push((e as CustomEvent).detail.form));
    data(host).addField("number");
    await tick(60);
    expect(rows(host).at(-1)).toBe("number");
    data(host).act("up", "number");
    data(host).act("dup", "name");
    await tick(60);
    expect(rows(host)).toEqual(["name", "name_2", "email", "topic", "number", "message"]);
    data(host).act("remove", "name_2");
    await tick(60);
    expect(rows(host)).not.toContain("name_2");
    expect(changes.length).toBeGreaterThan(0);
  });

  it("removes the rules of a removed field", async () => {
    const host = await mount("form-builder");
    await tick(100);
    data(host).form.rules = [{ event: "change", conditions: { kind: "group", join: "and", children: [] }, actions: [{ type: "show", config: { target: "message" } }] }];
    data(host).removeField("message");
    expect(data(host).form.rules).toEqual([]);
  });

  it("turns the options text into options for a choice field", async () => {
    const host = await mount("form-builder");
    await tick(100);
    data(host).choose("topic");
    await tick(60);
    data(host).optionsText = "Riyadh | الرياض\nJeddah";
    await tick(60);
    expect(data(host).form.fields[2].options).toEqual([
      { value: "riyadh", label: "Riyadh", labelAr: "الرياض" },
      { value: "jeddah", label: "Jeddah" },
    ]);
  });

  it("is closed until a site is added, cleans origins and tests an address", async () => {
    const host = await mount("form-builder");
    await tick(100);
    expect(data(host).closed()).toBe(true);
    data(host).form.allowedOrigins = ["https://Example.com/path", "nope", "https://example.com"];
    await tick(60);
    expect(data(host).form.allowedOrigins).toEqual(["https://example.com"]);
    data(host).probe = "https://example.com";
    expect(data(host).probeState()).toBe("allowed");
    data(host).probe = "https://other.com";
    expect(data(host).probeState()).toBe("blocked");
  });

  it("builds the embed snippet and public link for the form key", async () => {
    const host = await mount("form-builder");
    await tick(100);
    expect(data(host).publicLink()).toBe("https://forms.example.com/f/pk_live_123");
    expect(data(host).snippet()).toContain('<iframe src="https://forms.example.com/f/pk_live_123"');
    data(host).setStyle("script");
    expect(data(host).snippet()).toContain('<div data-nasaq-form="pk_live_123"></div>');
    expect(data(host).pressed("script")).toBe("true");
  });

  it("waits for the promise handed to nq-form-builder-save", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    const host = await mount("form-builder");
    await tick(100);
    let release!: () => void;
    const pending = new Promise<void>((r) => (release = r));
    const seen = vi.fn();
    root(host).addEventListener("nq-form-builder-save", (e) => {
      seen((e as CustomEvent).detail.form.name);
      (e as CustomEvent).detail.waitUntil(pending);
    });
    const saving = data(host).save();
    await tick(20);
    expect(data(host).saving).toBe(true);
    release();
    await saving;
    expect(data(host).saving).toBe(false);
    expect(seen).toHaveBeenCalledWith("Contact");
  });

  it("previews rules and validates without sending", async () => {
    const host = await mount("form-builder");
    await tick(100);
    data(host).previewSubmit();
    expect(Object.keys(data(host).errors)).toContain("name");
    expect(data(host).done).toBe(false);
    Object.assign(data(host).answers, { name: "Sam", email: "sam@example.com", topic: "sales", message: "Hello" });
    data(host).previewSubmit();
    expect(data(host).done).toBe(true);
  });
});
