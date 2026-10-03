import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  NqGithubActivity,
  githubCommitTitle,
  githubIsActive,
  githubMatches,
  githubMergeActivity,
  githubShortSha,
  type GithubCommit,
  type GithubDeployment,
  type GithubPull,
  type GithubRun,
} from ".";

afterEach(() => {
  document.body.innerHTML = "";
  document.documentElement.lang = "en";
  document.documentElement.dir = "ltr";
});

const commits: GithubCommit[] = [
  { id: "4f2a91c0e7b3d58a1c6f", message: "fix(auth): keep the redirect\n\nbody", author: { login: "sara" }, date: "2026-09-29T07:40:00Z", branch: "main", checks: "success", href: "https://github.com/a/b/commit/4f2a91c" },
  { id: "9c1d77e2a40b6f3158d2", message: "feat(cart): gift note", author: { login: "khaled" }, date: "2026-09-28T16:05:00Z" },
];
const pulls: GithubPull[] = [
  { id: "p1", number: 48, title: "Post-login redirect", author: { login: "sara" }, state: "merged", createdAt: "2026-09-27T10:00:00Z", mergedAt: "2026-09-28T10:00:00Z", mergedBy: { login: "khaled" }, head: "fix/redirect", base: "main", labels: [{ name: "bug", hue: "red" }], comments: 2 },
  { id: "p2", number: 49, title: "Gift note", author: { login: "khaled" }, state: "open", createdAt: "2026-09-29T06:00:00Z", checks: "failure" },
];
const runs: GithubRun[] = [
  { id: "r1", name: "CI", number: 412, status: "failure", branch: "main", event: "push", startedAt: "2026-09-29T07:41:00Z", durationMs: 184000 },
  { id: "r2", name: "Deploy", status: "in_progress", startedAt: "2026-09-29T08:00:00Z" },
];
const deployments: GithubDeployment[] = [{ id: "d1", environment: "production", status: "success", ref: "main", createdAt: "2026-09-29T07:50:00Z", url: "https://shop.example.com" }];
const repo = { owner: "acme", name: "storefront", href: "https://github.com/acme/storefront" };

const mountIt = (props: Record<string, unknown> = {}) => mount(NqGithubActivity, { props: { repo, commits, pulls, runs, deployments, ...props }, attachTo: document.body });
const tab = (w: ReturnType<typeof mountIt>, name: string) => w.findAll('[data-slot="tabs-tab"]').find((t) => t.text().startsWith(name))!;
const open = async (w: ReturnType<typeof mountIt>, name: string) => {
  await tab(w, name).trigger("mousedown", { button: 0 });
  await flushPromises();
};

describe("helpers", () => {
  it("shortens, titles, matches and merges", () => {
    expect(githubShortSha("4f2a91c0e7b3")).toBe("4f2a91c");
    expect(githubCommitTitle("a\n\nb")).toBe("a");
    expect(githubMatches("  KHA ", "khaled")).toBe(true);
    expect(githubMatches("zz", "khaled", null)).toBe(false);
    expect(githubIsActive("queued")).toBe(true);
    expect(githubMergeActivity([{ kind: "commit", items: commits, time: (c) => c.date }]).map((e) => e.id)).toEqual([commits[0]!.id, commits[1]!.id]);
  });
});

describe("NqGithubActivity", () => {
  it("renders the card, repo link and one tab per feed plus Activity", () => {
    const w = mountIt();
    expect(w.attributes("data-slot")).toBe("github-activity");
    expect(w.find('[data-slot="github-mark"] svg').exists()).toBe(true);
    const link = w.find('a[aria-label="Open on GitHub: acme/storefront"]');
    expect(link.attributes("href")).toBe("https://github.com/acme/storefront");
    expect(link.attributes("target")).toBe("_blank");
    expect(link.attributes("rel")).toBe("noopener noreferrer");
    expect(w.findAll('[data-slot="tabs-tab"]').map((t) => t.text().replace(/\d+$/, "").trim())).toEqual(["Activity", "Commits", "Pull requests", "Workflow runs", "Deployments"]);
    expect(tab(w, "Activity").attributes("data-active")).toBe("");
    expect(w.find('[data-slot="timeline"]').exists()).toBe(true);
    expect(w.findAll('[data-slot="timeline-item"]')).toHaveLength(7);
  });

  it("shows only the given feed without an Activity tab", () => {
    const w = mountIt({ pulls: undefined, runs: undefined, deployments: undefined });
    expect(w.findAll('[data-slot="tabs-tab"]')).toHaveLength(1);
    expect(w.findAll('[data-slot="github-commit"]')).toHaveLength(2);
  });

  it("honours defaultTab and lists commits", async () => {
    const w = mountIt({ defaultTab: "commits" });
    expect(tab(w, "Commits").attributes("data-active")).toBe("");
    const rows = w.findAll('[data-slot="github-commit"]');
    expect(rows[0]!.text()).toContain("fix(auth): keep the redirect");
    expect(rows[0]!.text()).not.toContain("body");
    expect(rows[0]!.text()).toContain("sara committed");
    expect(rows[0]!.text()).toContain("Checks passed");
    expect(rows[0]!.find("code").text()).toBe("4f2a91c");
    expect(rows[0]!.find("code").attributes("dir")).toBe("ltr");
  });

  it("shows pull request state, labels, merge info and branches", async () => {
    const w = mountIt({ defaultTab: "pulls" });
    const [merged, openPr] = w.findAll('[data-slot="github-pull"]');
    expect(merged!.attributes("data-state")).toBe("merged");
    expect(merged!.text()).toContain("Merged");
    expect(merged!.text()).toContain("merged by khaled");
    expect(merged!.text()).toContain("#48");
    expect(merged!.text()).toContain("fix/redirect → main");
    expect(merged!.text()).toContain("2 comments");
    expect(merged!.find('[data-slot="badge"][style]').exists()).toBe(true);
    expect(openPr!.attributes("data-state")).toBe("open");
    expect(openPr!.text()).toContain("Checks failed");
  });

  it("lists runs with status and duration; Re-run only on finished runs", async () => {
    const onRerun = vi.fn(async () => undefined);
    const w = mountIt({ defaultTab: "runs", onRerun });
    const [failed, running] = w.findAll('[data-slot="github-run"]');
    expect(failed!.attributes("data-status")).toBe("failure");
    expect(failed!.text()).toContain("Failed");
    expect(failed!.text()).toContain("3m 04s");
    expect(failed!.text()).toContain("#412");
    expect(running!.find("button").exists()).toBe(false);
    await failed!.find("button").trigger("click");
    await flushPromises();
    expect(onRerun).toHaveBeenCalledWith("r1");
  });

  it("shows an error message returned by Re-run in a role=alert", async () => {
    const w = mountIt({ defaultTab: "runs", onRerun: async () => ({ error: "Workflow is disabled" }) });
    await w.find('[data-slot="github-run"] button').trigger("click");
    await flushPromises();
    const alert = w.find('[role="alert"]');
    expect(alert.text()).toContain("Workflow is disabled");
    await alert.find("button").trigger("click");
    expect(w.find('[role="alert"]').exists()).toBe(false);
  });

  it("falls back to a generic error when Refresh throws, and shows its busy state", async () => {
    let reject!: () => void;
    const onRefresh = vi.fn(() => new Promise<void>((_, r) => (reject = r)));
    const w = mountIt({ onRefresh });
    const btn = w.findAll("button").find((b) => b.text().includes("Refresh"))!;
    await btn.trigger("click");
    expect(btn.attributes("aria-busy")).toBe("true");
    reject();
    await flushPromises();
    expect(w.find('[role="alert"]').text()).toContain("Something went wrong. Try again.");
    expect(btn.attributes("aria-busy")).toBeUndefined();
  });

  it("shows Deploy only when onDeploy is given and calls it", async () => {
    expect(mountIt().findAll("button").some((b) => b.text() === "Deploy")).toBe(false);
    const onDeploy = vi.fn(async () => undefined);
    const w = mountIt({ onDeploy });
    await w.findAll("button").find((b) => b.text() === "Deploy")!.trigger("click");
    await flushPromises();
    expect(onDeploy).toHaveBeenCalledOnce();
  });

  it("filters every list and shows a no-match state", async () => {
    const w = mountIt({ defaultTab: "commits" });
    await w.find('input[type="search"]').setValue("khaled");
    expect(w.findAll('[data-slot="github-commit"]')).toHaveLength(1);
    await w.find('input[type="search"]').setValue("nothing-like-this");
    expect(w.text()).toContain("No matches");
    expect(w.find('[data-slot="empty-state"]').exists()).toBe(true);
    await w.find('input[type="search"]').setValue("");
    expect(w.findAll('[data-slot="github-commit"]')).toHaveLength(2);
  });

  it("hideSearch removes the filter box", () => {
    expect(mountIt({ hideSearch: true }).find('input[type="search"]').exists()).toBe(false);
  });

  it("lists deployments with the site link", async () => {
    const w = mountIt({ defaultTab: "deployments" });
    const row = w.find('[data-slot="github-deployment"]');
    expect(row.attributes("data-status")).toBe("success");
    expect(row.text()).toContain("Live");
    expect(row.text()).toContain("production");
    expect(row.find('a[href="https://shop.example.com"]').text()).toContain("Open site");
  });

  it("shows a loading skeleton and an empty state", () => {
    const loading = mountIt({ loading: true });
    expect(loading.find('[role="status"]').attributes("aria-label")).toBe("Loading activity");
    expect(loading.findAll('[data-slot="skeleton"]')).toHaveLength(5);
    const empty = mountIt({ commits: undefined, pulls: undefined, runs: undefined, deployments: undefined });
    expect(empty.text()).toContain("Nothing here yet");
  });

  it("switches tabs by click", async () => {
    const w = mountIt();
    await open(w, "Commits");
    expect(tab(w, "Commits").attributes("data-active")).toBe("");
    expect(w.findAll('[data-slot="github-commit"]')).toHaveLength(2);
  });

  it("is Arabic and keeps SHAs, refs and numbers left to right", () => {
    document.documentElement.lang = "ar";
    document.documentElement.dir = "rtl";
    const w = mountIt({ defaultTab: "pulls", onRefresh: async () => undefined });
    expect(w.text()).toContain("نشاط GitHub");
    expect(w.text()).toContain("تحديث");
    expect(w.text()).toContain("دمجه khaled");
    expect(w.text()).toContain("تعليقان");
    expect(w.find('[data-slot="github-pull"] span[dir="ltr"]').text()).toBe("#48");
  });

  it("merges class and data-slot overrides onto the card", () => {
    const w = mountIt({ class: "max-w-2xl", "data-slot": "repo-card" });
    expect(w.attributes("data-slot")).toBe("repo-card");
    expect(w.classes()).toContain("max-w-2xl");
    expect(w.classes()).not.toContain("max-w-5xl");
  });
});
