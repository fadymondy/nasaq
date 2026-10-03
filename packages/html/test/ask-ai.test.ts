// The Blade ask-ai example (packages/php/examples/rendered/ask-ai.html) under real Alpine, plus the pure helpers.
import Alpine from "alpinejs";
import { describe, expect, it } from "vitest";
import { hotkeyMatches, isIgnoredTarget, normalizeSelection, placePopup, readOutcome, shortenMiddle } from "../src/alpine/ask-ai-logic";
import { mount, setup, tick } from "./_float-setup";

setup();

describe("ask-ai logic", () => {
  it("normalizes and cuts selections", () => {
    expect(normalizeSelection("  hello   world ")).toEqual({ text: "hello world", truncated: false });
    expect(normalizeSelection("ab").text).toBe("");
    expect(normalizeSelection("abcdefgh", 3, 5)).toEqual({ text: "abcde", truncated: true });
  });
  it("shortens in the middle, reads outcomes, matches hotkeys", () => {
    expect(shortenMiddle("a".repeat(300), 20).length).toBeLessThanOrEqual(21);
    expect(readOutcome("hi")).toEqual({ text: "hi" });
    expect(readOutcome({ error: "no" })).toEqual({ error: "no" });
    expect(hotkeyMatches("mod shift space", { ctrlKey: true, metaKey: false, shiftKey: true, code: "Space", key: " " })).toBe(true);
    expect(hotkeyMatches("mod shift space", { ctrlKey: false, metaKey: false, shiftKey: true, code: "Space", key: " " })).toBe(false);
    const el = document.createElement("div");
    el.innerHTML = '<textarea></textarea><p data-ask-ai-ignore><b>x</b></p>';
    expect(isIgnoredTarget(el.querySelector("textarea"))).toBe(true);
    expect(isIgnoredTarget(el.querySelector("b"))).toBe(true);
    expect(isIgnoredTarget(el)).toBe(false);
  });
  it("places and flips a popup inside the viewport", () => {
    const anchor = { top: 100, bottom: 120, left: 200, right: 300, width: 100, height: 20 };
    const view = { width: 800, height: 600 };
    expect(placePopup(anchor, { width: 60, height: 30 }, view, "top").side).toBe("top");
    expect(placePopup({ ...anchor, top: 10, bottom: 30 }, { width: 60, height: 30 }, view, "top").side).toBe("bottom");
    expect(placePopup({ ...anchor, left: 0, right: 10, width: 10 }, { width: 60, height: 30 }, view, "top").left).toBe(8);
  });
});

describe("ask-ai example", () => {
  it("asks, answers and offers a replace", async () => {
    const host = await mount("ask-ai");
    const root = host.querySelector<HTMLElement>('[data-slot="ask-ai-selection"]')!;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d = Alpine.$data(root) as any;
    d.selection = "returns window";
    d.shown = true;
    await tick();
    const popup = document.body.querySelector<HTMLElement>('[data-slot="ask-ai-popup"]')!;
    expect(popup).toBeTruthy();
    d.openPanel();
    await tick();
    expect(d.phase).toBe("panel");
    const replaced: unknown[] = [];
    root.addEventListener("ask-ai-replace", (e) => replaced.push((e as CustomEvent).detail));
    void d.ask("Explain", "explain");
    await tick();
    expect(d.status).toBe("loading");
    await tick(700);
    expect(d.status).toBe("done");
    expect(d.answerText).toContain("returns window starts");
    d.replace();
    expect(replaced).toHaveLength(1);
    d.another();
    expect(d.status).toBe("idle");
    d.close();
    expect(d.shown).toBe(false);
  });
  it("fires the insight card events and dismisses it", async () => {
    const host = await mount("ask-ai");
    const card = host.querySelector<HTMLElement>('[data-slot="ai-insight-card"]')!;
    const events: string[] = [];
    card.addEventListener("nq-insight-ask", () => events.push("ask"));
    card.addEventListener("nq-insight-dismiss", () => events.push("dismiss"));
    const btns = [...card.querySelectorAll<HTMLButtonElement>("button")];
    btns.find((b) => b.textContent?.includes("Ask AI about this"))!.click();
    btns.find((b) => b.getAttribute("aria-label") === "Dismiss insight")!.click();
    await tick();
    expect(events).toEqual(["ask", "dismiss"]);
    expect(card.style.display).toBe("none");
  });
});
