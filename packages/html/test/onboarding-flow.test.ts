import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";
import { checklistSummary, initialProgress, markCompleted, markSkipped, parseInviteEmails, parseProgress } from "../src/alpine/onboarding-flow-logic";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms));

beforeAll(() => {
  Alpine.plugin(nasaq);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).Alpine = Alpine;
  Alpine.start();
});

beforeEach(() => window.localStorage.clear());

afterEach(() => {
  for (const el of [...document.body.children]) {
    Alpine.destroyTree(el as HTMLElement);
    el.remove();
  }
});

async function mount(html = rendered("onboarding-flow")) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.append(host);
  Alpine.initTree(host);
  await tick(60);
  return host;
}

const shown = (el: Element | null) => !!el && (el as HTMLElement).style.display !== "none";
const button = (host: HTMLElement, text: string) => [...host.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.includes(text) && shown(b))!;
const click = async (host: HTMLElement, text: string, wait = 160) => {
  button(host, text).click();
  await tick(wait);
};
const type = async (input: HTMLInputElement, value: string) => {
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await tick();
};
const root = (host: HTMLElement) => host.querySelector<HTMLElement>('[data-slot="onboarding-flow"]')!;
const step = (host: HTMLElement, id: string) => host.querySelector<HTMLElement>(`[data-step-id="${id}"]`)!;
const named = (host: HTMLElement) => host.querySelector<HTMLInputElement>('[data-slot="onboarding-profile"] input[autocomplete="name"]')!;
const org = (host: HTMLElement) => host.querySelector<HTMLInputElement>('[data-slot="onboarding-workspace"] input[autocomplete="organization"]')!;

describe("onboarding model (html copy)", () => {
  it("parses invites, tracks progress and summarises a checklist", () => {
    expect(parseInviteEmails("a@b.co, bad, a@b.co", []).invalid).toEqual(["bad"]);
    expect(checklistSummary([{ id: "x", done: true }, { id: "y" }]).percent).toBe(50);
    const p = markSkipped(markCompleted(initialProgress("welcome", {}), "welcome"), "welcome");
    expect(p.skipped).toEqual([]);
    expect(parseProgress("not json", ["welcome"])).toBeNull();
  });
});

describe("onboarding-flow (Blade example)", () => {
  it("starts on the welcome step inside the setup wizard", async () => {
    const host = await mount();
    expect(root(host).querySelector('[data-slot="setup-wizard"]')).not.toBeNull();
    expect(host.querySelector('[data-slot="onboarding-welcome"]')!.textContent).toContain("Welcome, Sara");
    expect(host.querySelectorAll('[data-slot="onboarding-welcome"] ul li')).toHaveLength(5);
    expect(host.textContent).toContain("Step 1 of 7");
    expect(shown(step(host, "welcome"))).toBe(true);
    expect(shown(step(host, "profile"))).toBe(false);
  });

  it("validates the profile name, then saves and moves on", async () => {
    const host = await mount();
    const saves: { stepId: string; values: { name: string } }[] = [];
    root(host).addEventListener("nq-onboarding-save", (e) => saves.push((e as CustomEvent).detail));
    await click(host, "Continue");
    expect(shown(step(host, "profile"))).toBe(true);
    expect(named(host).value).toBe("Sara");
    await type(named(host), "");
    await click(host, "Continue");
    expect(saves).toEqual([]);
    expect(shown(step(host, "profile"))).toBe(true);
    expect(host.querySelector('[data-slot="onboarding-profile"]')!.textContent).toContain("Enter your name.");
    expect(named(host).getAttribute("aria-invalid")).toBe("true");
    await type(named(host), "Sara Ali");
    await click(host, "Continue");
    expect(saves.at(-1)!.stepId).toBe("profile");
    expect(saves.at(-1)!.values.name).toBe("Sara Ali");
    expect(shown(step(host, "workspace"))).toBe(true);
  });

  it("stays on the step and shows the error a listener resolves", async () => {
    const host = await mount();
    root(host).addEventListener("nq-onboarding-save", (e) => (e as CustomEvent).detail.waitUntil(Promise.resolve({ error: "Server said no" })));
    await click(host, "Continue");
    await click(host, "Continue");
    expect(shown(step(host, "profile"))).toBe(true);
    expect(host.textContent).toContain("Server said no");
  });

  it("checks the invite code on the join tab", async () => {
    const host = await mount();
    await click(host, "Continue");
    await click(host, "Continue");
    const join = [...host.querySelectorAll<HTMLElement>('[role="tab"]')].find((b) => b.textContent?.includes("Join with a code"))!;
    join.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    join.click();
    await tick();
    await click(host, "Continue");
    expect(shown(step(host, "workspace"))).toBe(true);
    expect(host.querySelector('[data-slot="onboarding-workspace"]')!.textContent).toContain("Enter the invite code.");
  });

  it("skips optional steps, marks them skipped and shows the review", async () => {
    const host = await mount();
    const progress: { skipped: string[]; completed: string[] }[] = [];
    root(host).addEventListener("nq-onboarding-progress", (e) => progress.push((e as CustomEvent).detail));
    await click(host, "Continue");
    await click(host, "Continue");
    await type(org(host), "Acme");
    await click(host, "Continue");
    expect(shown(step(host, "invite"))).toBe(true);
    await click(host, "Skip for now");
    expect(shown(step(host, "preferences"))).toBe(true);
    await click(host, "Skip for now");
    await click(host, "Skip for now");
    expect(shown(step(host, "finish"))).toBe(true);
    const last = progress.at(-1)!;
    expect(last.skipped).toEqual(expect.arrayContaining(["invite", "preferences", "integration"]));
    expect(last.completed).toEqual(expect.arrayContaining(["welcome", "profile", "workspace"]));
    const review = host.querySelector('[data-slot="onboarding-finish"]')!.textContent!;
    expect(review).toContain("Skipped");
    expect(review).toContain("Done");
    expect(review).toContain("You can finish skipped steps");
  });

  it("finishes, sends the values and clears the saved progress", async () => {
    const host = await mount();
    let finished: { workspace: { name: string } } | null = null;
    root(host).addEventListener("nq-onboarding-finish", (e) => (finished = (e as CustomEvent).detail.values));
    await click(host, "Continue");
    await click(host, "Continue");
    await type(org(host), "Acme");
    await click(host, "Continue");
    for (let i = 0; i < 3; i++) await click(host, "Skip for now");
    expect(window.localStorage.getItem("onboarding:u1")).not.toBeNull();
    await click(host, "Finish setup", 300);
    expect(finished!.workspace.name).toBe("Acme");
    expect(host.textContent).toContain("You are ready");
    expect(host.querySelector('a[href="/"]')!.textContent).toContain("Open the dashboard");
    expect(window.localStorage.getItem("onboarding:u1")).toBeNull();
  });

  it("connects an integration and shows it connected", async () => {
    const host = await mount();
    const connected: string[] = [];
    root(host).addEventListener("nq-onboarding-connect", (e) => connected.push((e as CustomEvent).detail.integrationId));
    await click(host, "Continue");
    await click(host, "Continue");
    await type(org(host), "Acme");
    await click(host, "Continue");
    await click(host, "Skip for now");
    await click(host, "Skip for now");
    const gh = host.querySelector<HTMLButtonElement>('[aria-label="Connect GitHub"]')!;
    gh.click();
    await tick(160);
    expect(connected).toEqual(["github"]);
    expect(host.querySelector('[data-slot="onboarding-integration"]')!.textContent).toContain("Connected");
    expect(shown(gh.parentElement)).toBe(false);
  });

  it("saves progress to localStorage and resumes from it", async () => {
    const host = await mount();
    await click(host, "Continue");
    const saved = JSON.parse(window.localStorage.getItem("onboarding:u1")!);
    expect(saved.current).toBe("profile");
    expect(saved.completed).toContain("welcome");
    for (const el of [...document.body.children]) {
      Alpine.destroyTree(el as HTMLElement);
      el.remove();
    }
    const again = await mount();
    await tick(60);
    expect(shown(step(again, "profile"))).toBe(true);
    expect(again.querySelector('[data-slot="setup-wizard"]')!.getAttribute("data-step")).toBe("profile");
  });
});
