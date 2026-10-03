// The Blade members-manager example (packages/php/examples/rendered/members-manager.html) under real Alpine.
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
  host.innerHTML = rendered("members-manager");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host.querySelector<HTMLElement>('[data-slot="members-manager"]')!;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data = (el: Element): any => Alpine.$data(el as HTMLElement);
const act = (root: Element, action: string, id: string) => root.dispatchEvent(new CustomEvent("nq-data-table-action", { bubbles: true, detail: { action, row: { id } } }));
const listen = (root: Element, name: string, result?: unknown) => {
  const calls: Record<string, unknown>[] = [];
  root.addEventListener(name, (e) => {
    const d = (e as CustomEvent).detail;
    calls.push(d);
    d.wait(Promise.resolve(result));
  });
  return calls;
};

describe("members-manager (Blade example)", () => {
  it("renders the members, the pending tab and the leave block", async () => {
    const root = await mount();
    expect(root.textContent).toContain("Sara Alharbi");
    expect(root.textContent).toContain("Pending invites");
    expect(root.textContent).toContain("new@acme.test");
    expect(root.querySelector('[data-slot="members-leave"]')).not.toBeNull();
  });

  it("asks before removing a member and reports the result", async () => {
    const root = await mount();
    const calls = listen(root, "remove");
    act(root, "remove", "m3");
    await tick();
    expect(data(root).confirmOpen).toBe(true);
    expect(data(root).confirmTitle).toBe("Remove Lina Haddad?");
    expect(calls).toHaveLength(0);
    await data(root).runConfirm();
    expect(calls).toHaveLength(1);
    expect((calls[0]!.member as { id: string }).id).toBe("m3");
    expect(data(root).notice.text).toBe("Lina Haddad was removed.");
    expect(data(root).confirmOpen).toBe(false);
  });

  it("keeps the confirm open with the host's error", async () => {
    const root = await mount();
    listen(root, "remove", { error: "Nope" });
    act(root, "remove", "m3");
    await data(root).runConfirm();
    expect(data(root).confirmOpen).toBe(true);
    expect(data(root).confirmError).toBe("Nope");
  });

  it("explains why the last owner cannot be removed or demoted", async () => {
    const root = await mount();
    const calls = listen(root, "remove");
    act(root, "remove", "m1");
    expect(data(root).confirmOpen).toBe(false);
    expect(data(root).notice.text).toBe("Use Leave workspace to remove yourself.");
    act(root, "role", "m1");
    expect(data(root).roleOpen).toBe(false);
    expect(data(root).notice.text).toBe("A workspace needs an owner. Transfer ownership first.");
    expect(calls).toHaveLength(0);
  });

  it("changes a role through the dialog", async () => {
    const root = await mount();
    const calls = listen(root, "change-role");
    act(root, "role", "m3");
    expect(data(root).roleOpen).toBe(true);
    data(root).roleDraft = "admin";
    await data(root).saveRole();
    expect(calls[0]!.role).toBe("admin");
    expect(data(root).notice.text).toBe("Role updated for Lina Haddad.");
  });

  it("transfers ownership after a confirm and leaves with nobody listening failing", async () => {
    const root = await mount();
    const calls = listen(root, "transfer-ownership");
    act(root, "transfer", "m2");
    expect(data(root).confirmTitle).toBe("Make Omar Nasser the owner?");
    await data(root).runConfirm();
    expect(calls).toHaveLength(1);
    expect(data(root).notice.text).toBe("Omar Nasser is now the owner.");
    data(root).openLeave();
    await data(root).runConfirm();
    expect(data(root).confirmError).toBe("That did not work. Try again.");
  });

  it("validates and sends invites, and revokes a pending one", async () => {
    const root = await mount();
    const invites = listen(root, "invite");
    data(root).openInvite();
    await data(root).submitInvite();
    expect(data(root).emailsMsg).toBe("Add at least one email address.");
    expect(data(root).validateEmail("nope", [])).toBe("nope is not a valid email address.");
    expect(data(root).validateEmail("A@b.test", ["a@b.test"])).toBe("A@b.test is already added.");
    data(root).draft.emails = ["a@b.test", "c@d.test"];
    await data(root).submitInvite();
    expect(invites[0]!.values).toEqual({ emails: ["a@b.test", "c@d.test"], role: "member" });
    expect(data(root).notice.text).toBe("2 invites sent.");
    const revokes = listen(root, "revoke-invite");
    await data(root).revokeInvite("i1");
    expect((revokes[0]!.invite as { email: string }).email).toBe("new@acme.test");
    expect(data(root).notice.text).toBe("Invite to new@acme.test was revoked.");
  });
});
