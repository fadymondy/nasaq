// The Blade vault example (packages/php/examples/rendered/vault.html) under real Alpine.
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
  host.innerHTML = rendered("vault");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host.querySelector<HTMLElement>('[data-slot="vault"]')!;
}

const slot = (name: string) => document.querySelector<HTMLElement>(`[data-slot="${name}"]`);
const byLabel = (root: HTMLElement, label: string) => [...root.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.getAttribute("aria-label") === label)!;
const type = (el: HTMLInputElement | HTMLTextAreaElement, value: string) => {
  el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
};
const visible = (el: HTMLElement) => el.style.display !== "none";

describe("vault (Blade example)", () => {
  it("renders grouped secrets, masked, with kind and expiry badges and no value", async () => {
    const root = await mount();
    expect(root.getAttribute("aria-label")).toBe("Vault");
    expect([...root.querySelectorAll("h4")].map((h) => h.textContent!.replace(/\s+/g, " ").trim())).toEqual(["Backend 2 secrets", "Payments 1 secret"]);
    const rows = [...root.querySelectorAll<HTMLElement>('[data-slot="vault-secret"]')];
    expect(rows).toHaveLength(3);
    expect(rows[0]!.textContent).toContain("Expires in 6 days");
    expect(rows[1]!.textContent).toContain("Expired");
    expect(rows[0]!.hasAttribute("data-revealed")).toBe(false);
    const mask = [...rows[0]!.querySelectorAll<HTMLElement>('[data-slot="vault-value"]')].find((v) => v.getAttribute("role") === "text")!;
    expect(mask.textContent).toContain("••••••••••••");
    // The filter only appears above five secrets.
    expect(root.querySelector('[aria-label="Filter secrets"]')).toBeNull();
    // Row actions: reveal, copy, edit, delete.
    expect(rows[0]!.querySelectorAll("button")).toHaveLength(4);
  });

  it("reveals through the reveal event, counts down and hides again", async () => {
    const root = await mount();
    const seen: unknown[] = [];
    root.addEventListener("reveal", (e) => {
      const d = (e as CustomEvent).detail;
      seen.push([d.id, d.purpose]);
      d.wait(Promise.resolve({ value: `value-of-${d.id}` }));
    });
    const btn = byLabel(root, "Reveal STRIPE_SECRET_KEY");
    btn.click();
    await tick(80);
    expect(seen).toEqual([["s1", "reveal"]]);
    const row = root.querySelector<HTMLElement>('[data-slot="vault-secret"][data-revealed]')!;
    expect(row).toBeTruthy();
    expect(row.textContent).toContain("value-of-s1");
    expect(row.textContent).toContain("Hides again in 15 seconds");
    expect(byLabel(root, "Hide STRIPE_SECRET_KEY").getAttribute("aria-pressed")).toBe("true");
    byLabel(root, "Hide STRIPE_SECRET_KEY").click();
    await tick();
    expect(root.querySelector('[data-slot="vault-secret"][data-revealed]')).toBeNull();
    expect(byLabel(root, "Reveal STRIPE_SECRET_KEY").getAttribute("aria-pressed")).toBe("false");
  });

  it("shows an error from the reveal event", async () => {
    const root = await mount();
    root.addEventListener("reveal", (e) => (e as CustomEvent).detail.wait(Promise.resolve({ error: "Not allowed" })));
    byLabel(root, "Reveal DATABASE_URL").click();
    await tick(80);
    const alert = [...root.querySelectorAll<HTMLElement>('[role="alert"]')].find((a) => a.textContent!.includes("Not allowed"));
    expect(alert).toBeTruthy();
    expect(root.querySelector("[data-revealed]")).toBeNull();
  });

  it("copies with purpose copy and shows a check", async () => {
    const written: string[] = [];
    Object.defineProperty(navigator, "clipboard", { value: { writeText: async (s: string) => void written.push(s) }, configurable: true });
    const root = await mount();
    const purposes: string[] = [];
    root.addEventListener("reveal", (e) => {
      const d = (e as CustomEvent).detail;
      purposes.push(d.purpose);
      d.wait(Promise.resolve({ value: "sk_live_demo" }));
    });
    byLabel(root, "Copy STRIPE_SECRET_KEY").click();
    await tick(80);
    expect(purposes).toEqual(["copy"]);
    expect(written).toEqual(["sk_live_demo"]);
    expect(byLabel(root, "Copy STRIPE_SECRET_KEY").hasAttribute("data-copied")).toBe(true);
    expect(root.querySelector('[role="status"]')!.textContent).toBe("Copied to clipboard");
  });

  it("validates the add form, then fires save with the input", async () => {
    const root = await mount();
    let detail: { input: unknown; id: unknown } | undefined;
    root.addEventListener("save", (e) => {
      const d = (e as CustomEvent).detail;
      detail = { input: d.input, id: d.id };
      d.wait(Promise.resolve());
    });
    [...root.querySelectorAll<HTMLButtonElement>(":scope > header button")].find((b) => b.textContent!.includes("Add secret"))!.click();
    await tick(80);
    const form = slot("vault-secret-dialog")!;
    expect(form).toBeTruthy();
    expect(form.textContent).toContain("Add secret");
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await tick();
    const alerts = [...form.querySelectorAll<HTMLElement>('[role="alert"]')].filter(visible).map((a) => a.textContent!.trim());
    expect(alerts).toEqual(expect.arrayContaining(["Enter a name.", "Enter the value."]));
    expect(detail).toBeUndefined();
    type(form.querySelector<HTMLInputElement>('[data-slot="input"]')!, "NEW_KEY");
    type(form.querySelector<HTMLTextAreaElement>("textarea")!, "s3cret");
    await tick();
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await tick(80);
    expect(detail).toEqual({ input: { name: "NEW_KEY", group: "", kind: "api-key", value: "s3cret" }, id: null });
  });

  it("keeps the edit form open on a server error", async () => {
    const root = await mount();
    let id: unknown;
    root.addEventListener("save", (e) => {
      const d = (e as CustomEvent).detail;
      id = d.id;
      d.wait(Promise.resolve({ error: "Name taken" }));
    });
    byLabel(root, "Edit DATABASE_URL").click();
    await tick(80);
    const form = slot("vault-secret-dialog")!;
    expect(form.textContent).toContain("Edit DATABASE_URL");
    expect(form.textContent).toContain("Leave blank to keep the current value.");
    expect(form.querySelector<HTMLInputElement>('[data-slot="input"]')!.value).toBe("DATABASE_URL");
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await tick(80);
    expect(id).toBe("s2");
    expect(form.textContent).toContain("Name taken");
  });

  it("asks before deleting, then fires delete with the id", async () => {
    const root = await mount();
    let id: unknown;
    root.addEventListener("delete", (e) => {
      id = (e as CustomEvent).detail.id;
      (e as CustomEvent).detail.wait(Promise.resolve());
    });
    byLabel(root, "Delete DATABASE_URL").click();
    await tick(80);
    const dlg = slot("vault-delete-dialog")!;
    expect(dlg.textContent).toContain("Delete DATABASE_URL?");
    expect(id).toBeUndefined();
    [...dlg.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent!.trim() === "Delete")!.click();
    await tick(80);
    expect(id).toBe("s2");
  });

  it("lists the access log newest first on its tab", async () => {
    const root = await mount();
    const rows = [...root.querySelectorAll<HTMLElement>("[data-row]")];
    expect(rows).toHaveLength(2);
    expect(rows[0]!.textContent).toContain("Layla");
    expect(rows[0]!.textContent).toContain("Revealed");
    expect(rows[1]!.textContent).toContain("Omar");
  });
});
