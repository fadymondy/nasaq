// The Blade server-admin example (packages/php/examples/rendered/server-admin.html) under real Alpine: four panels, one page.
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
});

async function mount() {
  const host = document.createElement("div");
  host.innerHTML = rendered("server-admin");
  document.body.append(host);
  Alpine.initTree(host);
  await tick(80);
  return host;
}

const panel = (host: HTMLElement, slot: string) => host.querySelector<HTMLElement>(`[data-slot="${slot}"]`)!;
const rowsOf = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>("[data-row]")];
const button = (scope: ParentNode, text: string) => [...scope.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.trim().includes(text))!;
/** What the table's row menu does: an action on a row. */
const act = (root: HTMLElement, action: string, id: string) =>
  root.querySelector("[data-slot='data-table']")!.dispatchEvent(new CustomEvent("nq-data-table-action", { bubbles: true, detail: { action, row: { id } } }));
const dialog = () => [...document.querySelectorAll<HTMLElement>('[data-slot="alert-dialog-content"]')].find((d) => d.querySelector('[data-slot="alert-dialog-title"]')?.textContent?.trim());

describe("server-admin (Blade example)", () => {
  it("renders the four panels", async () => {
    const host = await mount();
    expect(panel(host, "service-units").querySelector("h2")!.textContent).toBe("Services");
    expect(rowsOf(panel(host, "service-units"))).toHaveLength(3);
    expect(rowsOf(panel(host, "package-updates"))).toHaveLength(3);
    expect(rowsOf(panel(host, "ssh-key-manager"))).toHaveLength(2);
    expect(rowsOf(panel(host, "job-queue-monitor"))).toHaveLength(3);
  });

  it("shows service state and memory, and starts a stopped service after the host agrees", async () => {
    const host = await mount();
    const root = panel(host, "service-units");
    expect(rowsOf(root)[0]!.textContent).toContain("Running");
    expect(rowsOf(root)[0]!.textContent).toContain("46 MB");
    let seen: Record<string, unknown> | undefined;
    root.addEventListener("action", (e) => {
      const d = (e as CustomEvent).detail;
      seen = { id: d.id, action: d.action };
      d.wait(Promise.resolve());
    });
    act(root, "start", "redis");
    await tick(80);
    expect(seen).toEqual({ id: "redis", action: "start" });
    expect(rowsOf(root)[1]!.textContent).toContain("Running");
  });

  it("asks before stopping, and refuses an action that does not fit the state", async () => {
    const host = await mount();
    const root = panel(host, "service-units");
    let fired = 0;
    root.addEventListener("action", (e) => {
      fired++;
      (e as CustomEvent).detail.wait(Promise.resolve());
    });
    act(root, "stop", "nginx");
    await tick(80);
    expect(fired).toBe(0);
    expect(dialog()?.textContent).toContain("Stop nginx.service?");
    button(dialog()!, "Stop").click();
    await tick(80);
    expect(fired).toBe(1);
    expect(rowsOf(root)[0]!.textContent).toContain("Stopped");
    act(root, "stop", "nginx");
    await tick(80);
    expect(root.textContent).toContain("is not available while the status is Stopped");
  });

  it("shows a generic error when the host rejects", async () => {
    const host = await mount();
    const root = panel(host, "service-units");
    root.addEventListener("action", (e) => (e as CustomEvent).detail.wait(Promise.reject(new Error("x"))));
    act(root, "start", "redis");
    await tick(80);
    expect(root.textContent).toContain("Something went wrong. Try again.");
    expect(rowsOf(root)[1]!.textContent).toContain("Stopped");
  });

  it("summarises the updates and shows the restart banner", async () => {
    const host = await mount();
    const root = panel(host, "package-updates");
    expect(root.textContent).toContain("3 updates");
    expect(root.textContent).toContain("1 security");
    expect(root.textContent).toContain("A restart is needed");
    expect(root.textContent).toContain("Last checked: 2 hours ago");
  });

  it("updates one package from its row, and all of them after a confirm", async () => {
    const host = await mount();
    const root = panel(host, "package-updates");
    const names: string[][] = [];
    root.addEventListener("update", (e) => {
      const d = (e as CustomEvent).detail;
      names.push(d.names);
      d.wait(Promise.resolve());
    });
    act(root, "update", "curl");
    await tick(80);
    expect(names).toEqual([["curl"]]);
    expect(rowsOf(root)).toHaveLength(2);
    button(root, "Update all").click();
    await tick(80);
    expect(dialog()?.textContent).toContain("Update 2 packages?");
    button(dialog()!, "Update all").click();
    await tick(80);
    expect(names[1]).toEqual(["openssl", "linux-image-generic"]);
    expect(rowsOf(root)).toHaveLength(0);
    expect(root.textContent).toContain("Everything is up to date");
  });

  it("restarts the server after a confirm, and the banner goes", async () => {
    const host = await mount();
    const root = panel(host, "package-updates");
    let rebooted = false;
    root.addEventListener("reboot", (e) => {
      rebooted = true;
      (e as CustomEvent).detail.wait(Promise.resolve());
    });
    button(root, "Restart server").click();
    await tick(80);
    button(dialog()!, "Restart server").click();
    await tick(80);
    expect(rebooted).toBe(true);
    expect(root.textContent).not.toContain("A restart is needed");
  });

  it("shows one switch per server and fires install-change from it", async () => {
    const host = await mount();
    const root = panel(host, "ssh-key-manager");
    const row = rowsOf(root)[0]!;
    expect(row.textContent).toContain("Laptop");
    expect(row.textContent).toContain("1 of 2");
    const switches = [...row.querySelectorAll<HTMLElement>('[role="switch"]')];
    expect(switches.map((s) => s.getAttribute("aria-checked"))).toEqual(["true", "false"]);
    expect(switches[1]!.getAttribute("aria-label")).toBe("k1 on web-2");
    let seen: Record<string, unknown> | undefined;
    root.addEventListener("install-change", (e) => {
      const d = (e as CustomEvent).detail;
      seen = { keyId: d.keyId, serverId: d.serverId, installed: d.installed };
      d.wait(Promise.resolve());
    });
    switches[1]!.click();
    await tick(120);
    expect(seen).toEqual({ keyId: "k1", serverId: "web2", installed: true });
    expect(rowsOf(root)[0]!.textContent).toContain("2 of 2");
  });

  it("flags a private key at once and adds a valid public key", async () => {
    const host = await mount();
    const root = panel(host, "ssh-key-manager");
    button(root, "Add key").click();
    await tick(80);
    const form = document.querySelector<HTMLElement>('[data-slot="ssh-key-form"]')!;
    const name = form.querySelector<HTMLInputElement>('[data-slot="input"]')!;
    const area = form.querySelector<HTMLTextAreaElement>("textarea")!;
    const type = (el: HTMLInputElement | HTMLTextAreaElement, v: string) => {
      el.value = v;
      el.dispatchEvent(new Event("input", { bubbles: true }));
    };
    type(area, "-----BEGIN OPENSSH PRIVATE KEY-----\nabc\n-----END OPENSSH PRIVATE KEY-----");
    await tick(80);
    expect(form.textContent).toContain("That is a private key");

    let added: Record<string, unknown> | undefined;
    root.addEventListener("add", (e) => {
      const d = (e as CustomEvent).detail;
      added = d.input;
      d.wait(Promise.resolve({ key: { id: "k3", name: "Phone", type: "ssh-ed25519", fingerprint: "SHA256:x", addedAt: "Today", installedOn: [] } }));
    });
    type(name, "Phone");
    type(area, "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl phone@home");
    await tick(80);
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await tick(120);
    expect(added).toMatchObject({ name: "Phone", type: "ed25519", comment: "phone@home" });
    expect(rowsOf(root)).toHaveLength(3);
  });

  it("counts jobs by status, and filters the table from a count button", async () => {
    const host = await mount();
    const root = panel(host, "job-queue-monitor");
    const group = root.querySelector('[role="group"]')!;
    const counts = [...group.querySelectorAll<HTMLButtonElement>("button")];
    expect(counts.map((b) => b.querySelector("span:last-child")!.textContent)).toEqual(["1", "1", "0", "0", "1"]);
    counts[4]!.click();
    await tick(80);
    expect(counts[4]!.getAttribute("aria-pressed")).toBe("true");
    expect(rowsOf(root)).toHaveLength(1);
    expect(rowsOf(root)[0]!.textContent).toContain("SendInvoice");
  });

  it("retries a failed job and forgets it after a confirm", async () => {
    const host = await mount();
    const root = panel(host, "job-queue-monitor");
    const seen: string[] = [];
    root.addEventListener("retry", (e) => {
      const d = (e as CustomEvent).detail;
      seen.push(`retry ${d.ids}`);
      d.wait(Promise.resolve());
    });
    root.addEventListener("forget", (e) => {
      const d = (e as CustomEvent).detail;
      seen.push(`forget ${d.ids}`);
      d.wait(Promise.resolve());
    });
    act(root, "retry", "j1");
    await tick(80);
    expect(seen).toEqual(["retry j1"]);
    expect(rowsOf(root)[0]!.textContent).toContain("Waiting");
    act(root, "forget", "j1");
    await tick(80);
    expect(seen).toEqual(["retry j1"]);
    expect(dialog()?.textContent).toContain("Forget this job?");
    button(dialog()!, "Forget").click();
    await tick(80);
    expect(seen).toEqual(["retry j1", "forget j1"]);
    expect(rowsOf(root)).toHaveLength(2);
  });

  it("opens the job details with its error", async () => {
    const host = await mount();
    const root = panel(host, "job-queue-monitor");
    act(root, "details", "j1");
    await tick(80);
    expect(document.body.textContent).toContain("SMTP timeout");
    expect(document.body.textContent).toContain('{"invoice":42}');
  });
});
