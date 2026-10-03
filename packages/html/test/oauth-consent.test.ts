// The Blade oauth-consent example under real Alpine.
import { describe, expect, it } from "vitest";
import { mount, setup, tick } from "./_float-setup";

setup();
const root = (host: HTMLElement) => host.querySelector<HTMLElement>('[data-slot="oauth-consent"]')!;
const allow = (host: HTMLElement) => host.querySelector<HTMLButtonElement>('[data-slot="oauth-consent-allow"]')!;
const deny = (host: HTMLElement) => host.querySelector<HTMLButtonElement>('[data-slot="oauth-consent-deny"]')!;
const alertEl = (host: HTMLElement) => host.querySelector<HTMLElement>('[data-slot="alert"][data-tone="danger"]')!;

describe("oauth-consent (Blade example)", () => {
  it("renders the app, account and scopes", async () => {
    const host = await mount("oauth-consent");
    expect(host.querySelector("h1")!.textContent).toBe("Zapline wants to access your Nasaq account");
    expect(host.querySelector('[data-slot="oauth-consent-app"]')!.textContent).toContain("by Zapline Inc.");
    expect(host.querySelector('[data-slot="oauth-consent-account"] bdi')!.textContent).toBe("fady@example.com");
    expect(host.querySelectorAll('[data-slot="oauth-consent-scopes"] li')).toHaveLength(2);
    expect(host.querySelector('[data-scope="write"]')!.textContent).toContain("Sensitive");
    expect(host.querySelector('[data-scope="profile"]')!.textContent).not.toContain("Sensitive");
    expect(root(host).textContent).toContain("app.zapline.io");
    expect(alertEl(host).style.display).toBe("none");
  });

  it("allows through the event and disables Deny meanwhile", async () => {
    const host = await mount("oauth-consent");
    let seen = 0;
    root(host).addEventListener("nq-oauth-allow", () => seen++);
    allow(host).click();
    await tick(50);
    expect(seen).toBe(1);
    expect(allow(host).getAttribute("aria-busy")).toBe("true");
    expect(deny(host).disabled).toBe(true);
    expect(root(host).getAttribute("aria-busy")).toBe("true");
    await tick(450);
    expect(allow(host).getAttribute("aria-busy")).toBeNull();
    expect(deny(host).disabled).toBe(false);
    expect(alertEl(host).style.display).toBe("none");
  });

  it("shows the error a deny listener resolves", async () => {
    const host = await mount("oauth-consent");
    deny(host).click();
    await tick(450);
    expect(alertEl(host).style.display).toBe("");
    expect(alertEl(host).textContent).toContain("Could not deny right now.");
  });
});
