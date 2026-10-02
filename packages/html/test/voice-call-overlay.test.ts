import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import nasaq from "../src/alpine";
import { barClass, barHeights, formatCallTime, pushLevel } from "../src/alpine/voice-call-overlay-logic";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = (ms = 40) => new Promise((r) => setTimeout(r, ms));

beforeAll(() => {
  Alpine.plugin(nasaq);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).Alpine = Alpine;
  Alpine.start();
});

afterEach(() => {
  vi.unstubAllGlobals();
  for (const el of [...document.body.children]) {
    Alpine.destroyTree(el as HTMLElement);
    el.remove();
  }
});

async function mount() {
  const host = document.createElement("div");
  host.innerHTML = rendered("voice-call-overlay");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data = (el: Element) => Alpine.$data(el as HTMLElement) as Record<string, any>;
const byId = (host: ParentNode, id: string) => host.querySelector<HTMLElement>(`#${id}`)!;
// happy-dom keeps stale copies of bound attributes, so read the serialized opening tag.
const tag = (el: Element) => el.outerHTML.slice(0, el.outerHTML.indexOf(">") + 1);
const reducedMotion = () => vi.stubGlobal("matchMedia", (query: string) => ({ matches: query.includes("reduce"), media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));

describe("voice-call-overlay logic", () => {
  it("shapes bars, keeps a fixed history and formats the timer", () => {
    expect(pushLevel([1], 0.5, 3)).toEqual([0, 1, 0.5]);
    expect(barHeights([0, 1], 5).length).toBe(5);
    expect(formatCallTime(3725)).toBe("1:02:05");
    expect(barClass("speaking", false)).toContain("bg-nq-accent");
    expect(barClass("thinking", false, true)).not.toContain("animate-pulse");
  });
});

describe("voice-call-overlay (rendered Blade under Alpine)", () => {
  it("renders the dialog with the timer and captions, and the root state attribute is bound", async () => {
    const host = await mount();
    const call = byId(host, "vc-call");
    expect(call.getAttribute("role")).toBe("dialog");
    expect(call.hasAttribute("aria-modal")).toBe(false);
    expect(tag(call)).toContain('data-state="listening"');
    expect(call.querySelector("bdi")!.textContent).toBe("1:05");
    expect(call.querySelector("[data-captions]")!.textContent).toContain("Where is my order?");
  });

  it("follows state, level, elapsed and captions from the outer scope", async () => {
    const host = await mount();
    const outer = data(byId(host, "vc-live"));
    const call = byId(host, "vc-call");
    outer.callState = "speaking";
    outer.callElapsed = 3725;
    outer.callLevel = 1;
    outer.callCaptions = [{ id: "3", role: "agent", text: "Arriving now." }];
    await tick();
    expect(tag(call)).toContain('data-state="speaking"');
    expect(call.querySelector("bdi")!.textContent).toBe("1:02:05");
    expect(call.querySelector("[data-captions]")!.textContent).toContain("Arriving now.");
    expect(call.querySelector("[data-captions]")!.textContent).not.toContain("Where is my order?");
    const meter = call.querySelector<HTMLElement>("[role=meter]")!;
    expect(tag(meter)).toContain('data-state="speaking"');
    expect(tag(meter)).toContain('aria-valuenow="100"');
  });

  it("toggles mute, writes it back through x-model and dispatches the event", async () => {
    const host = await mount();
    const outer = data(byId(host, "vc-live"));
    const call = byId(host, "vc-call");
    const seen: boolean[] = [];
    call.addEventListener("nq-voice-mute", (e) => seen.push((e as CustomEvent).detail.muted));
    data(call).toggleMute();
    await tick();
    expect(seen).toEqual([true]);
    expect(outer.callMuted).toBe(true);
    expect(data(call).statusText()).toContain("Muted");
    expect(data(call).muteLabel()).toBe("Unmute microphone");
    const meter = call.querySelector<HTMLElement>("[role=meter]")!;
    expect(tag(meter)).toContain('aria-valuenow="0"');
  });

  it("hides and shows captions and says so", async () => {
    const host = await mount();
    const call = byId(host, "vc-call");
    const seen: boolean[] = [];
    call.addEventListener("nq-voice-captions", (e) => seen.push((e as CustomEvent).detail.show));
    data(call).toggleCaptions();
    await tick();
    expect(seen).toEqual([false]);
    expect(call.querySelector<HTMLElement>("[data-captions]")!.style.display).toBe("none");
    expect(data(call).captionsLabel()).toBe("Show captions");
  });

  it("stays busy until the end handler settles", async () => {
    const host = await mount();
    const call = byId(host, "vc-call");
    let done!: () => void;
    call.addEventListener("nq-voice-end", (e) => (e as CustomEvent).detail.wait(new Promise<void>((r) => (done = r))));
    const pending = data(call).end();
    await tick();
    expect(data(call).ending).toBe(true);
    expect(data(call).endLabel()).toBe("Ending call");
    expect(tag(call.querySelector("[aria-busy]")!)).toContain('aria-busy="true"');
    done();
    await pending;
    expect(data(call).ending).toBe(false);
  });

  it("shows the retry and interrupt buttons only in their state", async () => {
    const host = await mount();
    const outer = data(byId(host, "vc-live"));
    const call = byId(host, "vc-call");
    const buttons = () => [...call.querySelectorAll<HTMLElement>("[role=status] button")];
    const [retry, interrupt] = buttons();
    expect(retry!.style.display).toBe("none");
    outer.callState = "error";
    await tick();
    expect(retry!.style.display).not.toBe("none");
    const seen: string[] = [];
    call.addEventListener("nq-voice-retry", () => seen.push("retry"));
    call.addEventListener("nq-voice-interrupt", () => seen.push("interrupt"));
    retry!.click();
    outer.callState = "speaking";
    await tick();
    expect(interrupt!.style.display).not.toBe("none");
    interrupt!.click();
    expect(seen).toEqual(["retry", "interrupt"]);
  });

  it("the visualizer paints bars from its level and takes state from expressions", async () => {
    const host = await mount();
    const viz = byId(host, "vc-viz-live");
    expect(tag(viz)).toContain('data-state="speaking"');
    const bars = viz.querySelectorAll<HTMLElement>(":scope > span");
    expect(bars.length).toBe(31);
    expect(bars[15]!.className).toContain("bg-nq-accent");
    expect(parseFloat(bars[15]!.style.height)).toBeGreaterThan(50);
  });

  it("the visualizer drops transitions under reduced motion", async () => {
    reducedMotion();
    const host = await mount();
    const bar = byId(host, "vc-viz").querySelector<HTMLElement>(":scope > span")!;
    expect(bar.className).not.toContain("transition-");
  });
});
