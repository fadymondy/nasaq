// The Blade change-password-form example under real Alpine.
import { describe, expect, it } from "vitest";
import { mount, setup, tick } from "./_float-setup";

setup();
const input = (host: HTMLElement, name: string) => host.querySelector<HTMLInputElement>(`input[name="${name}"]`)!;
const set = (host: HTMLElement, name: string, value: string) => {
  const el = input(host, name);
  el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
};
const fill = (host: HTMLElement, c: string, n: string, k: string) => {
  set(host, "currentPassword", c);
  set(host, "newPassword", n);
  set(host, "confirmPassword", k);
};
const submit = async (host: HTMLElement, ms = 30) => {
  host.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
  await tick(ms);
};
const errors = (host: HTMLElement) => [...host.querySelectorAll<HTMLElement>('[data-slot="field-error"]')].filter((e) => e.style.display !== "none");

describe("change-password-form (Blade example)", () => {
  it("renders the three fields with autocomplete, the hint, the checkbox and the submit button", async () => {
    const host = await mount("change-password-form");
    const form = host.querySelector<HTMLFormElement>("form")!;
    expect(form.getAttribute("data-slot")).toBe("change-password-form");
    expect(form.hasAttribute("novalidate")).toBe(true);
    expect(input(host, "currentPassword").autocomplete).toBe("current-password");
    expect(input(host, "newPassword").autocomplete).toBe("new-password");
    expect(input(host, "confirmPassword").autocomplete).toBe("new-password");
    expect(host.textContent).toContain("At least 8 characters.");
    expect(host.querySelector('[data-slot="checkbox"]')!.getAttribute("aria-checked")).toBe("true");
    expect(host.querySelector('button[type="submit"]')!.textContent!.trim()).toBe("Change password");
    expect(host.querySelector(`label[for="${input(host, "currentPassword").id}"]`)).not.toBeNull();
    expect(errors(host)).toHaveLength(0);
  });

  it("validates required, length, same and mismatch before it dispatches", async () => {
    const host = await mount("change-password-form");
    let sent = 0;
    host.querySelector("form")!.addEventListener("nq-change-password", () => sent++);
    await submit(host);
    expect(errors(host)).toHaveLength(3);
    expect(errors(host)[0]!.textContent).toBe("Enter this to continue.");
    expect(input(host, "currentPassword").getAttribute("aria-invalid")).toBe("true");
    fill(host, "oldpassword", "short", "short");
    await submit(host);
    expect(errors(host).map((e) => e.textContent)).toEqual(["Use at least 8 characters."]);
    fill(host, "oldpassword", "oldpassword", "oldpassword");
    await submit(host);
    expect(errors(host)[0]!.textContent).toBe("Choose a password different from your current one.");
    fill(host, "oldpassword", "newpassword1", "newpassword2");
    await submit(host);
    expect(errors(host)[0]!.textContent).toBe("The passwords do not match.");
    expect(sent).toBe(0);
  });

  it("dispatches the values, clears the fields and shows success", async () => {
    const host = await mount("change-password-form");
    const seen: unknown[] = [];
    host.querySelector("form")!.addEventListener("nq-change-password", (e) => {
      const { currentPassword, newPassword, signOutOthers, waitUntil } = (e as CustomEvent).detail;
      seen.push({ currentPassword, newPassword, signOutOthers });
      waitUntil(Promise.resolve());
    });
    fill(host, "correct-horse", "newpassword1", "newpassword1");
    await submit(host, 450);
    expect(seen).toEqual([{ currentPassword: "correct-horse", newPassword: "newpassword1", signOutOthers: true }]);
    const success = host.querySelector<HTMLElement>('[data-slot="alert"][data-tone="success"]')!;
    expect(success.style.display).not.toBe("none");
    expect(success.textContent).toContain("Your password was changed.");
    expect(input(host, "currentPassword").value).toBe("");
  });

  it("shows field errors from the server, and the generic error on a rejection", async () => {
    const host = await mount("change-password-form");
    fill(host, "wrong-password", "newpassword1", "newpassword1");
    await submit(host, 450);
    expect(errors(host).map((e) => e.textContent)).toEqual(["That is not your current password."]);
    expect(host.querySelector('[data-slot="field"]')!.hasAttribute("data-invalid")).toBe(true);

    const form = host.querySelector("form")!;
    form.addEventListener("nq-change-password", (e) => (e as CustomEvent).detail.waitUntil(Promise.reject(new Error("x"))));
    await submit(host, 450);
    const danger = host.querySelector<HTMLElement>('[data-slot="alert"][data-tone="danger"]')!;
    expect(danger.style.display).not.toBe("none");
    expect(danger.textContent).toContain("Could not change your password. Try again.");
  });
});
