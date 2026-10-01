import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
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
  for (const el of [...document.body.children]) {
    Alpine.destroyTree(el as HTMLElement);
    el.remove();
  }
});

async function mount(html: string) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

const shown = (el: Element | null) => !!el && (el as HTMLElement).style.display !== "none";

describe("subscription-landing (Blade example)", () => {
  it("starts on the form with an unticked consent box and a left-to-right email field", async () => {
    const host = await mount(rendered("subscription-landing"));
    const root = host.querySelector<HTMLElement>('[data-slot="subscription-landing"]')!;
    expect(root.getAttribute("data-mode")).toBe("subscribe");
    expect([...root.querySelectorAll("h1")].map((h) => h.textContent)).toContain("Stay in the loop");
    expect(root.querySelector('input[type="email"]')!.getAttribute("dir")).toBe("ltr");
    expect(root.querySelector('[data-slot="checkbox"]')!.getAttribute("aria-checked")).toBe("false");
    expect(shown(root.querySelector('form [role="alert"]'))).toBe(false);
  });

  it("blocks an empty submit with messages, then dispatches nq-subscribe and shows the inbox message", async () => {
    const host = await mount(rendered("subscription-landing"));
    const root = host.querySelector<HTMLElement>('[data-slot="subscription-landing"]')!;
    const events: { email: string }[] = [];
    root.addEventListener("nq-subscribe", (e) => events.push((e as CustomEvent).detail));
    const form = root.querySelector("form")!;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await tick();
    expect(events).toHaveLength(0);
    const alerts = [...form.querySelectorAll('p[role="alert"]')].filter(shown).map((p) => p.textContent);
    expect(alerts).toEqual(["Enter your email address.", "Tick the box to agree."]);

    const email = form.querySelector<HTMLInputElement>('input[type="email"]')!;
    email.value = "sara@example.com";
    email.dispatchEvent(new Event("input", { bubbles: true }));
    form.querySelector<HTMLElement>('[data-slot="checkbox"]')!.click();
    await tick();
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await tick(700);
    expect(events).toHaveLength(1);
    expect(events[0]!.email).toBe("sara@example.com");
    const h1 = [...root.querySelectorAll("h1")].find((h) => shown(h.parentElement!.parentElement))!;
    expect(h1.textContent).toBe("Check your inbox");
    expect(root.textContent).toContain("sara@example.com");
  });

  it("shows an error a listener returns and stays on the form", async () => {
    const host = await mount(rendered("subscription-landing"));
    const root = host.querySelector<HTMLElement>('[data-slot="subscription-landing"]')!;
    root.addEventListener("nq-subscribe", (e) => (e as CustomEvent).detail.waitUntil(Promise.resolve({ error: "Nope" })));
    const form = root.querySelector("form")!;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = Alpine.$data(root) as any;
    data.email = "sara@example.com";
    data.consent = true;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await tick(700);
    expect(data.stage).toBe("form");
    expect(data.error).toBe("Nope");
  });

  it("confirm and unsubscribe pages wait for the person, mask the address and dispatch their events", async () => {
    const host = await mount(
      `<div data-slot="subscription-landing" x-data="nqSubscriptionLanding({ mode: 'unsubscribe', email: 'sara@example.com' })">
         <p id="body" x-text="unsubscribeText"></p><p id="done" x-text="unsubscribedText"></p>
         <form x-on:submit.prevent="unsubscribe()"></form><button id="undo" x-on:click="resubscribe()"></button>
       </div>`,
    );
    const root = host.firstElementChild as HTMLElement;
    const seen: string[] = [];
    for (const n of ["nq-unsubscribe", "nq-resubscribe"]) root.addEventListener(n, (e) => seen.push(`${n}:${JSON.stringify((e as CustomEvent).detail.reason ?? null)}`));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = Alpine.$data(root) as any;
    expect(seen).toEqual([]);
    expect(root.querySelector("#body")!.textContent).toBe("Stop emails to s***@example.com.");
    data.reason = "too_many";
    root.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await tick();
    expect(data.stage).toBe("done");
    expect(root.querySelector("#done")!.textContent).toBe("s***@example.com will not get any more emails from us.");
    root.querySelector<HTMLElement>("#undo")!.click();
    await tick();
    expect(data.stage).toBe("undone");
    expect(seen).toEqual(['nq-unsubscribe:"too_many"', "nq-resubscribe:null"]);
  });
});
