// The Blade example (php/examples/seo-pages.blade.php) mounted under real Alpine: the pages list with its score, issue, status and vitals cells and
// row actions, and the issue checklist with optimistic toggles.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";
import { formatVital, issueCounts, openIssues, rateVital, scoreBand, seoScore, siteScore, sortIssues } from "../src/alpine/seo-pages-logic";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = (ms = 60) => new Promise((r) => setTimeout(r, ms));

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

async function mountHtml(html: string) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const list = (host: HTMLElement) => host.querySelector<HTMLElement>('[data-slot="seo-page-list"]')!;
const check = (host: HTMLElement) => host.querySelector<HTMLElement>('[data-slot="seo-issue-checklist"]')!;
const rows = (host: HTMLElement) => [...list(host).querySelectorAll<HTMLElement>('[data-slot="table-row"][data-row]')];
const items = (host: HTMLElement) => [...check(host).querySelectorAll<HTMLElement>("li[data-severity]")];
const table = (host: HTMLElement) => list(host).querySelector('[data-slot="data-table"]')!;
const act = (host: HTMLElement, action: string, id: string) => table(host).dispatchEvent(new CustomEvent("nq-data-table-action", { bubbles: true, detail: { action, row: { id } } }));
const visible = (el: Element | null) => !!el && (el as HTMLElement).style.display !== "none";
const listData = (host: HTMLElement) => Alpine.$data(list(host)) as Record<string, any>;

describe("seo maths", () => {
  it("scores open issues by weight", () => {
    const issues = [
      { id: "a", code: "alt-missing", severity: "warning" as const },
      { id: "b", code: "title-missing", severity: "error" as const },
      { id: "c", code: "og-image-missing", severity: "info" as const, fixed: true },
    ];
    expect(seoScore(issues)).toBe(86);
    expect(scoreBand(95)).toBe("good");
    expect(scoreBand(60)).toBe("fair");
    expect(scoreBand(10)).toBe("poor");
    expect(issueCounts(issues)).toMatchObject({ error: 1, warning: 1, info: 0, total: 2 });
    expect(openIssues(issues)).toHaveLength(2);
    expect(sortIssues(issues).map((i) => i.id)).toEqual(["b", "a", "c"]);
    expect(siteScore([{ issues }, { issues: [] }])).toBe(93);
    expect(rateVital("LCP", 3000)).toBe("needs-improvement");
    expect(formatVital("LCP", 4200, "en")).toBe("4.2 s");
    expect(formatVital("INP", 120, "ar")).toBe("120 مللي ث");
  });
});

describe("Blade seo-pages list under Alpine", () => {
  it("lists the pages worst score first with counts, status and vitals", async () => {
    const host = await mountHtml(rendered("seo-pages"));
    const rs = rows(host);
    expect(rs).toHaveLength(3);
    expect(rs[0]!.textContent).toContain("https://nasaq.dev/draft");
    expect(rs[0]!.textContent).toContain("3 errors");
    expect(rs[0]!.textContent).toContain("Blocked");
    expect(rs[0]!.textContent).toContain("No field data");
    const pricing = rs[1]!;
    expect(pricing.textContent).toContain("Pricing");
    expect(pricing.textContent).toContain("2 warnings");
    expect(pricing.textContent).toContain("Not indexed");
    expect(pricing.textContent).toContain("LCP 3.1 s");
    expect(pricing.textContent).toContain("INP 240 ms");
    expect(pricing.querySelector('[data-band="good"]')).not.toBeNull();
    expect(pricing.querySelector('[role="meter"]')!.getAttribute("aria-valuenow")).toBe("92");
    expect(rs[2]!.textContent).toContain("1 notice");
    expect(rs[2]!.querySelector('[data-band="good"]')).not.toBeNull();
  });

  it("tones the vitals badges by rating", async () => {
    const host = await mountHtml(rendered("seo-pages"));
    const home = rows(host)[2]!;
    const badges = [...home.querySelectorAll<HTMLElement>('[data-slot="badge"]')].filter((b) => visible(b) && /LCP|INP|CLS/.test(b.textContent!));
    expect(badges).toHaveLength(3);
    expect(badges[0]!.title).toBe("LCP: good");
  });

  it("searches by URL or title", async () => {
    const host = await mountHtml(rendered("seo-pages"));
    const search = list(host).querySelector<HTMLInputElement>("input")!;
    search.value = "pricing";
    search.dispatchEvent(new Event("input", { bubbles: true }));
    await tick();
    expect(rows(host)).toHaveLength(1);
    search.value = "Arabic design";
    search.dispatchEvent(new Event("input", { bubbles: true }));
    await tick();
    expect(rows(host)).toHaveLength(1);
    expect(rows(host)[0]!.textContent).toContain("nasaq.dev/");
  });

  it("opens a page's issues from the row action and from a row click", async () => {
    const host = await mountHtml(rendered("seo-pages"));
    const seen: string[] = [];
    host.addEventListener("open-page", (e) => seen.push((e as CustomEvent).detail.url));
    act(host, "issues", "p2");
    table(host).dispatchEvent(new CustomEvent("nq-data-table-row-click", { bubbles: true, detail: { row: { id: "p3" } } }));
    expect(seen).toEqual(["https://nasaq.dev/pricing", "https://nasaq.dev/draft"]);
  });

  it("offers request indexing only to pages that can be indexed", async () => {
    const host = await mountHtml(rendered("seo-pages"));
    const actions = (id: string) => listData(host).tableRows.find((r: { id: string }) => r.id === id).actions;
    expect(actions("p1")).toEqual(["issues", "open", "recrawl"]);
    expect(actions("p2")).toEqual(["issues", "open", "recrawl", "index"]);
    expect(actions("p3")).toEqual(["issues", "open", "recrawl"]);
  });

  it("fires recrawl and request-indexing, and alerts on errors", async () => {
    const host = await mountHtml(rendered("seo-pages"));
    const seen: string[] = [];
    host.addEventListener("recrawl", (e) => {
      seen.push(`c:${(e as CustomEvent).detail.id}`);
      (e as CustomEvent).detail.wait(Promise.resolve({ error: "Crawler busy" }));
    });
    host.addEventListener("request-indexing", (e) => {
      seen.push(`i:${(e as CustomEvent).detail.id}`);
      (e as CustomEvent).detail.wait(Promise.reject(new Error("x")));
    });
    act(host, "recrawl", "p2");
    await tick();
    expect(listData(host).notice).toBe("Crawler busy");
    expect(visible(list(host).querySelector('p[role="alert"]'))).toBe(true);
    act(host, "index", "p2");
    await tick();
    expect(listData(host).notice).toBe("Could not complete this. Try again.");
    expect(seen).toEqual(["c:p2", "i:p2"]);
  });
});

describe("seo-pages busy rows and first paint", () => {
  it("disables a row action while it runs, and frees it afterwards", async () => {
    const host = await mountHtml(rendered("seo-pages"));
    let done!: () => void;
    host.addEventListener("recrawl", (e) => (e as CustomEvent).detail.wait(new Promise<void>((r) => (done = r))));
    const row = () => listData(host).tableRows.find((r: { id: string }) => r.id === "p2");
    expect(row().busyCrawl).toBe(false);
    act(host, "recrawl", "p2");
    await tick();
    expect(row().busyCrawl).toBe(true);
    expect(row().busyIndex).toBe(false);
    expect(listData(host).tableRows.filter((r: { busyCrawl: boolean }) => r.busyCrawl)).toHaveLength(1);
    done();
    await tick();
    expect(row().busyCrawl).toBe(false);
  });

  it("server-renders the checklist rows, score and count before Alpine starts", () => {
    const doc = document.createElement("div");
    doc.innerHTML = rendered("seo-pages");
    const card = doc.querySelector<HTMLElement>('[data-slot="seo-issue-checklist"]')!;
    const first = card.querySelector<HTMLElement>('[data-slot="seo-issue-initial"]')!;
    expect(first.querySelectorAll("li")).toHaveLength(2);
    expect(first.textContent).toContain("Images without alt text");
    expect(first.textContent).toContain("How to fix");
    expect(card.textContent).toContain("SEO score 92 of 100");
    expect(card.textContent).toContain("2 issues are open.");
  });

  it("drops the first paint list when Alpine takes over", async () => {
    const host = await mountHtml(rendered("seo-pages"));
    expect(check(host).querySelector('[data-slot="seo-issue-initial"]')).toBeNull();
    expect(items(host)).toHaveLength(2);
  });
});

describe("Blade seo-pages checklist under Alpine", () => {
  it("lists the issues with texts, score and open count", async () => {
    const host = await mountHtml(rendered("seo-pages"));
    const li = items(host);
    expect(li.map((i) => i.dataset.severity)).toEqual(["warning", "warning"]);
    expect(li[0]!.textContent).toContain("Images without alt text");
    expect(li[1]!.textContent).toContain("Missing meta description");
    expect(li[0]!.textContent).toContain("3 images have no alt text");
    expect(check(host).textContent).toContain("SEO score 92 of 100");
    expect(check(host).textContent).toContain("2 issues are open.");
    expect(check(host).querySelector('[role="meter"]')!.getAttribute("aria-valuenow")).toBe("92");
    expect(visible(check(host).querySelector('[data-slot="empty-state"]'))).toBe(false);
  });

  it("expands the fix hint", async () => {
    const host = await mountHtml(rendered("seo-pages"));
    const li = items(host)[0]!;
    const trigger = li.querySelector<HTMLElement>('[data-slot="collapsible-trigger"]')!;
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    trigger.click();
    await tick();
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(li.querySelector('[data-slot="collapsible-panel"]')!.textContent).toContain("Why it matters");
  });

  it("ticks an issue at once, reports it and re-sorts, then the score rises", async () => {
    const host = await mountHtml(rendered("seo-pages"));
    const seen: any[] = [];
    host.addEventListener("toggle-fixed", (e) => {
      const d = (e as CustomEvent).detail;
      seen.push({ id: d.issue.id, fixed: d.fixed });
      d.wait(Promise.resolve());
    });
    items(host)[0]!.querySelector<HTMLElement>('[role="checkbox"]')!.click();
    await tick();
    expect(seen).toHaveLength(1);
    expect(seen[0].fixed).toBe(true);
    expect(check(host).textContent).toContain("SEO score 96 of 100");
    expect(check(host).textContent).toContain("1 issue is open.");
    const li = items(host);
    expect(li[1]!.dataset.fixed).toBeDefined();
    expect(li[1]!.textContent).toContain("Fixed");
    expect(li[1]!.querySelector('[role="checkbox"]')!.getAttribute("aria-checked")).toBe("true");
  });

  it("goes back and alerts when the host refuses", async () => {
    const host = await mountHtml(rendered("seo-pages"));
    host.addEventListener("toggle-fixed", (e) => (e as CustomEvent).detail.wait(Promise.resolve({ error: "Nope" })));
    items(host)[0]!.querySelector<HTMLElement>('[role="checkbox"]')!.click();
    await tick();
    expect(check(host).textContent).toContain("Nope");
    expect(check(host).textContent).toContain("SEO score 92 of 100");
    expect(items(host).every((i) => i.dataset.fixed === undefined)).toBe(true);
  });

  it("alerts generically when nobody listens", async () => {
    const host = await mountHtml(rendered("seo-pages").replace(/x-on:toggle-fixed="[^"]*"/, ""));
    items(host)[0]!.querySelector<HTMLElement>('[role="checkbox"]')!.click();
    await tick();
    expect(check(host).textContent).toContain("Could not complete this. Try again.");
  });
});
