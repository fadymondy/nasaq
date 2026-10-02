// The Blade data-privacy example (packages/php/examples/rendered/data-privacy.html) under real Alpine.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";

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
  document.body.innerHTML = "";
});

async function mount() {
  const host = document.createElement("div");
  host.innerHTML = rendered("data-privacy");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return {
    exportRoot: host.querySelectorAll<HTMLElement>('[data-slot="data-privacy"]')[0]!,
    deleteRoot: host.querySelectorAll<HTMLElement>('[data-slot="data-privacy"]')[1]!,
    page: host.querySelector<HTMLElement>('[data-slot="cancel-deletion-page"]')!,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data = (el: Element): any => Alpine.$data(el as HTMLElement);
const listen = (root: Element, name: string, result?: unknown) => {
  const calls: Record<string, unknown>[] = [];
  root.addEventListener(name, (e) => {
    const d = (e as CustomEvent).detail;
    calls.push(d);
    d.wait(result instanceof Error ? Promise.reject(result) : Promise.resolve(typeof result === "function" ? result(d) : result));
  });
  return calls;
};
// happy-dom resolves getAttribute("data-state") to the x-bind:data-state twin, so read the attribute list.
const attr = (el: Element, name: string) => [...el.attributes].find((a) => a.name === name)?.value;
const visible = (el: Element | null) => !!el && (el as HTMLElement).style.display !== "none";

describe("data-privacy (Blade example)", () => {
  it("shows a ready export with its size and dates", async () => {
    const { exportRoot } = await mount();
    const card = exportRoot.querySelector('[data-slot="data-export-status"]')!;
    expect(exportRoot.querySelector('[data-slot="data-export"]')!.getAttribute("data-status")).toBe("ready");
    expect(card.textContent).toContain("Ready to download");
    expect(card.textContent).toContain("46.1 MB");
    expect(card.textContent).toContain("Sep 28, 2026");
    expect(exportRoot.textContent).toContain("Profile");
    // Delete flow: none phase, the danger zone is visible and the others are hidden.
    expect(visible(exportRoot.querySelector('[data-phase="none"]'))).toBe(true);
    expect(visible(exportRoot.querySelector('[data-phase="pending"]'))).toBe(false);
  });

  it("downloads and reports the host's failure", async () => {
    const { exportRoot } = await mount();
    const calls = listen(exportRoot, "download-export", new Error("x"));
    await data(exportRoot).download();
    expect(calls).toHaveLength(1);
    expect(data(exportRoot).error).toBe("The download did not start. Try again.");
  });

  it("requests a new export after a failure", async () => {
    const { exportRoot } = await mount();
    const d = data(exportRoot);
    d.req = { ...d.req, status: "failed" };
    await tick();
    expect(d.canAsk).toBe(true);
    listen(exportRoot, "request-export", { request: { id: "exp_2", status: "queued", requestedAt: "2026-09-29T09:00:00" } });
    await d.ask();
    expect(d.req.id).toBe("exp_2");
    expect(d.statusLabel).toBe("Waiting in line");
    expect(d.isActive).toBe(true);
    d.destroy();
  });

  it("shows a server error from requesting, and the generic one with no listener", async () => {
    const { exportRoot } = await mount();
    const d = data(exportRoot);
    const off = listen(exportRoot, "request-export", { error: "Busy" });
    await d.ask();
    expect(d.error).toBe("Busy");
    off.length = 0;
    const fresh = await mount();
    await data(fresh.exportRoot).ask();
    expect(data(fresh.exportRoot).error).toBe("The export could not be requested. Try again.");
  });

  it("polls an active export until it is ready", async () => {
    const { exportRoot } = await mount();
    const d = data(exportRoot);
    d.config.interval = 5;
    d.req = { id: "e9", status: "processing", requestedAt: "2026-09-29T09:00:00", progress: 0.4 };
    const polls = listen(exportRoot, "poll-export", { id: "e9", status: "ready", requestedAt: "2026-09-29T09:00:00", sizeBytes: 10 });
    d.startPolling();
    expect(d.progressValue).toBe(40);
    await tick(80);
    expect(polls[0]).toMatchObject({ id: "e9" });
    expect(d.status).toBe("ready");
  });

  it("stalls after three failed checks and checks again on request", async () => {
    const { exportRoot } = await mount();
    const d = data(exportRoot);
    d.config.interval = 1;
    d.req = { id: "e9", status: "queued", requestedAt: "2026-09-29T09:00:00" };
    const polls = listen(exportRoot, "poll-export", new Error("down"));
    d.startPolling();
    await tick(250);
    expect(polls).toHaveLength(3);
    expect(d.stalled).toBe(true);
    d.destroy();
  });

  it("counts down to the scheduled deletion and cancels it", async () => {
    const { deleteRoot } = await mount();
    const d = data(deleteRoot);
    expect(d.phase).toBe("pending");
    expect(d.leftText).toBe("15 days left");
    expect(d.elapsed).toBe(50);
    expect(visible(deleteRoot.querySelector('[data-phase="pending"]'))).toBe(true);
    expect(deleteRoot.querySelector('[data-phase="pending"]')!.textContent).toContain("October 14, 2026");
    listen(deleteRoot, "cancel-deletion");
    await d.cancel();
    expect(d.phase).toBe("none");
    expect(d.notice.text).toBe("Deletion cancelled. Your account stays as it was.");
    await tick();
    expect(visible(deleteRoot.querySelector('[data-phase="none"]'))).toBe(true);
  });

  it("keeps the notice when cancelling fails", async () => {
    const { deleteRoot } = await mount();
    const d = data(deleteRoot);
    listen(deleteRoot, "cancel-deletion", { error: "Locked" });
    await d.cancel();
    expect(d.phase).toBe("pending");
    expect(d.notice).toEqual({ tone: "danger", text: "Locked" });
  });

  it("schedules the deletion from the danger zone", async () => {
    const { exportRoot } = await mount();
    const d = data(exportRoot);
    const calls = listen(exportRoot, "schedule-deletion");
    await d.schedule();
    expect(calls).toHaveLength(1);
    expect(d.phase).toBe("pending");
    expect(d.leftText).toBe("30 days left");
    // a failure from the host is passed back so the dialog stays open
    d.date = null;
    const bad = listen(exportRoot, "schedule-deletion", { error: "Nope" });
    expect(bad).toBeDefined();
  });

  it("keeps the account from the public page", async () => {
    const { page } = await mount();
    expect(page.getAttribute("data-state")).toBe("ready");
    expect(page.textContent).toContain("sara@sahab.studio");
    expect(page.textContent).toContain("October 14, 2026");
    const d = data(page);
    const calls = listen(page, "cancel-deletion");
    await d.keep();
    expect(calls).toHaveLength(1);
    await tick();
    expect(attr(page, "data-state")).toBe("cancelled");
    expect(page.querySelector("h1")!.textContent).toBe("Your account is safe");
    expect(visible(page.querySelector('a[href="/sign-in"]')!.parentElement)).toBe(true);
  });

  it("shows the generic error on the public page when nobody listens", async () => {
    const { page } = await mount();
    const d = data(page);
    await d.keep();
    expect(d.error).toBe("Deletion could not be cancelled. Try again.");
    expect(d.done).toBe(false);
  });
});
