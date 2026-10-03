import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import nasaq from "../src/alpine";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms));

beforeAll(() => {
  Alpine.plugin(nasaq);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).Alpine = Alpine;
  Alpine.start();
});

afterEach(() => {
  vi.unstubAllGlobals();
  for (const el of [...document.body.children]) {
    Alpine.destroyTree(el as HTMLElement);
    el.remove();
  }
});

async function mount() {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true });
  vi.stubGlobal("fetch", fetchMock);
  const host = document.createElement("div");
  host.innerHTML = rendered("testimonials");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  const form = host.querySelector('[data-slot="testimonial-form"]') as HTMLFormElement;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = () => Alpine.$data(form) as any;
  return { host, form, data, fetchMock };
}

describe("testimonials", () => {
  it("renders the wall with its cards", async () => {
    const { host } = await mount();
    expect(host.querySelector('[data-slot="testimonial-wall"]')!.getAttribute("data-layout")).toBe("wall");
    expect(host.querySelectorAll('[data-slot="testimonial"]').length).toBe(3);
  });

  it("shows errors and does not send an incomplete form", async () => {
    const { form, data, fetchMock } = await mount();
    form.dispatchEvent(new Event("submit", { cancelable: true }));
    await tick();
    expect(data().done).toBe(false);
    expect(data().fe.name).toBeTruthy();
    expect(data().fe.consent).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends trimmed answers and shows the thank-you", async () => {
    const { form, data, fetchMock } = await mount();
    Object.assign(data().v, { name: "  Sam  ", quote: "This product is genuinely great to use.", consent: true });
    form.dispatchEvent(new Event("submit", { cancelable: true }));
    await tick(60);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body).name).toBe("Sam");
    expect(data().done).toBe(true);
    expect(form.getAttribute("data-state")).toBe("done");
    expect((form.querySelector('[data-slot="testimonial-form-done"]') as HTMLElement).style.display).not.toBe("none");
  });

  it("treats a filled honeypot as done without sending", async () => {
    const { form, data, fetchMock } = await mount();
    Object.assign(data().v, { name: "Bot", quote: "This product is genuinely great to use.", consent: true });
    data().trap = "http://spam";
    form.dispatchEvent(new Event("submit", { cancelable: true }));
    await tick(60);
    expect(data().done).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("toggles the rating", async () => {
    const { data } = await mount();
    data().setRating(4);
    expect(data().v.rating).toBe(4);
    expect(data().starClass(4)).toContain("fill-nq-accent");
    data().setRating(4);
    expect(data().v.rating).toBeNull();
  });
});
