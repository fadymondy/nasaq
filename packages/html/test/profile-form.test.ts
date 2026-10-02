// The Blade profile-form example (packages/php/examples/rendered/profile-form.html) under real Alpine.
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
  host.innerHTML = rendered("profile-form");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host.querySelector<HTMLElement>('[data-slot="profile-form"]')!;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data = (el: Element): any => Alpine.$data(el as HTMLElement);
const listen = (root: Element, name: string, result?: unknown) => {
  const calls: Record<string, unknown>[] = [];
  root.addEventListener(name, (e) => {
    const d = (e as CustomEvent).detail;
    calls.push(d);
    d.wait(Promise.resolve(result));
  });
  return calls;
};

describe("profile-form (Blade example)", () => {
  it("renders the sections and keeps the save bar hidden until something changes", async () => {
    const root = await mount();
    expect(root.textContent).toContain("Public profile");
    expect(root.textContent).toContain("Preferences");
    expect(root.textContent).toContain("Not verified");
    const bar = root.querySelector<HTMLElement>('[data-slot="profile-form-savebar"]')!;
    expect(bar.style.display).toBe("none");
    expect(data(root).counter).toBe("47/160");
    data(root).name = "Sara H";
    await tick();
    expect(data(root).dirty).toBe(true);
    expect(bar.style.display).not.toBe("none");
  });

  it("saves the trimmed values, then treats them as saved", async () => {
    const root = await mount();
    const saves = listen(root, "save");
    const d = data(root);
    d.name = "  Sara H  ";
    await tick();
    await d.save();
    expect((saves[0]!.values as { name: string }).name).toBe("Sara H");
    expect(d.name).toBe("Sara H");
    expect(d.dirty).toBe(false);
    expect(d.notice).toBe("Profile updated.");
  });

  it("discards back to the saved values", async () => {
    const root = await mount();
    const d = data(root);
    d.bio = "Changed";
    d.username = "other";
    await tick();
    expect(d.dirty).toBe(true);
    d.discard();
    await tick();
    expect(d.bio).toBe("Product designer building bilingual interfaces.");
    expect(d.username).toBe("sara.haddad");
    expect(d.dirty).toBe(false);
  });

  it("asks for a name, shows server errors, and shows the generic error with nobody listening", async () => {
    const root = await mount();
    const d = data(root);
    d.name = " ";
    await tick();
    await d.save();
    expect(d.errs.name).toBe("Enter your name.");
    d.name = "Sara B";
    await tick();
    await d.save();
    expect(d.formError).toBe("Your profile could not be saved. Try again.");
    listen(root, "save", { error: "Nope", fieldErrors: { phone: "Bad number" } });
    await d.save();
    expect(d.formError).toBe("Nope");
    expect(d.errs.phone).toBe("Bad number");
    expect(d.bad.phone).toBe(true);
  });

  it("lowercases the username, checks it after a pause and blocks a taken one", async () => {
    const root = await mount();
    const checks = listen(root, "check-username", false);
    const d = data(root);
    d.username = "Sara_B!";
    await tick();
    expect(d.username).toBe("sara_b");
    expect(d.check.status).toBe("checking");
    await tick(460);
    expect(checks[0]!.username).toBe("sara_b");
    expect(d.check.status).toBe("taken");
    expect(d.errs.username).toBe("That username is taken. Try another one.");
    expect(d.blocked).toBe(true);
  });

  it("flags a bad username format and a bad website only after a save attempt", async () => {
    const root = await mount();
    const d = data(root);
    d.username = "a";
    d.website = "nope";
    await tick();
    expect(d.errs.username).toContain("Use 3 to 30 letters");
    expect(d.errs.website).toBeUndefined();
    await d.save();
    expect(d.errs.website).toBe("Enter a full link that starts with https://.");
  });

  it("resends the verification email once, then waits", async () => {
    const root = await mount();
    const resends = listen(root, "resend-verification");
    const d = data(root);
    await d.resendVerification();
    expect(resends).toHaveLength(1);
    expect(d.resend).toBe("sent");
    expect(d.resendMsg).toContain("sara@sahab.studio");
  });

  it("changes the email through the dialog and shows the pending notice", async () => {
    const root = await mount();
    const changes = listen(root, "change-email");
    const d = data(root);
    d.emailOpen = true;
    d.newEmail = "sara@sahab.studio";
    d.password = "pw";
    await d.submitEmail();
    expect(d.emailErrors.email).toBe("That is already your email.");
    d.newEmail = "new@sahab.studio";
    await d.submitEmail();
    expect(changes[0]).toMatchObject({ email: "new@sahab.studio", password: "pw" });
    expect(d.pendingEmail).toBe("new@sahab.studio");
    expect(d.emailOpen).toBe(false);
  });
});
