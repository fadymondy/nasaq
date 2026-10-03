// The Blade mail-settings example (packages/php/examples/rendered/mail-settings.html) under real Alpine.
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
  host.innerHTML = rendered("mail-settings");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return {
    smtp: host.querySelector<HTMLElement>('[data-slot="smtp-settings"]')!,
    domains: host.querySelector<HTMLElement>('[data-slot="mail-domains"]')!,
  };
}

const button = (scope: ParentNode, text: string) => [...scope.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.trim() === text)!;
const type = async (input: HTMLInputElement, value: string) => {
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await tick();
};
const shown = (el: Element | null | undefined) => !!el && getComputedStyle(el as HTMLElement).display !== "none";
const panel = (root: HTMLElement, id: string) => root.querySelector<HTMLElement>(`[data-domain="${id}"]`)!;

describe("mail-settings (Blade example)", () => {
  it("saves the SMTP form through nq-smtp-save, without a password when none was typed", async () => {
    const { smtp } = await mount();
    let seen: Record<string, unknown> | undefined;
    smtp.addEventListener("nq-smtp-save", (e) => {
      const d = (e as CustomEvent).detail;
      seen = { host: d.host, port: d.port, encryption: d.encryption, password: d.password };
      d.resolve();
    });
    smtp.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await tick();
    expect(seen).toEqual({ host: "smtp.example.com", port: 587, encryption: "starttls", password: undefined });
  });

  it("does not save an invalid host and shows the error", async () => {
    const { smtp } = await mount();
    let fired = false;
    smtp.addEventListener("nq-smtp-save", () => (fired = true));
    const host = smtp.querySelector<HTMLInputElement>('input[autocomplete="off"]')!;
    await type(host, "");
    smtp.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await tick();
    expect(fired).toBe(false);
    expect(host.getAttribute("aria-invalid")).toBe("true");
  });

  it("sends a test and shows each step, with the failing message", async () => {
    const { smtp } = await mount();
    smtp.addEventListener("nq-smtp-test", (e) => {
      const d = (e as CustomEvent).detail;
      expect(d.to).toBe("you@example.com");
      d.resolve({ ok: false, steps: [{ id: "connect", ok: true }, { id: "tls", ok: false, message: "handshake failed" }] });
    });
    expect(shown(smtp.querySelector('[data-slot="smtp-test-result"]'))).toBe(false);
    button(smtp, "Send test").click();
    await tick(80);
    const result = smtp.querySelector<HTMLElement>('[data-slot="smtp-test-result"]')!;
    expect(shown(result)).toBe(true);
    expect(result.querySelectorAll("li")).toHaveLength(4);
    expect(result.querySelector('[data-slot="smtp-test-message"]')!.textContent).toBe("handshake failed");
    expect(result.textContent).toContain("Skipped");
  });

  it("renders the checklist and shows one domain at a time", async () => {
    const { domains } = await mount();
    const d1 = panel(domains, "d1");
    const d2 = panel(domains, "d2");
    expect([...d1.querySelectorAll('[data-slot="mail-dns-row"]')].map((r) => r.getAttribute("data-status"))).toEqual(["pass", "missing", "pass"]);
    expect(d1.textContent).toContain("info@example.com");
    expect(d1.textContent).toContain("sales@example.com");
    expect(shown(d1)).toBe(true);
    expect(shown(d2)).toBe(false);
    // The second domain warns about the open SPF record and the DMARC policy.
    expect(d2.textContent).toContain("(+all)");
    expect(d2.textContent).toContain("none");
  });

  it("rechecks the domain through nq-mail-recheck", async () => {
    const { domains } = await mount();
    let id = "";
    domains.addEventListener("nq-mail-recheck", (e) => {
      id = (e as CustomEvent).detail.domainId;
      (e as CustomEvent).detail.resolve();
    });
    button(panel(domains, "d1"), "Check again").click();
    await tick();
    expect(id).toBe("d1");
  });

  it("asks before removing a mailbox, then fires nq-mail-remove-mailbox", async () => {
    const { domains } = await mount();
    let seen: { domainId: string; id: string } | undefined;
    domains.addEventListener("nq-mail-remove-mailbox", (e) => {
      const d = (e as CustomEvent).detail;
      seen = { domainId: d.domainId, id: d.id };
      d.resolve();
    });
    const row = [...panel(domains, "d1").querySelectorAll<HTMLElement>('[data-slot="mail-mailboxes"] [role="row"]')].find((r) => r.textContent?.includes("support@example.com"));
    expect(row).toBeTruthy();
    row!.dispatchEvent(new CustomEvent("nq-data-table-action", { bubbles: true, detail: { action: "remove", row: { id: "m2", local: "support", address: "support@example.com" } } }));
    await tick(80);
    const dialog = document.body.querySelector('[data-slot="alert-dialog-content"]')!;
    expect(dialog.textContent).toContain("Remove support@example.com?");
    expect(seen).toBeUndefined();
    button(dialog as HTMLElement, "Remove").click();
    await tick(80);
    expect(seen).toEqual({ domainId: "d1", id: "m2" });
  });
});
