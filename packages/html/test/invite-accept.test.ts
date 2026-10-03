// The Blade invite-accept example under real Alpine.
import { describe, expect, it } from "vitest";
import { mount, setup, tick } from "./_float-setup";

setup();
const root = (host: HTMLElement) => host.querySelector<HTMLElement>('[data-slot="invite-accept"]')!;
const button = (host: HTMLElement, text: string) => [...host.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.includes(text))!;
const alertText = (host: HTMLElement) => host.querySelector<HTMLElement>('[data-slot="alert"][data-tone="danger"]')!;

describe("invite-accept (Blade example)", () => {
  it("renders the valid state for a signed-in account", async () => {
    const host = await mount("invite-accept");
    expect(root(host).getAttribute("data-state")).toBe("valid");
    expect(host.querySelector("h1")!.textContent).toBe("Join Sahab Studio");
    expect(host.textContent).toContain("Sara Alharbi invited you to collaborate.");
    expect(host.querySelector('[data-slot="invite-workspace"]')!.textContent).toContain("12 members");
    expect(host.querySelector('[data-slot="invite-workspace"]')!.textContent).toContain("Admin");
    expect(root(host).querySelector("dl bdi")!.textContent).toBe("omar@example.com");
    expect(root(host).querySelector("time")!.textContent).toBe("Oct 6, 2026");
    expect(root(host).textContent).toContain("Signed in as");
    expect(button(host, "Accept invitation")).toBeTruthy();
    expect(button(host, "Decline")).toBeTruthy();
  });

  it("accepts through the event and shows no error", async () => {
    const host = await mount("invite-accept");
    let seen = 0;
    root(host).addEventListener("nq-invite-accept", () => seen++);
    button(host, "Accept invitation").click();
    await tick(50);
    expect(seen).toBe(1);
    expect(button(host, "Accept invitation").getAttribute("aria-busy")).toBe("true");
    expect(button(host, "Decline").disabled).toBe(true);
    await tick(450);
    expect(button(host, "Accept invitation").getAttribute("aria-busy")).toBeNull();
    expect(alertText(host).style.display).toBe("none");
  });

  it("shows the error a decline listener resolves", async () => {
    const host = await mount("invite-accept");
    button(host, "Decline").click();
    await tick(450);
    expect(alertText(host).style.display).toBe("");
    expect(alertText(host).textContent).toContain("Could not decline right now.");
  });
});
