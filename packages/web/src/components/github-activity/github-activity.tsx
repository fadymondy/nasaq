"use client";

import {
  CircleCheck,
  CircleDashed,
  CircleSlash,
  CircleX,
  ExternalLink,
  GitBranch,
  GitCommitHorizontal,
  GitMerge,
  GitPullRequest,
  GitPullRequestClosed,
  GitPullRequestDraft,
  type LucideIcon,
  MessageSquare,
  Play,
  RefreshCw,
  Rocket,
  Search,
} from "lucide-react";
import { type ComponentProps, type ReactNode, useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Alert } from "../alert";
import { Avatar } from "../avatar";
import { Badge } from "../badge";
import { Button } from "../button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../card";
import { formatDuration } from "../deploy-view";
import { Input } from "../field";
import { DateTime, Num } from "../numeric";
import { GitHubLogo } from "../oauth-buttons";
import { EmptyState, Skeleton } from "../states";
import { Status, type StatusTone } from "../status";
import { Tabs, TabsList, TabsPanel, TabsTab } from "../tabs";
import { Timeline, TimelineItem } from "../timeline";
import {
  type ActivityKind,
  type ActivityTone,
  commitTitle,
  type DateLike,
  type DeploymentStatus,
  deploymentTone,
  isActive,
  matches,
  mergeActivity,
  type PullState,
  pullTone,
  type RunStatus,
  runTone,
  shortSha,
} from "./github-activity-format";

export {
  type ActivityKind,
  type ActivityTone,
  commitBody,
  commitTitle,
  countBy,
  type DeploymentStatus,
  deploymentTone,
  isActive,
  matches,
  mergeActivity,
  type PullState,
  pullTone,
  type RunStatus,
  runTone,
  shortSha,
} from "./github-activity-format";

const STRINGS = {
  en: {
    title: "GitHub activity",
    description: "Commits, pull requests, workflow runs and deployments for this repository.",
    openOnGithub: "Open on GitHub",
    refresh: "Refresh",
    deploy: "Deploy",
    search: "Filter by title, author or branch",
    tabs: { activity: "Activity", commits: "Commits", pulls: "Pull requests", runs: "Workflow runs", deployments: "Deployments" },
    emptyTitle: "Nothing here yet",
    emptyBody: "New activity shows up as soon as GitHub reports it.",
    noMatchTitle: "No matches",
    noMatchBody: "Nothing matches that filter. Clear it to see everything.",
    committed: (who: string) => `${who} committed`,
    openedBy: (who: string) => `opened by ${who}`,
    mergedBy: (who: string) => `merged by ${who}`,
    startedBy: (who: string) => `started by ${who}`,
    deployedBy: (who: string) => `deployed by ${who}`,
    comments: (n: number) => (n === 1 ? "1 comment" : `${n} comments`),
    pullState: { open: "Open", draft: "Draft", merged: "Merged", closed: "Closed" } satisfies Record<PullState, string>,
    runStatus: {
      queued: "Queued",
      in_progress: "Running",
      success: "Passed",
      failure: "Failed",
      cancelled: "Cancelled",
      skipped: "Skipped",
    } satisfies Record<RunStatus, string>,
    deploymentStatus: {
      pending: "Pending",
      in_progress: "Deploying",
      success: "Live",
      failure: "Failed",
      inactive: "Replaced",
    } satisfies Record<DeploymentStatus, string>,
    checks: { success: "Checks passed", failure: "Checks failed", pending: "Checks running" },
    rerun: "Re-run",
    rerunFor: (name: string) => `Re-run ${name}`,
    viewSite: "Open site",
    duration: { ms: "ms", s: "s", m: "m", h: "h" },
    kind: { commit: "Commit", pull: "Pull request", run: "Workflow run", deployment: "Deployment" } satisfies Record<ActivityKind, string>,
    genericError: "Something went wrong. Try again.",
    loading: "Loading activity",
  },
  ar: {
    title: "نشاط GitHub",
    description: "الإيداعات وطلبات الدمج وتشغيلات سير العمل وعمليات النشر لهذا المستودع.",
    openOnGithub: "افتح على GitHub",
    refresh: "تحديث",
    deploy: "نشر",
    search: "تصفية بالعنوان أو المؤلف أو الفرع",
    tabs: { activity: "النشاط", commits: "الإيداعات", pulls: "طلبات الدمج", runs: "تشغيلات سير العمل", deployments: "عمليات النشر" },
    emptyTitle: "لا يوجد شيء بعد",
    emptyBody: "يظهر النشاط الجديد فور أن يبلّغ عنه GitHub.",
    noMatchTitle: "لا نتائج",
    noMatchBody: "لا شيء يطابق هذه التصفية. امسحها لرؤية كل شيء.",
    committed: (who: string) => `أودع ${who}`,
    openedBy: (who: string) => `فتحه ${who}`,
    mergedBy: (who: string) => `دمجه ${who}`,
    startedBy: (who: string) => `بدأه ${who}`,
    deployedBy: (who: string) => `نشره ${who}`,
    comments: (n: number) => (n === 1 ? "تعليق واحد" : n === 2 ? "تعليقان" : `${n} تعليقات`),
    pullState: { open: "مفتوح", draft: "مسودة", merged: "مدموج", closed: "مغلق" } satisfies Record<PullState, string>,
    runStatus: {
      queued: "في الانتظار",
      in_progress: "قيد التشغيل",
      success: "نجح",
      failure: "فشل",
      cancelled: "أُلغي",
      skipped: "تم تخطيه",
    } satisfies Record<RunStatus, string>,
    deploymentStatus: {
      pending: "معلّق",
      in_progress: "قيد النشر",
      success: "مباشر",
      failure: "فشل",
      inactive: "استُبدل",
    } satisfies Record<DeploymentStatus, string>,
    checks: { success: "نجحت الفحوصات", failure: "فشلت الفحوصات", pending: "الفحوصات قيد التشغيل" },
    rerun: "إعادة التشغيل",
    rerunFor: (name: string) => `إعادة تشغيل ${name}`,
    viewSite: "افتح الموقع",
    duration: { ms: "ملي ث", s: "ث", m: "د", h: "س" },
    kind: { commit: "إيداع", pull: "طلب دمج", run: "تشغيل سير عمل", deployment: "نشر" } satisfies Record<ActivityKind, string>,
    genericError: "حدث خطأ ما. حاول مرة أخرى.",
    loading: "جارٍ تحميل النشاط",
  },
};

export type GithubActivityLabels = (typeof STRINGS)["en"];

export interface GithubActor {
  login: string;
  avatar?: string;
  href?: string;
}

export interface GithubCommit {
  /** The full sha. */
  id: string;
  /** The whole message; the first line is the title. */
  message: string;
  author: GithubActor;
  date: DateLike;
  href?: string;
  branch?: string;
  /** CI state of this commit, when known. */
  checks?: "success" | "failure" | "pending";
}

export interface GithubLabel {
  name: string;
  hue?: ComponentProps<typeof Badge>["hue"];
}

export interface GithubPull {
  /** Any stable id; the number is what people read. */
  id: string;
  number: number;
  title: string;
  author: GithubActor;
  state: PullState;
  createdAt: DateLike;
  mergedAt?: DateLike | null;
  mergedBy?: GithubActor;
  href?: string;
  /** Source branch. */
  head?: string;
  /** Target branch. */
  base?: string;
  labels?: readonly GithubLabel[];
  checks?: "success" | "failure" | "pending";
  comments?: number;
}

export interface GithubRun {
  id: string;
  name: string;
  /** The run number in the workflow, shown as "hash 412". */
  number?: number;
  status: RunStatus;
  branch?: string;
  sha?: string;
  /** The trigger: `push`, `pull_request`, `schedule`, `workflow_dispatch`. */
  event?: string;
  actor?: GithubActor;
  startedAt: DateLike;
  durationMs?: number;
  href?: string;
}

export interface GithubDeployment {
  id: string;
  environment: string;
  status: DeploymentStatus;
  /** Branch or tag that was deployed. */
  ref: string;
  sha?: string;
  creator?: GithubActor;
  createdAt: DateLike;
  /** The deployed site. */
  url?: string;
  href?: string;
}

export interface GithubRepo {
  owner: string;
  name: string;
  href?: string;
}

type FeedId = "commits" | "pulls" | "runs" | "deployments";

export interface GithubActivityProps extends Omit<ComponentProps<"div">, "children"> {
  repo: GithubRepo;
  commits?: readonly GithubCommit[];
  pulls?: readonly GithubPull[];
  runs?: readonly GithubRun[];
  deployments?: readonly GithubDeployment[];
  /** The tab shown first. Default: `activity` (the merged timeline) when more than one feed is given, else the only feed. */
  defaultTab?: "activity" | FeedId;
  loading?: boolean;
  /** Reload the feeds. Shows a Refresh button. */
  onRefresh?: () => Promise<void | { error?: string }>;
  /** Start a deploy. Shows a Deploy button. */
  onDeploy?: () => Promise<void | { error?: string }>;
  /** Run a workflow again. Shows Re-run on finished runs. */
  onRerun?: (runId: string) => Promise<void | { error?: string }>;
  /** Hide the filter box. Default false. */
  hideSearch?: boolean;
  /** Override any string. Defaults to English or Arabic by the Nasaq locale. */
  labels?: Partial<GithubActivityLabels>;
}

const toneStatus: Record<ActivityTone, StatusTone> = { neutral: "neutral", info: "info", success: "success", warning: "warning", danger: "danger" };
const runIcon: Record<RunStatus, LucideIcon> = {
  queued: CircleDashed,
  in_progress: RefreshCw,
  success: CircleCheck,
  failure: CircleX,
  cancelled: CircleSlash,
  skipped: CircleSlash,
};
const pullIcon: Record<PullState, LucideIcon> = { open: GitPullRequest, draft: GitPullRequestDraft, merged: GitMerge, closed: GitPullRequestClosed };
const toneText: Record<ActivityTone, string> = {
  neutral: "text-muted-foreground",
  info: "text-nq-info-text",
  success: "text-nq-success-text",
  warning: "text-nq-warning-text",
  danger: "text-nq-danger-text",
};
const pullBadge: Record<PullState, "success" | "neutral" | "info" | "danger"> = { open: "success", draft: "neutral", merged: "info", closed: "danger" };

/** A link when there is an `href`, plain text when not. Opens GitHub in a new tab. */
function Ref({ href, className, children, ...props }: ComponentProps<"a">) {
  return href ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn("rounded-sm outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus", className)}
      {...props}
    >
      {children}
    </a>
  ) : (
    <span className={className}>{children}</span>
  );
}

function Sha({ sha, href }: { sha: string; href?: string }) {
  return (
    <Ref href={href}>
      <code dir="ltr" className="rounded-sm bg-secondary px-1 py-0.5 font-mono text-code text-muted-foreground">
        {shortSha(sha)}
      </code>
    </Ref>
  );
}

function BranchName({ name }: { name: string }) {
  return (
    <span dir="ltr" className="inline-flex max-w-48 items-center gap-1 truncate font-mono text-code text-muted-foreground">
      <GitBranch aria-hidden className="size-3 shrink-0" />
      <bdi className="truncate">{name}</bdi>
    </span>
  );
}

const Row = ({ className, ...props }: ComponentProps<"li">) => (
  <li className={cn("flex items-start gap-3 border-t border-border px-4 py-3 first:border-t-0", className)} {...props} />
);

function ChecksStatus({ value, t }: { value: "success" | "failure" | "pending"; t: GithubActivityLabels }) {
  return <Status tone={value === "success" ? "success" : value === "failure" ? "danger" : "info"}>{t.checks[value]}</Status>;
}

function CommitRow({ c, t }: { c: GithubCommit; t: GithubActivityLabels }) {
  return (
    <Row data-slot="github-commit">
      <Avatar name={c.author.login} src={c.author.avatar} size="sm" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Ref href={c.href} className="text-label text-foreground" dir="auto">
          {commitTitle(c.message)}
        </Ref>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-foreground">
          <bdi>{t.committed(c.author.login)}</bdi>
          <DateTime value={c.date} relative />
          {c.branch ? <BranchName name={c.branch} /> : null}
          {c.checks ? <ChecksStatus value={c.checks} t={t} /> : null}
        </div>
      </div>
      <Sha sha={c.id} href={c.href} />
    </Row>
  );
}

function PullRow({ p, t }: { p: GithubPull; t: GithubActivityLabels }) {
  const Icon = pullIcon[p.state];
  const merged = p.state === "merged";
  return (
    <Row data-slot="github-pull" data-state={p.state}>
      <Icon aria-hidden className={cn("mt-0.5 size-4 shrink-0", toneText[pullTone[p.state]])} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Ref href={p.href} className="text-label text-foreground" dir="auto">
            {p.title}
          </Ref>
          <Badge variant={pullBadge[p.state]}>{t.pullState[p.state]}</Badge>
          {p.labels?.map((l) => (
            <Badge key={l.name} variant="tag" hue={l.hue ?? "gray"}>
              {l.name}
            </Badge>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-foreground">
          <span dir="ltr">#{p.number}</span>
          <bdi>{merged && p.mergedBy ? t.mergedBy(p.mergedBy.login) : t.openedBy(p.author.login)}</bdi>
          <DateTime value={merged && p.mergedAt ? p.mergedAt : p.createdAt} relative />
          {p.head ? (
            <span dir="ltr" className="font-mono text-code">
              {p.head}
              {p.base ? ` → ${p.base}` : ""}
            </span>
          ) : null}
          {p.checks ? <ChecksStatus value={p.checks} t={t} /> : null}
          {p.comments ? (
            <span className="inline-flex items-center gap-1">
              <MessageSquare aria-hidden className="size-3" />
              {t.comments(p.comments)}
            </span>
          ) : null}
        </div>
      </div>
      <Avatar name={p.author.login} src={p.author.avatar} size="sm" />
    </Row>
  );
}

function RunRow({ r, t, onRerun }: { r: GithubRun; t: GithubActivityLabels; onRerun?: (id: string) => Promise<void> }) {
  const Icon = runIcon[r.status];
  const tone = runTone[r.status];
  const [pending, setPending] = useState(false);
  return (
    <Row data-slot="github-run" data-status={r.status}>
      <Icon aria-hidden className={cn("mt-0.5 size-4 shrink-0", toneText[tone], r.status === "in_progress" && "motion-safe:animate-spin")} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Ref href={r.href} className="text-label text-foreground" dir="auto">
            {r.name}
          </Ref>
          {r.number != null ? (
            <span dir="ltr" className="text-caption text-muted-foreground">
              #{r.number}
            </span>
          ) : null}
          <Status tone={toneStatus[tone]}>{t.runStatus[r.status]}</Status>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-foreground">
          {r.branch ? <BranchName name={r.branch} /> : null}
          {r.sha ? <Sha sha={r.sha} /> : null}
          {r.event ? (
            <Badge variant="outline">
              <bdi dir="ltr">{r.event}</bdi>
            </Badge>
          ) : null}
          {r.actor ? <bdi>{t.startedBy(r.actor.login)}</bdi> : null}
          <DateTime value={r.startedAt} relative />
          {r.durationMs != null ? (
            <span dir="ltr" className="tabular-nums">
              {formatDuration(r.durationMs, t.duration)}
            </span>
          ) : null}
        </div>
      </div>
      {onRerun && !isActive(r.status) ? (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          loading={pending}
          aria-label={t.rerunFor(r.name)}
          onClick={async () => {
            setPending(true);
            try {
              await onRerun(r.id);
            } finally {
              setPending(false);
            }
          }}
        >
          <Play aria-hidden />
          {t.rerun}
        </Button>
      ) : null}
    </Row>
  );
}

function DeploymentRow({ d, t }: { d: GithubDeployment; t: GithubActivityLabels }) {
  const tone = deploymentTone[d.status];
  return (
    <Row data-slot="github-deployment" data-status={d.status}>
      <Rocket aria-hidden className={cn("mt-0.5 size-4 shrink-0", toneText[tone])} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Ref href={d.href} className="text-label text-foreground" dir="auto">
            {d.environment}
          </Ref>
          <Status tone={toneStatus[tone]}>{t.deploymentStatus[d.status]}</Status>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-foreground">
          <BranchName name={d.ref} />
          {d.sha ? <Sha sha={d.sha} /> : null}
          {d.creator ? <bdi>{t.deployedBy(d.creator.login)}</bdi> : null}
          <DateTime value={d.createdAt} relative />
        </div>
      </div>
      {d.url ? (
        <a
          href={d.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-sm text-caption text-muted-foreground outline-none hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus"
        >
          {t.viewSite}
          <ExternalLink aria-hidden className="size-3 rtl:-scale-x-100" />
        </a>
      ) : null}
    </Row>
  );
}

function Empty({ filtered, t }: { filtered: boolean; t: GithubActivityLabels }) {
  return <EmptyState icon={filtered ? Search : GitCommitHorizontal} title={filtered ? t.noMatchTitle : t.emptyTitle} description={filtered ? t.noMatchBody : t.emptyBody} />;
}

function List({ label, children, filtered, t }: { label: string; children: ReactNode[]; filtered: boolean; t: GithubActivityLabels }) {
  if (children.length === 0) return <Empty filtered={filtered} t={t} />;
  return (
    <ul aria-label={label} className="overflow-hidden rounded-card border border-border">
      {children}
    </ul>
  );
}

/**
 * A repository's recent life in one card: commits, pull requests, workflow runs and deployments, each as a
 * list with status, author, time and a link to GitHub, plus a merged timeline. Re-run and Deploy are async
 * callbacks. It is presentational: you fetch from the GitHub API (or your own backend) and pass the data.
 * The GitHub mark is the official one, in black or white by theme.
 */
export function GithubActivity({
  repo,
  commits,
  pulls,
  runs,
  deployments,
  defaultTab,
  loading = false,
  onRefresh,
  onDeploy,
  onRerun,
  hideSearch = false,
  labels,
  className,
  ...props
}: GithubActivityProps) {
  const nasaq = useOptionalNasaq();
  const ar = nasaq?.locale.startsWith("ar") ?? false;
  const dark = nasaq?.resolvedTheme === "dark";
  const t = { ...STRINGS[ar ? "ar" : "en"], ...labels };
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"refresh" | "deploy" | null>(null);

  const feeds = ([commits && "commits", pulls && "pulls", runs && "runs", deployments && "deployments"] as (FeedId | undefined)[]).filter(Boolean) as FeedId[];
  const tabs: ("activity" | FeedId)[] = feeds.length > 1 ? ["activity", ...feeds] : feeds;
  const first = defaultTab && tabs.includes(defaultTab) ? defaultTab : (tabs[0] ?? "activity");

  const fc = useMemo(() => (commits ?? []).filter((c) => matches(query, c.message, c.author.login, c.id, c.branch)), [commits, query]);
  const fp = useMemo(
    () => (pulls ?? []).filter((p) => matches(query, p.title, p.author.login, `#${p.number}`, p.head, p.base, ...(p.labels?.map((l) => l.name) ?? []))),
    [pulls, query],
  );
  const fr = useMemo(() => (runs ?? []).filter((r) => matches(query, r.name, r.branch, r.actor?.login, r.event, r.sha)), [runs, query]);
  const fd = useMemo(() => (deployments ?? []).filter((d) => matches(query, d.environment, d.ref, d.creator?.login, d.sha)), [deployments, query]);
  const merged = useMemo(
    () => [
      ...mergeActivity([{ kind: "commit", items: fc, time: (c) => c.date }]),
      ...mergeActivity([{ kind: "pull", items: fp, time: (p) => p.createdAt }]),
      ...mergeActivity([{ kind: "run", items: fr, time: (r) => r.startedAt }]),
      ...mergeActivity([{ kind: "deployment", items: fd, time: (d) => d.createdAt }]),
    ].sort((a, b) => b.time - a.time),
    [fc, fp, fr, fd],
  );

  async function act(kind: "refresh" | "deploy", fn?: () => Promise<void | { error?: string }>) {
    if (!fn) return;
    setError(null);
    setBusy(kind);
    try {
      const result = await fn();
      if (result?.error) setError(result.error);
    } catch {
      setError(t.genericError);
    } finally {
      setBusy(null);
    }
  }

  async function rerun(id: string) {
    setError(null);
    try {
      const result = await onRerun?.(id);
      if (result?.error) setError(result.error);
    } catch {
      setError(t.genericError);
    }
  }

  const filtered = query.trim() !== "";
  const repoName = `${repo.owner}/${repo.name}`;

  function timelineItem(e: (typeof merged)[number]) {
    const key = `${e.kind}-${e.id}`;
    if (e.kind === "commit") {
      const c = e.item as GithubCommit;
      return (
        <TimelineItem
          key={key}
          actor={{ name: c.author.login, ...(c.author.avatar ? { avatar: c.author.avatar } : {}) }}
          title={
            <Ref href={c.href} dir="auto">
              {commitTitle(c.message)}
            </Ref>
          }
          description={<bdi>{t.committed(c.author.login)}</bdi>}
          time={c.date}
        >
          <Badge variant="outline">{t.kind.commit}</Badge>
          <Sha sha={c.id} href={c.href} />
        </TimelineItem>
      );
    }
    if (e.kind === "pull") {
      const p = e.item as GithubPull;
      const Icon = pullIcon[p.state];
      return (
        <TimelineItem
          key={key}
          icon={<Icon aria-hidden className={toneText[pullTone[p.state]]} />}
          title={
            <Ref href={p.href} dir="auto">
              {p.title}
            </Ref>
          }
          description={<bdi>{t.openedBy(p.author.login)}</bdi>}
          time={p.createdAt}
        >
          <Badge variant="outline">{t.kind.pull}</Badge>
          <Badge variant={pullBadge[p.state]}>{t.pullState[p.state]}</Badge>
          <span dir="ltr" className="text-caption text-muted-foreground">
            #{p.number}
          </span>
        </TimelineItem>
      );
    }
    if (e.kind === "run") {
      const r = e.item as GithubRun;
      const Icon = runIcon[r.status];
      return (
        <TimelineItem
          key={key}
          icon={<Icon aria-hidden className={cn(toneText[runTone[r.status]], r.status === "in_progress" && "motion-safe:animate-spin")} />}
          title={
            <Ref href={r.href} dir="auto">
              {r.name}
            </Ref>
          }
          time={r.startedAt}
        >
          <Badge variant="outline">{t.kind.run}</Badge>
          <Status tone={toneStatus[runTone[r.status]]}>{t.runStatus[r.status]}</Status>
          {r.branch ? <BranchName name={r.branch} /> : null}
        </TimelineItem>
      );
    }
    const d = e.item as GithubDeployment;
    return (
      <TimelineItem
        key={key}
        icon={<Rocket aria-hidden className={toneText[deploymentTone[d.status]]} />}
        title={
          <Ref href={d.href} dir="auto">
            {d.environment}
          </Ref>
        }
        time={d.createdAt}
      >
        <Badge variant="outline">{t.kind.deployment}</Badge>
        <Status tone={toneStatus[deploymentTone[d.status]]}>{t.deploymentStatus[d.status]}</Status>
        <BranchName name={d.ref} />
      </TimelineItem>
    );
  }

  const counts: Record<FeedId, number | undefined> = { commits: commits?.length, pulls: pulls?.length, runs: runs?.length, deployments: deployments?.length };

  return (
    <Card data-slot="github-activity" className={cn("w-full max-w-5xl", className)} {...props}>
      <CardHeader className="sm:flex sm:items-start sm:justify-between sm:gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span data-slot="github-mark" className="mt-0.5 shrink-0">
            <GitHubLogo onDark={dark} width={28} height={28} />
          </span>
          <div className="flex min-w-0 flex-col gap-1.5">
            <CardTitle as="h2">{t.title}</CardTitle>
            <CardDescription>{t.description}</CardDescription>
            <Ref href={repo.href} className="w-fit text-label text-foreground" aria-label={`${t.openOnGithub}: ${repoName}`}>
              <bdi dir="ltr" className="font-mono text-code">
                {repoName}
              </bdi>
            </Ref>
          </div>
        </div>
        <div className="mt-3 flex shrink-0 flex-wrap gap-2 sm:mt-0">
          {onRefresh ? (
            <Button type="button" variant="secondary" loading={busy === "refresh"} disabled={busy !== null} onClick={() => act("refresh", onRefresh)}>
              <RefreshCw aria-hidden />
              {t.refresh}
            </Button>
          ) : null}
          {onDeploy ? (
            <Button type="button" variant="primary" loading={busy === "deploy"} disabled={busy !== null} onClick={() => act("deploy", onDeploy)}>
              <Rocket aria-hidden />
              {t.deploy}
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {error ? (
          <Alert tone="danger" onDismiss={() => setError(null)}>
            {error}
          </Alert>
        ) : null}
        {loading ? (
          <div role="status" aria-label={t.loading} className="flex flex-col gap-3">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : tabs.length === 0 ? (
          <EmptyState icon={GitCommitHorizontal} title={t.emptyTitle} description={t.emptyBody} />
        ) : (
          <Tabs defaultValue={first}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <TabsList variant="underline">
                {tabs.map((id) => (
                  <TabsTab key={id} value={id}>
                    {t.tabs[id]}
                    {id !== "activity" && counts[id] != null ? (
                      <Badge variant="neutral">
                        <Num value={counts[id] as number} />
                      </Badge>
                    ) : null}
                  </TabsTab>
                ))}
              </TabsList>
              {hideSearch ? null : (
                <div className="relative w-full sm:w-64">
                  <Search aria-hidden className="pointer-events-none absolute inset-y-0 start-2.5 my-auto size-4 text-muted-foreground" />
                  <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.search} aria-label={t.search} className="ps-8" />
                </div>
              )}
            </div>
            {tabs.includes("activity") ? (
              <TabsPanel value="activity">
                {merged.length === 0 ? <Empty filtered={filtered} t={t} /> : <Timeline aria-label={t.tabs.activity}>{merged.map(timelineItem)}</Timeline>}
              </TabsPanel>
            ) : null}
            {commits ? (
              <TabsPanel value="commits">
                <List label={t.tabs.commits} filtered={filtered} t={t}>
                  {fc.map((c) => (
                    <CommitRow key={c.id} c={c} t={t} />
                  ))}
                </List>
              </TabsPanel>
            ) : null}
            {pulls ? (
              <TabsPanel value="pulls">
                <List label={t.tabs.pulls} filtered={filtered} t={t}>
                  {fp.map((p) => (
                    <PullRow key={p.id} p={p} t={t} />
                  ))}
                </List>
              </TabsPanel>
            ) : null}
            {runs ? (
              <TabsPanel value="runs">
                <List label={t.tabs.runs} filtered={filtered} t={t}>
                  {fr.map((r) => (
                    <RunRow key={r.id} r={r} t={t} {...(onRerun ? { onRerun: rerun } : {})} />
                  ))}
                </List>
              </TabsPanel>
            ) : null}
            {deployments ? (
              <TabsPanel value="deployments">
                <List label={t.tabs.deployments} filtered={filtered} t={t}>
                  {fd.map((d) => (
                    <DeploymentRow key={d.id} d={d} t={t} />
                  ))}
                </List>
              </TabsPanel>
            ) : null}
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
