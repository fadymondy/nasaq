// The Blade contact-identities example (packages/php/examples/rendered/contact-identities.html) under real Alpine.
import { describe, expect, it } from "vitest";
import { mount, setup, tick } from "./_float-setup";

setup();

const type = (el: HTMLInputElement, value: string) => {
  el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
};
const waitable = (root: HTMLElement, name: string, make: (detail: any) => Promise<unknown>, seen: any[] = []) => {
  root.addEventListener(name, (e) => {
    const d = (e as CustomEvent).detail;
    seen.push(d);
    d.waitUntil(make(d));
  });
  return seen;
};
const shown = (el: Element | null) => !!el && (el as HTMLElement).style.display !== "none";

async function setupRoot() {
  const host = await mount("contact-identities");
  const root = host.querySelector<HTMLElement>('[data-slot="contact-identities"]')!;
  return { host, root };
}

describe("contact-identities (Blade example)", () => {
  it("lists the accounts by channel with the primary first, and the consent rows", async () => {
    const { root } = await setupRoot();
    const rows = [...root.querySelectorAll<HTMLElement>('[role="listitem"]')];
    expect(rows.map((r) => r.dataset.channel)).toEqual(["email", "email", "phone"]);
    expect(rows[0]!.textContent).toContain("sara@example.com");
    expect(rows[0]!.textContent).toContain("Primary");
    expect(rows[0]!.textContent).toContain("Verified");
    // Only the non-primary email has "Make primary".
    expect(rows.map((r) => r.textContent?.includes("Make primary"))).toEqual([false, true, false]);
    const consent = [...root.querySelectorAll<HTMLElement>('[data-slot="contact-consent"]')];
    expect(consent.map((c) => c.dataset.channel)).toEqual(["email", "whatsapp", "phone"]);
    expect(consent[0]!.textContent).toContain("Opted in");
    expect(consent[0]!.textContent).toContain("via Signup form");
    expect(consent[1]!.textContent).toContain("No account linked on this channel");
    expect(consent[2]!.textContent).toContain("Opted out");
    const switches = consent.map((c) => c.querySelector<HTMLElement>('[role="switch"]')!);
    expect(switches.map((s) => s.getAttribute("aria-checked"))).toEqual(["true", "false", "false"]);
    // No account on WhatsApp, so its switch is locked.
    expect(switches[1]!.hasAttribute("disabled")).toBe(true);
    expect(switches[0]!.hasAttribute("disabled")).toBe(false);
    expect(switches[0]!.getAttribute("aria-label")).toBe("Allow messages on Email");
  });

  it("validates the link form, then fires nq-contact-add and closes", async () => {
    const { root } = await setupRoot();
    const seen = waitable(root, "nq-contact-add", () => Promise.resolve());
    const form = root.querySelector<HTMLFormElement>('[data-slot="contact-identities-form"]')!;
    expect(shown(form)).toBe(false);
    root.querySelector<HTMLButtonElement>(":scope > div > header button")!.click();
    await tick(40);
    expect(shown(form)).toBe(true);
    const issue = () => form.querySelector<HTMLElement>('[role="alert"]')!;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await tick();
    expect(seen).toHaveLength(0);
    expect(shown(issue())).toBe(true);
    expect(issue().textContent).toBe("Enter the account.");
    const [value, label] = form.querySelectorAll<HTMLInputElement>("input:not([type=hidden])");
    type(value!, "nope");
    await tick();
    expect(shown(issue())).toBe(false);
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await tick();
    expect(issue().textContent).toBe("That is not a valid email address.");
    type(value!, "SARA@example.com");
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await tick();
    expect(issue().textContent).toBe("This account is already linked.");
    type(value!, "new@example.com");
    type(label!, "Other");
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await tick(60);
    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({ channel: "email", value: "new@example.com", label: "Other" });
    expect(shown(form)).toBe(false);
  });

  it("keeps the form open and shows the host's error", async () => {
    const { root } = await setupRoot();
    waitable(root, "nq-contact-add", () => Promise.resolve({ error: "Already on another contact" }));
    const form = root.querySelector<HTMLFormElement>('[data-slot="contact-identities-form"]')!;
    root.querySelector<HTMLButtonElement>(":scope > div > header button")!.click();
    await tick(40);
    type(form.querySelector<HTMLInputElement>("input:not([type=hidden])")!, "x@y.example");
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await tick(60);
    expect(root.textContent).toContain("Already on another contact");
    expect(shown(form)).toBe(true);
  });

  it("makes an account primary", async () => {
    const { root } = await setupRoot();
    const seen = waitable(root, "nq-contact-primary", () => Promise.resolve());
    const row = root.querySelectorAll<HTMLElement>('[role="listitem"]')[1]!;
    [...row.querySelectorAll("button")].find((b) => b.textContent?.includes("Make primary"))!.click();
    await tick(60);
    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({ id: "a2", channel: "email", value: "sara.k@home.example" });
  });

  it("asks before unlinking, then fires nq-contact-remove", async () => {
    const { root } = await setupRoot();
    const seen = waitable(root, "nq-contact-remove", () => Promise.resolve());
    const row = root.querySelectorAll<HTMLElement>('[role="listitem"]')[2]!;
    row.querySelector<HTMLButtonElement>('button[aria-label^="Unlink"]')!.click();
    await tick(80);
    const dlg = document.querySelector<HTMLElement>('[data-slot="contact-identities-remove"]')!;
    expect(dlg.textContent).toContain("Unlink +201001234567?");
    expect(seen).toHaveLength(0);
    [...dlg.querySelectorAll("button")].find((b) => b.textContent?.trim() === "Unlink")!.click();
    await tick(60);
    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({ id: "a3", channel: "phone" });
  });

  it("fires nq-contact-consent on a switch and puts it back when the change fails", async () => {
    const { root } = await setupRoot();
    let fail = false;
    const seen = waitable(root, "nq-contact-consent", () => Promise.resolve(fail ? { error: "Provider rejected it" } : undefined));
    const sw = root.querySelector<HTMLElement>('[data-slot="contact-consent"][data-channel="phone"] [role="switch"]')!;
    sw.click();
    await tick(80);
    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({ channel: "phone", status: "granted" });
    expect(sw.getAttribute("aria-checked")).toBe("true");
    fail = true;
    sw.click();
    await tick(80);
    expect(seen[1]).toMatchObject({ channel: "phone", status: "denied" });
    expect(sw.getAttribute("aria-checked")).toBe("true");
    expect(root.textContent).toContain("Provider rejected it");
  });

  it("shows the generic error when nobody listens", async () => {
    const { root } = await setupRoot();
    // The example listens on the root; point the component at a detached element so nothing hears the event.
    const row = root.querySelectorAll<HTMLElement>('[role="listitem"]')[1]!;
    const data = (window as any).Alpine.$data(root);
    data.root = document.createElement("div");
    [...row.querySelectorAll("button")].find((b) => b.textContent?.includes("Make primary"))!.click();
    await tick(60);
    expect(root.textContent).toContain("That did not work. Try again.");
  });
});
