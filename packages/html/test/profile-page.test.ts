// The Blade profile-page example under real Alpine: the contact event, the project tabs and the rendered sections.
import { describe, expect, it } from "vitest";
import { mount, setup, tick } from "./_float-setup";

setup();
const root = (host: HTMLElement) => host.querySelector<HTMLElement>('[data-slot="profile-page"]')!;

describe("profile-page (Blade example)", () => {
  it("renders the identity, the sections and the experience total", async () => {
    const host = await mount("profile-page");
    expect(root(host).querySelector("h1")!.textContent).toBe("Laylah Haddad");
    const titles = [...root(host).querySelectorAll('[data-slot="profile-section"] h2')].map((h) => h.textContent!.replace(/\s+/g, " ").trim());
    expect(titles.slice(0, 3)).toEqual(["About", "Experience", "Skills"]);
    expect(root(host).textContent).toContain("of experience");
    expect(root(host).querySelectorAll('[data-slot="timeline-item"]')).toHaveLength(2);
  });

  it("dispatches profile-contact from the sidebar and from the closing call to action", async () => {
    const host = await mount("profile-page");
    let n = 0;
    root(host).addEventListener("profile-contact", () => n++);
    const sidebar = root(host).querySelector<HTMLElement>('[data-slot="profile-sidebar"]')!;
    [...sidebar.querySelectorAll<HTMLElement>("button")].find((b) => b.textContent!.includes("Get in touch"))!.click();
    await tick();
    const contact = root(host).querySelector<HTMLElement>('[data-slot="profile-contact"]')!;
    contact.querySelector<HTMLElement>("button")!.click();
    await tick();
    expect(n).toBe(2);
  });

  it("marks the current role and keeps the featured project in the story", async () => {
    const host = await mount("profile-page");
    expect(root(host).querySelector('[data-slot="timeline-item"] [data-slot="badge"]')!.textContent).toContain("Current");
    expect(root(host).querySelector('[data-slot="feature-story"]')!.textContent).toContain("Ledger");
  });
});
