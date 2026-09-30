"use client";

import { Check, ChevronsUpDown, GitBranch, Lock, RotateCw, Search, Settings2, ShieldCheck, Star } from "lucide-react";
import { type KeyboardEvent, useCallback, useEffect, useId, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Avatar } from "../avatar";
import { Badge } from "../badge";
import { Button } from "../button";
import { Input } from "../field";
import { DateTime, formatNumber } from "../numeric";
import { GitHubLogo } from "../oauth-buttons/oauth-logos";
import { Popover, PopoverContent, PopoverTrigger } from "../popover";
import { Skeleton } from "../states";
import { filterBranches, moveIndex, pickDefaultBranch, sortBranches, splitFullName } from "./repository-picker-format";


/* ------------------------------------------------------------------ strings */

const STRINGS = {
  en: {
    repository: "Repository",
    branch: "Branch",
    pickRepository: "Choose a repository",
    pickBranch: "Choose a branch",
    searchRepositories: "Search repositories",
    searchBranches: "Filter branches",
    noRepositories: "No repositories match",
    noRepositoriesHint: "Check the spelling, or give the GitHub app access to more repositories.",
    noBranches: "No branches match",
    private: "Private",
    default: "Default",
    protected: "Protected",
    updated: "Updated",
    loading: "Loading",
    failed: "Could not load. Check your connection.",
    retry: "Try again",
    connectedAs: (login: string) => `Through the GitHub app on ${login}`,
    configure: "Configure access",
    branchesLoading: "Loading branches",
    results: (n: string) => `${n} results`,
    chooseRepoFirst: "Choose a repository first",
  },
  ar: {
    repository: "المستودع",
    branch: "الفرع",
    pickRepository: "اختر مستودعًا",
    pickBranch: "اختر فرعًا",
    searchRepositories: "ابحث في المستودعات",
    searchBranches: "صفِّ الفروع",
    noRepositories: "لا مستودعات مطابقة",
    noRepositoriesHint: "تحقق من الكتابة، أو امنح تطبيق GitHub صلاحية على مستودعات أكثر.",
    noBranches: "لا فروع مطابقة",
    private: "خاص",
    default: "الافتراضي",
    protected: "محمي",
    updated: "حُدّث",
    loading: "جارٍ التحميل",
    failed: "تعذّر التحميل. تحقق من اتصالك.",
    retry: "حاول مرة أخرى",
    connectedAs: (login: string) => `عبر تطبيق GitHub على ${login}`,
    configure: "ضبط الصلاحيات",
    branchesLoading: "جارٍ تحميل الفروع",
    results: (n: string) => `${n} نتيجة`,
    chooseRepoFirst: "اختر مستودعًا أولًا",
  },
};
export type RepositoryPickerLabels = typeof STRINGS.en;

/* ------------------------------------------------------------------ types */

export interface PickerRepo {
  id: string;
  /** `owner/name`. Shown left-to-right. */
  fullName: string;
  description?: string;
  private?: boolean;
  language?: string;
  defaultBranch?: string;
  stars?: number;
  updatedAt?: Date | number | string;
}

export interface PickerBranch {
  name: string;
  default?: boolean;
  protected?: boolean;
}

/** The GitHub app installation the picker searches through. */
export interface PickerAccount {
  login: string;
  avatar?: string;
}

export interface RepositoryPickerValue {
  repo: PickerRepo | null;
  /** Branch name. Chosen for you (the default branch) when a repository is picked. */
  branch: string | null;
}

export interface RepositoryPickerProps {
  /** Controlled value. */
  value?: RepositoryPickerValue;
  defaultValue?: RepositoryPickerValue;
  onChange?: (value: RepositoryPickerValue) => void;
  /** Search the repositories the installation can see. Called with an empty query when the list opens. */
  searchRepositories: (query: string) => Promise<PickerRepo[]>;
  /** The branches of a repository. */
  loadBranches: (repo: PickerRepo) => Promise<PickerBranch[]>;
  /** Who the app is installed on; shown in the footer with `onConfigure`. */
  account?: PickerAccount;
  /** Opens GitHub's settings for the installation ("Configure access"). */
  onConfigure?: () => void;
  disabled?: boolean;
  /** Hide the branch field (repository only). */
  hideBranch?: boolean;
  className?: string;
  labels?: Partial<RepositoryPickerLabels>;
}

/* ------------------------------------------------------------------ list */

interface Option {
  key: string;
  selected: boolean;
  content: React.ReactNode;
  onPick: () => void;
}

/** Search box plus a listbox, driven from the keyboard (arrows, Enter) with focus staying in the box. */
function PickerList({
  search,
  onSearch,
  placeholder,
  options,
  status,
  emptyTitle,
  emptyHint,
  onRetry,
  footer,
  t,
  num,
}: {
  search: string;
  onSearch: (v: string) => void;
  placeholder: string;
  options: Option[];
  status: "loading" | "ready" | "error";
  emptyTitle: string;
  emptyHint?: string;
  onRetry: () => void;
  footer?: React.ReactNode;
  t: RepositoryPickerLabels;
  num: (n: number) => string;
}) {
  const id = useId();
  const [active, setActive] = useState(-1);
  const listRef = useRef<HTMLUListElement>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: a new result set restarts the highlight
  useEffect(() => setActive(options.length && search ? 0 : -1), [search, options.length]);
  useEffect(() => {
    if (active >= 0) listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => moveIndex(a, e.key === "ArrowDown" ? 1 : -1, options.length));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      options[active]?.onPick();
    }
  }

  return (
    <div className="flex min-w-0 flex-col">
      <div className="relative p-2">
        <Search aria-hidden className="pointer-events-none absolute start-4.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus
          type="search"
          role="combobox"
          aria-expanded
          aria-controls={`${id}-list`}
          aria-activedescendant={active >= 0 ? `${id}-${active}` : undefined}
          aria-label={placeholder}
          placeholder={placeholder}
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          onKeyDown={onKeyDown}
          className="ps-8"
        />
      </div>
      <p className="sr-only" role="status">
        {status === "loading" ? t.loading : status === "ready" ? t.results(num(options.length)) : t.failed}
      </p>
      <div className="max-h-72 overflow-y-auto border-t border-border">
        {status === "loading" && options.length === 0 ? (
          <div className="flex flex-col gap-2 p-3" aria-hidden>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : status === "error" ? (
          <div className="flex flex-col items-start gap-2 p-4 text-body-sm text-muted-foreground">
            <p>{t.failed}</p>
            <Button size="sm" variant="secondary" onClick={onRetry}>
              <RotateCw aria-hidden />
              {t.retry}
            </Button>
          </div>
        ) : options.length === 0 ? (
          <div className="p-4 text-body-sm">
            <p className="text-label text-foreground">{emptyTitle}</p>
            {emptyHint ? <p className="mt-1 text-muted-foreground">{emptyHint}</p> : null}
          </div>
        ) : (
          <ul ref={listRef} id={`${id}-list`} role="listbox" aria-label={placeholder} className={cn("flex flex-col p-1", status === "loading" && "opacity-60")}>
            {options.map((o, i) => (
              // biome-ignore lint/a11y/useKeyWithClickEvents: keyboard is handled by the search box (arrows + Enter)
              <li
                key={o.key}
                id={`${id}-${i}`}
                role="option"
                aria-selected={o.selected}
                data-active={i === active ? "true" : undefined}
                onClick={o.onPick}
                onMouseMove={() => setActive(i)}
                className={cn("flex cursor-pointer items-start gap-2 rounded-control px-2 py-1.5", i === active && "bg-nq-hover")}
              >
                <span className="min-w-0 flex-1">{o.content}</span>
                {o.selected ? <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" /> : null}
              </li>
            ))}
          </ul>
        )}
      </div>
      {footer}
    </div>
  );
}

/* ------------------------------------------------------------------ picker */

/**
 * Pick a GitHub repository and a branch through the app installation. The repository list is searched on the
 * server as you type (pass `searchRepositories`); choosing one loads its branches and selects the default. It calls
 * no API itself.
 */
export function RepositoryPicker({ value, defaultValue, onChange, searchRepositories, loadBranches, account, onConfigure, disabled, hideBranch, className, labels }: RepositoryPickerProps) {
  const nasaq = useOptionalNasaq();
  const locale = nasaq?.locale ?? "en";
  const dark = nasaq?.resolvedTheme === "dark";
  const ar = locale.startsWith("ar");
  const t = { ...STRINGS[ar ? "ar" : "en"], ...labels } as RepositoryPickerLabels;
  const num = (n: number) => formatNumber(n, locale);

  const [inner, setInner] = useState<RepositoryPickerValue>(defaultValue ?? { repo: null, branch: null });
  const current = value ?? inner;
  const commit = (next: RepositoryPickerValue) => {
    if (value === undefined) setInner(next);
    onChange?.(next);
  };

  /* repositories */
  const [repoOpen, setRepoOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [repos, setRepos] = useState<PickerRepo[]>([]);
  const [repoStatus, setRepoStatus] = useState<"loading" | "ready" | "error">("loading");
  const [retry, setRetry] = useState(0);
  const searchRef = useRef(searchRepositories);
  searchRef.current = searchRepositories;
  // biome-ignore lint/correctness/useExhaustiveDependencies: `retry` re-runs the search on demand
  useEffect(() => {
    if (!repoOpen) return;
    let stale = false;
    setRepoStatus("loading");
    const timer = setTimeout(
      () => {
        searchRef.current(query).then(
          (list) => {
            if (stale) return;
            setRepos(list);
            setRepoStatus("ready");
          },
          () => !stale && setRepoStatus("error"),
        );
      },
      query ? 250 : 0,
    );
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [repoOpen, query, retry]);

  /* branches */
  const [branchOpen, setBranchOpen] = useState(false);
  const [branchQuery, setBranchQuery] = useState("");
  const [branches, setBranches] = useState<PickerBranch[]>([]);
  const [branchStatus, setBranchStatus] = useState<"loading" | "ready" | "error">("loading");
  const [branchRetry, setBranchRetry] = useState(0);
  const loadRef = useRef(loadBranches);
  loadRef.current = loadBranches;
  const repoId = current.repo?.id;
  const repoRef = useRef(current.repo);
  repoRef.current = current.repo;
  const branchRef = useRef(current.branch);
  branchRef.current = current.branch;
  const commitRef = useRef(commit);
  commitRef.current = commit;
  // biome-ignore lint/correctness/useExhaustiveDependencies: `branchRetry` re-runs the load on demand
  useEffect(() => {
    const repo = repoRef.current;
    if (!repo || hideBranch) {
      setBranches([]);
      return;
    }
    let stale = false;
    setBranchStatus("loading");
    loadRef.current(repo).then(
      (list) => {
        if (stale) return;
        setBranches(sortBranches(list));
        setBranchStatus("ready");
        if (!branchRef.current) commitRef.current({ repo, branch: pickDefaultBranch(list, repo.defaultBranch) });
      },
      () => !stale && setBranchStatus("error"),
    );
    return () => {
      stale = true;
    };
  }, [repoId, hideBranch, branchRetry]);

  const pickRepo = useCallback(
    (repo: PickerRepo) => {
      setRepoOpen(false);
      setQuery("");
      if (repo.id === current.repo?.id) return;
      commit({ repo, branch: null });
    },
    // biome-ignore lint/correctness/useExhaustiveDependencies: commit closes over value/onChange
    [current.repo?.id, value, onChange],
  );

  const shownBranches = filterBranches(branches, branchQuery);
  const owner = current.repo ? splitFullName(current.repo.fullName) : null;

  const footer = (
    <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2 text-caption text-muted-foreground">
      <span className="flex min-w-0 items-center gap-1.5">
        {account?.avatar ? <Avatar name={account.login} src={account.avatar} size="xs" /> : <ShieldCheck aria-hidden className="size-3.5 shrink-0" />}
        <span className="truncate">{account ? t.connectedAs(account.login) : t.connectedAs("GitHub")}</span>
      </span>
      {onConfigure ? (
        <Button size="sm" variant="ghost" onClick={onConfigure} className="shrink-0">
          <Settings2 aria-hidden />
          {t.configure}
        </Button>
      ) : null}
    </div>
  );

  const triggerClass = "flex h-control w-full min-w-0 items-center gap-2 rounded-control border border-input bg-card px-3 text-start text-body outline-none transition-colors hover:bg-nq-hover focus-visible:border-nq-focus focus-visible:outline-1 focus-visible:outline-nq-focus disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div data-slot="repository-picker" className={cn("grid gap-3 sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]", hideBranch && "sm:grid-cols-1", className)}>
      <div className="flex min-w-0 flex-col gap-1.5">
        <span className="text-label text-foreground">{t.repository}</span>
        <Popover open={repoOpen} onOpenChange={setRepoOpen}>
          <PopoverTrigger disabled={disabled} aria-label={`${t.repository}: ${current.repo?.fullName ?? t.pickRepository}`} className={triggerClass}>
            <GitHubLogo onDark={dark} width={16} height={16} className="shrink-0" />
            {current.repo ? (
              <bdi dir="ltr" className="min-w-0 flex-1 truncate">
                <span className="text-muted-foreground">{owner?.owner ? `${owner.owner}/` : ""}</span>
                <span className="font-semibold text-foreground">{owner?.name}</span>
              </bdi>
            ) : (
              <span className="min-w-0 flex-1 truncate text-muted-foreground">{t.pickRepository}</span>
            )}
            {current.repo?.private ? <Lock aria-label={t.private} className="size-3.5 shrink-0 text-muted-foreground" /> : null}
            <ChevronsUpDown aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[min(28rem,var(--available-width))] p-0">
            <PickerList
              search={query}
              onSearch={setQuery}
              placeholder={t.searchRepositories}
              status={repoStatus}
              emptyTitle={t.noRepositories}
              emptyHint={t.noRepositoriesHint}
              onRetry={() => setRetry((n) => n + 1)}
              footer={footer}
              t={t}
              num={num}
              options={repos.map((r) => ({
                key: r.id,
                selected: r.id === current.repo?.id,
                onPick: () => pickRepo(r),
                content: (
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="flex items-center gap-2">
                      <bdi dir="ltr" className="min-w-0 truncate text-label text-foreground">
                        {r.fullName}
                      </bdi>
                      {r.private ? (
                        <Badge variant="neutral">
                          <Lock aria-hidden className="size-3" />
                          {t.private}
                        </Badge>
                      ) : null}
                    </span>
                    {r.description ? (
                      <span dir="auto" className="line-clamp-1 text-caption text-muted-foreground">
                        {r.description}
                      </span>
                    ) : null}
                    <span className="flex flex-wrap items-center gap-x-3 text-caption text-muted-foreground">
                      {r.language ? <bdi dir="ltr">{r.language}</bdi> : null}
                      {r.stars !== undefined ? (
                        <span className="inline-flex items-center gap-1">
                          <Star aria-hidden className="size-3" />
                          <bdi>{num(r.stars)}</bdi>
                        </span>
                      ) : null}
                      {r.updatedAt ? (
                        <span>
                          {t.updated} <DateTime value={r.updatedAt} relative />
                        </span>
                      ) : null}
                    </span>
                  </span>
                ),
              }))}
            />
          </PopoverContent>
        </Popover>
      </div>

      {hideBranch ? null : (
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="text-label text-foreground">{t.branch}</span>
          <Popover
            open={branchOpen}
            onOpenChange={(o) => {
              setBranchOpen(o);
              if (!o) setBranchQuery("");
            }}
          >
            <PopoverTrigger disabled={disabled || !current.repo} aria-label={`${t.branch}: ${current.branch ?? (current.repo ? t.pickBranch : t.chooseRepoFirst)}`} className={triggerClass}>
              <GitBranch aria-hidden className="size-4 shrink-0 text-muted-foreground" />
              {current.branch ? (
                <bdi dir="ltr" className="min-w-0 flex-1 truncate">
                  {current.branch}
                </bdi>
              ) : (
                <span className="min-w-0 flex-1 truncate text-muted-foreground">{current.repo ? (branchStatus === "loading" ? t.branchesLoading : t.pickBranch) : t.chooseRepoFirst}</span>
              )}
              <ChevronsUpDown aria-hidden className="size-4 shrink-0 text-muted-foreground" />
            </PopoverTrigger>
            <PopoverContent align="start" className="w-[min(22rem,var(--available-width))] p-0">
              <PickerList
                search={branchQuery}
                onSearch={setBranchQuery}
                placeholder={t.searchBranches}
                status={branchStatus}
                emptyTitle={t.noBranches}
                onRetry={() => setBranchRetry((n) => n + 1)}
                t={t}
                num={num}
                options={shownBranches.map((b) => ({
                  key: b.name,
                  selected: b.name === current.branch,
                  onPick: () => {
                    setBranchOpen(false);
                    setBranchQuery("");
                    if (current.repo) commit({ repo: current.repo, branch: b.name });
                  },
                  content: (
                    <span className="flex items-center gap-2">
                      <bdi dir="ltr" className="min-w-0 truncate text-body-sm text-foreground">
                        {b.name}
                      </bdi>
                      {b.default ? <Badge variant="info">{t.default}</Badge> : null}
                      {b.protected ? (
                        <Badge variant="neutral">
                          <Lock aria-hidden className="size-3" />
                          {t.protected}
                        </Badge>
                      ) : null}
                    </span>
                  ),
                }))}
              />
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
}
