import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";
import { chatWidgetErrorOf, chatWidgetFill, chatWidgetOfflineErrors, chatWidgetSplitFiles } from "../src/alpine/chat-widget-logic";

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

const root = (host: HTMLElement) => host.querySelector<HTMLElement>('[data-slot="chat-widget"]')!;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data = (el: HTMLElement) => Alpine.$data(el) as Record<string, any>;
const shown = (el: Element | null) => !!el && (el as HTMLElement).style.display !== "none";
const launcherOf = (host: HTMLElement) => host.querySelector<HTMLButtonElement>("button[aria-expanded]")!;

describe("chat-widget logic", () => {
  it("validates the offline form", () => {
    const words = { formRequired: "Required", formInvalidEmail: "Bad" };
    expect(chatWidgetOfflineErrors({ name: "", email: "x", message: " " }, words)).toEqual({ name: "Required", email: "Bad", message: "Required" });
    expect(chatWidgetOfflineErrors({ name: "a", email: "a@b.co", message: "m" }, words)).toEqual({ name: "", email: "", message: "" });
  });

  it("fills placeholders, splits files and reads errors", () => {
    expect(chatWidgetFill("{name} > {mb} MB", { name: "a.png", mb: "5" })).toBe("a.png > 5 MB");
    const big = { name: "big", size: 6 * 1024 * 1024 } as File;
    const small = { name: "small", size: 10 } as File;
    expect(chatWidgetSplitFiles([big, small], 5)).toEqual({ ok: [small], tooBig: [big] });
    expect(chatWidgetErrorOf([undefined, { error: "No" }])).toBe("No");
    expect(chatWidgetErrorOf([undefined])).toBe("");
  });
});

describe("chat-widget (Blade example)", () => {
  it("opens, labels the launcher and closes on Escape with focus back", async () => {
    const host = await mount("chat-widget");
    const el = root(host);
    expect(el.hasAttribute("data-open")).toBe(true);
    const launcher = launcherOf(host);
    expect(launcher.getAttribute("aria-label")).toBe("Close chat");
    expect(launcher.getAttribute("aria-expanded")).toBe("true");
    const dialog = host.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(shown(dialog)).toBe(true);
    dialog.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await tick();
    expect(el.hasAttribute("data-open")).toBe(false);
    expect(shown(dialog)).toBe(false);
    expect(launcher.getAttribute("aria-label")).toBe("Open chat");
    expect(document.activeElement).toBe(launcher);
    launcher.click();
    await tick();
    expect(data(el).open).toBe(true);
  });

  it("sends a quick question, shows it at once and hides the starters", async () => {
    const host = await mount("chat-widget");
    let got: { text: string; files: File[] } | null = null;
    root(host).addEventListener("nq-send", (e) => {
      const d = (e as CustomEvent).detail;
      got = { text: d.text, files: d.files };
    });
    host.querySelector<HTMLButtonElement>('[role="group"] button')!.click();
    await tick();
    expect(got).toEqual({ text: "Pricing", files: [] });
    const mine = host.querySelector('[data-slot="chat-message"][data-side="user"]')!;
    expect(mine.textContent).toContain("Pricing");
    expect(mine.getAttribute("data-status")).toBe("sent");
    expect(shown(host.querySelector('[role="group"]'))).toBe(false);
  });

  it("takes the message back and shows the error when the host refuses it", async () => {
    const host = await mount("chat-widget");
    const el = root(host);
    el.addEventListener("nq-send", (e) => (e as CustomEvent).detail.waitUntil(Promise.resolve({ error: "Offline" })));
    const field = host.querySelector<HTMLTextAreaElement>("textarea")!;
    field.value = "hello";
    field.dispatchEvent(new Event("input", { bubbles: true }));
    await tick();
    field.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await tick(60);
    expect(host.querySelector('[data-slot="chat-message"][data-side="user"]')).toBeNull();
    expect(data(el).error).toBe("Offline");
    expect(field.value).toBe("hello");
  });
});

describe("chat-widget offline (Blade example)", () => {
  it("shows the unread badge only while closed and the offline form instead of the composer", async () => {
    const host = await mount("chat-widget-offline");
    expect(host.querySelector('[data-slot="chat-composer"]')).toBeNull();
    expect(root(host).hasAttribute("data-online")).toBe(false);
    expect(host.textContent).toContain("We are not around right now");
    expect(host.textContent).toContain("We are back at 9:00.");
    const badge = launcherOf(host).querySelector<HTMLElement>(".sr-only")!.parentElement!;
    expect(badge.textContent).toContain("2 unread");
    expect(shown(badge)).toBe(false);
  });

  it("validates, submits and thanks the visitor", async () => {
    const host = await mount("chat-widget-offline");
    const form = host.querySelector<HTMLFormElement>('[data-slot="chat-widget-offline"]')!;
    let sent: unknown = null;
    root(host).addEventListener("nq-offline-submit", (e) => {
      const d = (e as CustomEvent).detail;
      sent = { name: d.name, email: d.email, message: d.message };
    });
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await tick();
    expect(data(root(host)).nameBad).toBe(true);
    expect(sent).toBeNull();
    const [name, email] = [...form.querySelectorAll<HTMLInputElement>("input")];
    const message = form.querySelector<HTMLTextAreaElement>("textarea")!;
    const type = (el: HTMLInputElement | HTMLTextAreaElement, value: string) => {
      el.value = value;
      el.dispatchEvent(new Event("input", { bubbles: true }));
    };
    type(name!, "Sam");
    type(email!, "nope");
    type(message, "Help");
    await tick();
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await tick();
    expect(data(root(host)).emailBad).toBe(true);
    expect(form.textContent).toContain("Enter a valid email address");
    type(email!, "sam@example.com");
    await tick();
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await tick(60);
    expect(sent).toEqual({ name: "Sam", email: "sam@example.com", message: "Help" });
    expect(shown(host.querySelector('[data-slot="chat-widget-sent"]'))).toBe(true);
    expect(shown(form)).toBe(false);
  });
});
