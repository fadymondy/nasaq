// The Blade admin-users example (packages/php/examples/rendered/admin-users.html) under real Alpine.
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
  host.innerHTML = rendered("admin-users");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host.querySelector<HTMLElement>('[data-slot="admin-users"]')!;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data = (el: Element): any => Alpine.$data(el as HTMLElement);
const user = (id: string, name: string, status = "active", verified = true, roles: string[] = ["viewer"]) => ({ id, name, status, verified, roles });
const act = (root: Element, action: string, r: unknown) => root.dispatchEvent(new CustomEvent("nq-data-table-action", { bubbles: true, detail: { action, row: r } }));
const listen = (root: Element, name: string, result?: unknown) => {
  const calls: Record<string, unknown>[] = [];
  root.addEventListener(name, (e) => {
    const d = (e as CustomEvent).detail;
    calls.push(d);
    d.wait(Promise.resolve(result));
  });
  return calls;
};

describe("admin-users (Blade example)", () => {
  it("renders the stats and the user rows", async () => {
    const root = await mount();
    expect(root.querySelectorAll('[data-slot="stat-card"]')).toHaveLength(4);
    expect(root.textContent).toContain("Sara Alharbi");
    expect(root.textContent).toContain("Omar Nasser");
  });

  it("verifies an unverified user and ignores a verified one", async () => {
    const root = await mount();
    const calls = listen(root, "verify");
    act(root, "verify", user("u1", "Sara Alharbi"));
    await tick();
    expect(calls).toHaveLength(0);
    act(root, "verify", user("u2", "Omar Nasser", "active", false));
    await tick();
    expect(calls).toHaveLength(1);
    expect(data(root).notice.text).toBe("Omar Nasser was verified.");
  });

  it("asks before disabling, reports the host's error, then succeeds", async () => {
    const root = await mount();
    act(root, "disable", user("u1", "Sara Alharbi"));
    expect(data(root).confirmOpen).toBe(false);
    act(root, "disable", user("u2", "Omar Nasser"));
    await tick();
    expect(data(root).confirmOpen).toBe(true);
    expect(data(root).confirmTitle).toBe("Disable Omar Nasser?");
    const off = (e: Event) => (e as CustomEvent).detail.wait(Promise.resolve({ error: "Last admin" }));
    root.addEventListener("set-disabled", off);
    await data(root).runConfirm();
    expect(data(root).confirmError).toBe("Last admin");
    expect(data(root).confirmOpen).toBe(true);
    root.removeEventListener("set-disabled", off);
    const calls = listen(root, "set-disabled");
    await data(root).runConfirm();
    expect(calls[0]).toMatchObject({ disabled: true });
    expect(data(root).confirmOpen).toBe(false);
    expect(data(root).notice.text).toBe("Omar Nasser was disabled.");
  });

  it("enables a disabled user straight away", async () => {
    const root = await mount();
    const calls = listen(root, "set-disabled");
    act(root, "enable", user("u3", "Lina Haddad", "disabled"));
    await tick();
    expect(calls[0]).toMatchObject({ disabled: false });
    expect(data(root).notice.text).toBe("Lina Haddad was enabled.");
  });

  it("updates roles only after a change", async () => {
    const root = await mount();
    const calls = listen(root, "update-roles");
    act(root, "roles", user("u2", "Omar Nasser", "active", false, ["editor"]));
    await tick();
    expect(data(root).rolesOpen).toBe(true);
    expect(data(root).canSaveRoles).toBe(false);
    data(root).editOn.admin = true;
    await tick();
    expect(data(root).canSaveRoles).toBe(true);
    await data(root).saveRoles();
    expect(calls[0]!.roles).toEqual(["admin", "editor"]);
    expect(data(root).rolesOpen).toBe(false);
    expect(data(root).notice.text).toBe("Roles updated for Omar Nasser.");
  });

  it("confirms a password reset and impersonation", async () => {
    const root = await mount();
    const reset = listen(root, "reset-password");
    const imp = listen(root, "impersonate");
    act(root, "reset", user("u2", "Omar Nasser"));
    await data(root).runConfirm();
    expect(reset).toHaveLength(1);
    act(root, "impersonate", user("u1", "Sara Alharbi"));
    expect(data(root).confirmOpen).toBe(false);
    act(root, "impersonate", user("u2", "Omar Nasser"));
    await data(root).runConfirm();
    expect(imp).toHaveLength(1);
  });

  it("validates the add form, then fires add-user", async () => {
    const root = await mount();
    const calls = listen(root, "add-user");
    data(root).openAdd();
    await data(root).submitAdd();
    expect(data(root).nameMsg).toBe("Enter a name.");
    expect(data(root).emailMsg).toBe("Enter an email address.");
    expect(calls).toHaveLength(0);
    data(root).draft.name = " Mona ";
    data(root).draft.email = "mona@x.test";
    await data(root).submitAdd();
    expect(calls[0]!.values).toMatchObject({ name: "Mona", email: "mona@x.test", roles: ["admin"], sendInvite: true, verified: false });
    expect(data(root).addOpen).toBe(false);
    expect(data(root).notice.text).toBe("Mona was added.");
  });

  it("keeps the add dialog open with field errors from the host", async () => {
    const root = await mount();
    listen(root, "add-user", { fieldErrors: { email: "Already taken" } });
    data(root).openAdd();
    data(root).draft.name = "Mona";
    data(root).draft.email = "mona@x.test";
    await data(root).submitAdd();
    expect(data(root).emailMsg).toBe("Already taken");
    expect(data(root).emailBad).toBe(true);
    expect(data(root).addOpen).toBe(true);
  });

  it("bulk-verifies only the unverified selected users", async () => {
    const root = await mount();
    const calls = listen(root, "verify");
    await data(root).bulk("verify", [user("u1", "A"), user("u2", "B", "active", false)]);
    expect(calls).toHaveLength(1);
    expect(data(root).notice.text).toBe("1 users updated.");
  });
});
