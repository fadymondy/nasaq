import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";
import { confidenceLevel, confidencePercent, groupAiActions, nextRevealLength, safePartialMarkdown, stepState, summaryToText } from "../src/alpine/ai-states-logic";
import { aiShortcutKeys } from "../src/alpine/ai-states-keys";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms));

beforeAll(() => {
  Alpine.plugin(nasaq);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).Alpine = Alpine;
  Alpine.start();
});

afterEach(() => {
  for (const el of [...document.body.children]) {
    Alpine.destroyTree(el as HTMLElement);
    el.remove();
  }
});

async function mount(name: string) {
  const host = document.createElement("div");
  host.innerHTML = rendered(name);
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data = (el: Element) => Alpine.$data(el as HTMLElement) as Record<string, any>;
// happy-dom keeps a stale copy of a bound attribute for getAttribute, so read the serialized opening tag.
const states = (el: Element) => [...el.querySelectorAll("li")].map((li) => /[ ]data-state="([^"]*)"/.exec(li.outerHTML.slice(0, li.outerHTML.indexOf(">")))?.[1]);
const q = <T extends HTMLElement = HTMLElement>(host: ParentNode, sel: string) => host.querySelector<T>(sel)!;
const listen = (el: Element, name: string) => {
  const seen: unknown[] = [];
  el.addEventListener(name, (e) => seen.push((e as CustomEvent).detail ?? true));
  return seen;
};

describe("ai-states logic", () => {
  it("buckets confidence and clamps", () => {
    expect(confidenceLevel(0.9)).toBe("high");
    expect(confidenceLevel(0.5)).toBe("medium");
    expect(confidenceLevel(Number.NaN)).toBe("low");
    expect(confidencePercent(1.4)).toBe(100);
  });

  it("states of steps, reveal length and shortcut keys", () => {
    expect([0, 1, 2].map((i) => stepState(i, 1))).toEqual(["done", "active", "pending"]);
    expect(nextRevealLength(0, 10, 0, "abcdefghij")).toBe(1);
    expect(aiShortcutKeys("Mod Shift S", false)).toEqual(["Ctrl", "Shift", "S"]);
    expect(aiShortcutKeys("Mod Shift S", true)).toEqual(["⌘", "⇧", "S"]);
  });

  it("closes fences and dangling syntax, groups actions, builds the summary text", () => {
    expect(safePartialMarkdown("```js\nlet a")).toBe("```js\nlet a\n```");
    expect(safePartialMarkdown("see [docs](https://exa")).toBe("see docs");
    const g = groupAiActions([
      { id: "a", label: "Alpha", recommended: true },
      { id: "b", label: "Beta" },
    ]);
    expect(g.recommended.map((a) => a.id)).toEqual(["a"]);
    expect(
      groupAiActions(
        [
          { id: "a", label: "Alpha" },
          { id: "b", label: "Beta" },
        ],
        "bet",
      ).others.map((a) => a.id),
    ).toEqual(["b"]);
    expect(summaryToText({ tldr: "T", points: ["x"], full: "F" }, { includeFull: true })).toBe("T\n\n- x\n\nF");
  });
});

describe("ai-states (rendered Blade under Alpine)", () => {
  it("split button fires nq-ai-run and nq-ai-action", async () => {
    const host = await mount("ai-states");
    const split = q(host, '[data-slot="ai-split-button"]');
    const runs = listen(split, "nq-ai-run");
    const actions = listen(split, "nq-ai-action");
    q(split, '[data-slot="ai-sparkle-button"]').click();
    expect(runs).toHaveLength(1);
    q(split, '[data-slot="dropdown-menu-trigger"]').click();
    await tick();
    const item = document.querySelector<HTMLElement>('[data-slot="dropdown-menu-item"][data-id="translate"]')!;
    item.click();
    await tick();
    expect(actions).toEqual([{ id: "translate" }]);
  });

  it("suggestion chips pick and dismiss", async () => {
    const host = await mount("ai-states");
    const chips = q(host, "#ai-chips");
    const picks = listen(chips, "nq-ai-pick");
    const dismissed = listen(chips, "nq-ai-dismiss");
    q(chips, "button").click();
    expect(picks).toEqual([{ id: "shorter" }]);
    q(chips, 'button[aria-label^="Dismiss"]').click();
    await tick();
    expect(dismissed).toEqual([{ id: "shorter" }]);
    expect(q(chips, "button").closest("span")!.style.display).toBe("none");
  });

  it("action menu opens by event and hotkey, filters, and runs the action", async () => {
    const host = await mount("ai-states");
    const root = q(host, '[data-slot="ai-action-menu-root"]');
    const actions = listen(root, "nq-ai-action");
    expect(data(root).open).toBe(false);
    window.dispatchEvent(new CustomEvent("nq-ai-menu-open"));
    await tick();
    expect(data(root).open).toBe(true);
    const ids = [...document.querySelectorAll('[data-slot="ai-action-item"]')].map((e) => e.getAttribute("data-id"));
    expect(ids).toEqual(["summarize", "translate", "fix"]);
    expect(document.querySelector('[role="group"][aria-label="Recommended"]')).not.toBeNull();
    const input = document.querySelector<HTMLInputElement>('[data-slot="ai-action-menu"] input[role="combobox"]')!;
    input.value = "spell";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await tick();
    expect([...document.querySelectorAll('[data-slot="ai-action-item"]')].map((e) => e.getAttribute("data-id"))).toEqual(["fix"]);
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await tick();
    expect(actions).toEqual([{ id: "fix" }]);
    expect(data(root).open).toBe(false);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "j", code: "KeyJ", ctrlKey: true }));
    await tick();
    expect(data(root).open).toBe(true);
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await tick();
    expect(data(root).open).toBe(false);
  });

  it("thinking: static steps keep their state, live steps rotate", async () => {
    const host = await mount("ai-states");
    const fixed = q(host, "#ai-thinking-static");
    expect(states(fixed)).toEqual(["done", "active", "pending"]);
    const live = q(host, "#ai-thinking-live");
    const first = states(live);
    expect(first.filter((s) => s === "active")).toHaveLength(1);
    await tick(150);
    const later = states(live);
    expect(later).not.toEqual(first);
  });

  it("streaming text: server render, then the live text follows the expression and says ready", async () => {
    const host = await mount("ai-states");
    expect(q(host, "#ai-text-static").getAttribute("aria-busy")).toBe("false");
    expect(q(host, "#ai-text-streaming").getAttribute("aria-busy")).toBe("true");
    const live = q(host, "#ai-text-live");
    const revealed = listen(live, "nq-ai-revealed");
    const root = q(host, "#ai-live");
    expect(q(live, '[data-slot="ai-plain"]').textContent).toBe("Hello");
    data(root).answer = "Hello world";
    await tick(120);
    expect(q(live, '[data-slot="ai-plain"]').textContent).toBe("Hello world");
    expect(live.getAttribute("aria-busy")).toBe("true");
    data(root).busy = false;
    await tick(60);
    expect(live.getAttribute("aria-busy")).not.toBe("true");
    expect(q(live, '[role="status"]').textContent).toBe("Response ready");
    expect(revealed.length).toBeGreaterThan(0);
  });

  it("stream controls follow the live state and fire events", async () => {
    const host = await mount("ai-states");
    const root = q(host, "#ai-live");
    const controls = q(host, "#ai-controls-live");
    const stops = listen(controls, "nq-ai-stop");
    const retries = listen(controls, "nq-ai-regenerate");
    expect(controls.getAttribute("data-state")).toBe("streaming");
    const [stop, again] = [...controls.querySelectorAll<HTMLElement>("button")];
    expect(stop!.style.display).not.toBe("none");
    expect(again!.style.display).toBe("none");
    stop!.click();
    expect(stops).toHaveLength(1);
    data(root).busy = false;
    await tick();
    expect(controls.getAttribute("data-state")).toBe("done");
    expect(stop!.style.display).toBe("none");
    expect(again!.style.display).not.toBe("none");
    again!.click();
    expect(retries).toHaveLength(1);
    const fixed = q(host, "#ai-controls-static");
    expect(fixed.getAttribute("data-state")).toBe("done");
    expect(fixed.querySelector("button")).not.toBeNull();
  });

  it("feedback presses a thumb, announces thanks and fires nq-ai-feedback", async () => {
    const host = await mount("ai-states");
    const fb = q(host, "#ai-feedback");
    const seen = listen(fb, "nq-ai-feedback");
    const [up, down] = [...fb.querySelectorAll<HTMLElement>("button")];
    expect([up!.getAttribute("aria-pressed"), down!.getAttribute("aria-pressed")]).toEqual(["false", "false"]);
    down!.click();
    await tick();
    expect(down!.getAttribute("aria-pressed")).toBe("true");
    expect(up!.getAttribute("aria-pressed")).toBe("false");
    expect(q(fb, '[role="status"]').textContent).toBe("Thanks for the feedback");
    expect(seen).toEqual([{ value: "down" }]);
  });

  it("summary copies the TL;DR and points, and the long version once opened", async () => {
    const host = await mount("ai-states");
    const summary = q(host, "#ai-summary");
    expect(data(summary).text()).toBe("Two tasks are overdue.\n\n- Send the invoice\n- Review the contract");
    q(summary, '[data-slot="collapsible-trigger"]').click();
    await tick();
    expect(data(summary).expanded).toBe(true);
    expect(data(summary).text()).toContain("The invoice is 3 days late.");
    const retries = listen(summary, "nq-ai-regenerate");
    q(summary, 'button[aria-label="Regenerate"]').click();
    expect(retries).toHaveLength(1);
    expect(q(host, "#ai-summary-loading").querySelector('[data-slot="ai-shimmer"]')).not.toBeNull();
  });
});
