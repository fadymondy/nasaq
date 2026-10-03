import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";
import { finishAnswer, reduceStream, retryPoint, startAnswer, visibleText, type CopilotMessage } from "../src/alpine/copilot-provider-logic";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = (ms = 40) => new Promise((r) => setTimeout(r, ms));

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

async function mount() {
  const host = document.createElement("div");
  host.innerHTML = rendered("copilot-provider");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data = (el: Element) => Alpine.$data(el as HTMLElement) as Record<string, any>;
const byId = (host: ParentNode, id: string) => host.querySelector<HTMLElement>(`#${id}`)!;
const tag = (el: Element) => el.outerHTML.slice(0, el.outerHTML.indexOf(">") + 1);

describe("copilot-provider logic", () => {
  it("streams text, merges steps, hides an open artifact fence and finishes", () => {
    let s = startAnswer("a1", 0);
    s = reduceStream(s, { type: "delta", text: "Hello " });
    s = reduceStream(s, { type: "delta", text: "world ```artifact\n{\"ty" });
    expect(s.message.text).toBe("Hello world");
    s = reduceStream(s, { type: "step", step: { id: "t", status: "running" } });
    s = reduceStream(s, { type: "step", step: { id: "t", label: "Search" } });
    expect(s.message.steps).toEqual([{ id: "t", status: "running", label: "Search" }]);
    s = reduceStream(s, { type: "artifact", artifact: { nope: 1 } });
    expect(s.artifacts).toEqual([]);
    s = finishAnswer(s);
    expect(s.message.streaming).toBe(false);
    expect(s.message.steps![0]!.status).toBe("done");
    expect(visibleText("a ```a2ui")).toBe("a");
  });

  it("keeps an error and finds the retry point", () => {
    const s = reduceStream(startAnswer("a"), { type: "error", message: "boom" });
    expect(s.message).toMatchObject({ streaming: false, error: "boom" });
    const msgs: CopilotMessage[] = [
      { id: "u1", role: "user", text: "one" },
      { id: "a1", role: "assistant", text: "x" },
      { id: "u2", role: "user", text: "two" },
      { id: "a2", role: "assistant", text: "y" },
    ];
    expect(retryPoint(msgs, "a2")!.user.id).toBe("u2");
    expect(retryPoint(msgs, "a2")!.history.length).toBe(2);
    expect(retryPoint([], undefined)).toBeNull();
  });
});

describe("copilot-provider (rendered Blade under Alpine)", () => {
  it("starts closed with the greeting, and the launchers toggle it", async () => {
    const host = await mount();
    const root = byId(host, "cp-root");
    expect(data(root).isOpen).toBe(false);
    expect(data(root).messages[0].text).toBe("Hi! Ask me anything.");
    expect(byId(host, "cp-log").querySelectorAll("li").length).toBe(1);
    const seen: boolean[] = [];
    root.addEventListener("nq-copilot-change", (e) => seen.push((e as CustomEvent).detail.open));
    byId(host, "cp-launcher").click();
    await tick();
    expect(data(root).isOpen).toBe(true);
    expect(tag(byId(host, "cp-launcher"))).toContain('aria-expanded="true"');
    expect(tag(byId(host, "cp-icon"))).toContain('aria-label="Close assistant"');
    expect(byId(host, "cp-status").textContent).toBe("Open");
    byId(host, "cp-icon").click();
    await tick();
    expect(seen).toEqual([true, false]);
  });

  it("opens from a window event and sends: the handler streams back with push", async () => {
    const host = await mount();
    const root = byId(host, "cp-root");
    const sent: { text: string }[] = [];
    root.addEventListener("nq-copilot-send", (e) => {
      const d = (e as CustomEvent).detail;
      sent.push(d);
      d.push({ type: "delta", text: "Out for " });
      d.push({ type: "delta", text: "delivery." });
    });
    window.dispatchEvent(new CustomEvent("nq-copilot-open", { detail: { message: "Where is it?", autoSend: true } }));
    await tick();
    expect(data(root).isOpen).toBe(true);
    expect(sent[0]!.text).toBe("Where is it?");
    expect(data(root).streaming).toBe(true);
    expect(byId(host, "cp-status").textContent).toBe("Answering");
    const items = [...byId(host, "cp-log").querySelectorAll("li")].map((li) => li.textContent);
    expect(items).toEqual(["Hi! Ask me anything.", "Where is it?", "Out for delivery."]);
    data(root).push({ type: "done" });
    await tick();
    expect(data(root).streaming).toBe(false);
  });

  it("puts the message in the draft without autoSend, and stop ends the stream", async () => {
    const host = await mount();
    const root = byId(host, "cp-root");
    window.dispatchEvent(new CustomEvent("nq-copilot-open", { detail: { message: "Draft me" } }));
    await tick();
    expect(data(root).draft).toBe("Draft me");
    let stopped = 0;
    let signal: AbortSignal | undefined;
    root.addEventListener("nq-copilot-send", (e) => (signal = (e as CustomEvent).detail.signal));
    root.addEventListener("nq-copilot-stop", () => stopped++);
    data(root).send("Hi");
    expect(data(root).streaming).toBe(true);
    data(root).stop();
    expect(signal!.aborted).toBe(true);
    expect(stopped).toBe(1);
    expect(data(root).streaming).toBe(false);
    expect(data(root).messages.at(-1).streaming).toBe(false);
  });

  it("toggles feedback and starts a new chat", async () => {
    const host = await mount();
    const root = byId(host, "cp-root");
    const id = data(root).messages[0].id;
    const seen: string[] = [];
    root.addEventListener("nq-copilot-feedback", (e) => seen.push((e as CustomEvent).detail.value));
    data(root).feedback(id, "up");
    expect(data(root).messages[0].feedback).toBe("up");
    data(root).feedback(id, "up");
    expect(data(root).messages[0].feedback).toBeNull();
    expect(seen).toEqual(["up"]);
    data(root).send("one");
    data(root).newChat();
    expect(data(root).messages.length).toBe(1);
  });
});
