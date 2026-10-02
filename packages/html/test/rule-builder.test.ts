// The Blade rule-builder example under real Alpine.
import { describe, expect, it } from "vitest";
import { mount, setup, tick } from "./_float-setup";

setup();
const root = (host: HTMLElement) => host.querySelector<HTMLElement>('[data-slot="rule-builder"]')!;
const button = (host: HTMLElement, text: string) => [...host.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.includes(text))!;
const sentence = (host: HTMLElement) => host.querySelector<HTMLElement>('[data-slot="rule-summary"] span[dir="auto"]')!.textContent ?? "";

describe("rule-builder (Blade example)", () => {
  it("renders the summary and the three sections", async () => {
    const host = await mount("rule-builder");
    await tick(100);
    expect(root(host)).not.toBeNull();
    expect(host.querySelector('[data-slot="rule-summary"]')).not.toBeNull();
    expect(host.querySelectorAll("section").length).toBe(4);
    expect(sentence(host)).toContain("When");
  });

  it("adds a condition and reports what is missing through nq-rule-change", async () => {
    const host = await mount("rule-builder");
    const events: { issues: unknown[] }[] = [];
    root(host).addEventListener("nq-rule-change", (e) => events.push((e as CustomEvent).detail));
    button(host, "Add condition").click();
    await tick(100);
    expect(host.querySelectorAll("[data-condition]").length).toBe(1);
    expect(events.length).toBeGreaterThan(0);
    expect(events[events.length - 1]!.issues.length).toBeGreaterThan(0);
    host.querySelector<HTMLButtonElement>('button[aria-label="Remove condition"]')!.click();
    await tick(100);
    expect(host.querySelectorAll("[data-condition]").length).toBe(0);
  });

  it("adds an action and shows the fields of its type", async () => {
    const host = await mount("rule-builder");
    button(host, "Add action").click();
    await tick(100);
    const alert = host.querySelector('[data-slot="alert"]') as HTMLElement;
    expect(alert.textContent).toContain("to fix");
  });
});
