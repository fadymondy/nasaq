import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import nasaq from "../src/alpine";
import { legalHashTarget, legalSectionUrl } from "../src/alpine/legal-page";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms));

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
  host.innerHTML = rendered("legal-page");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

describe("legal-page helpers", () => {
  it("finds the section a hash points to", () => {
    expect(legalHashTarget("#payments", ["payments"])).toBe("payments");
    expect(legalHashTarget("#%D8%A7%D9%84", ["ال"])).toBe("ال");
    expect(legalHashTarget("#nope", ["payments"])).toBeUndefined();
    expect(legalSectionUrl("https://a.test/t#x", "payments")).toBe("https://a.test/t#payments");
  });
});

describe("legal-page (Blade example)", () => {
  it("renders numbered sections with anchors and the rail", async () => {
    const host = await mount();
    expect(host.querySelector('[data-slot="legal-page"]')).not.toBeNull();
    const h2 = [...host.querySelectorAll('[data-slot="legal-section"] > h2')];
    expect(h2.map((h) => h.id)).toEqual(["using-the-service", "payments"]);
    const links = [...host.querySelectorAll('[data-slot="table-of-contents"] a')] as HTMLElement[];
    expect(links.map((a) => a.dataset.id)).toEqual(["using-the-service", "payments"]);
  });

  it("highlights the heading in view in the rail", async () => {
    const host = await mount();
    const at = { "using-the-service": -300, payments: 40 };
    for (const [id, top] of Object.entries(at)) {
      (host.querySelector(`[id="${id}"]`) as HTMLElement).getBoundingClientRect = () => ({ top, bottom: top + 20, left: 0, right: 0, width: 0, height: 20, x: 0, y: top, toJSON() {} }) as DOMRect;
    }
    document.dispatchEvent(new Event("scroll"));
    await tick(60);
    const links = [...host.querySelectorAll('[data-slot="table-of-contents"] a')] as HTMLElement[];
    expect(links[1]!.getAttribute("aria-current")).toBe("location");
    expect(links[0]!.getAttribute("aria-current")).toBeNull();
  });

  it("copies a section link, swaps the icon and announces it", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    const host = await mount();
    const events: string[] = [];
    host.addEventListener("nq:copy-link", (e) => events.push((e as CustomEvent).detail.url));
    const button = host.querySelectorAll('[data-slot="legal-section"] h2 button')[1] as HTMLElement;
    expect(button.getAttribute("aria-label")).toBe("Copy link to this section: Payments");
    button.click();
    await tick();
    expect(writeText).toHaveBeenCalledWith(expect.stringMatching(/#payments$/));
    expect(events).toHaveLength(1);
    expect(host.querySelector('[role="status"]')!.textContent).toBe("Link copied");
    const svgs = button.querySelectorAll("svg");
    expect((svgs[0] as unknown as HTMLElement).style.display).toBe("none");
    expect((svgs[1] as unknown as HTMLElement).style.display).not.toBe("none");
  });

  it("jumps from the rail and updates the hash", async () => {
    const host = await mount();
    const target = host.querySelector("#payments") as HTMLElement;
    target.scrollIntoView = vi.fn();
    (host.querySelectorAll('[data-slot="table-of-contents"] a')[1] as HTMLElement).click();
    expect(target.scrollIntoView).toHaveBeenCalled();
    expect(window.location.hash).toBe("#payments");
  });
});
