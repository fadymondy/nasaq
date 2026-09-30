"use client";

import { Crown, Layers, TriangleAlert } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { Badge } from "../badge";
import { Button } from "../button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../card";
import { type DataTableColumn, type DataTableRowAction, DataTable, DataTableFacetFilter, DataTablePagination, DataTableSearch, DataTableToolbar, useDataTable } from "../data-table";
import { Num } from "../numeric";
import { EmptyState } from "../states";
import { Status } from "../status";
import { Tabs, TabsList, TabsPanel, TabsTab } from "../tabs";
import { type RankingUrl, type SearchIntent, classifyIntent, clusterKeywords, findCannibalization, normalizeUrl } from "./planner-math";

export { classifyIntent, clusterKeywords, findCannibalization, keywordTokens, normalizeUrl } from "./planner-math";
export type { Cannibalization, ClusterInput, KeywordCluster, RankingUrl, SearchIntent } from "./planner-math";

const STRINGS = {
  en: {
    title: "Keyword planner",
    description: "Plan which page owns which keyword, group related keywords and catch pages that compete with each other.",
    tabKeywords: "Keywords",
    tabClusters: "Clusters",
    tabCannibalization: "Cannibalization",
    keyword: "Keyword",
    intent: "Intent",
    cluster: "Cluster",
    volume: "Volume",
    difficulty: "Difficulty",
    owner: "Owning page",
    status: "Status",
    filter: "Filter keywords…",
    empty: "No keywords planned yet",
    intents: { informational: "Informational", commercial: "Commercial", transactional: "Transactional", navigational: "Navigational" } as Record<SearchIntent, string>,
    unassigned: "No owner",
    owned: "Owned",
    conflict: "Competing pages",
    ownerEmpty: "Assign a page",
    ownerInvalid: "Use /path or https://…",
    assignOwner: "Make this page the owner",
    setOwner: "Set owning page",
    clearOwner: "Remove owner",
    clusterKeywordsCount: (n: number) => (n === 1 ? "1 keyword" : `${n} keywords`),
    clusterVolume: "Total volume",
    clusterHead: "Main keyword",
    noClusters: "No clusters yet",
    conflictTitle: (n: number) => (n === 0 ? "No pages compete" : n === 1 ? "1 keyword has competing pages" : `${n} keywords have competing pages`),
    conflictBody: "When two of your pages rank for the same keyword they split clicks and links. Keep one and merge or re-aim the others.",
    conflictNone: "No two of your pages rank for the same keyword.",
    keep: "Keep",
    positionShort: (n: number) => `Position ${n}`,
    keepThis: "Keep this page",
    failed: "Could not save this. Try again.",
    tip: "The intent is guessed from the wording. Edit the keyword's intent by passing your own.",
  },
  ar: {
    title: "مخطط الكلمات المفتاحية",
    description: "خطّط أي صفحة تملك أي كلمة، وجمّع الكلمات المتقاربة، واكتشف الصفحات التي تتنافس فيما بينها.",
    tabKeywords: "الكلمات",
    tabClusters: "المجموعات",
    tabCannibalization: "التنافس الداخلي",
    keyword: "الكلمة",
    intent: "القصد",
    cluster: "المجموعة",
    volume: "حجم البحث",
    difficulty: "الصعوبة",
    owner: "الصفحة المالكة",
    status: "الحالة",
    filter: "تصفية الكلمات…",
    empty: "لا كلمات مخططة بعد",
    intents: { informational: "معلوماتي", commercial: "تجاري", transactional: "شرائي", navigational: "تنقّلي" } as Record<SearchIntent, string>,
    unassigned: "بلا مالك",
    owned: "لها مالك",
    conflict: "صفحات متنافسة",
    ownerEmpty: "عيّن صفحة",
    ownerInvalid: "استخدم /مسار أو https://…",
    assignOwner: "اجعل هذه الصفحة المالكة",
    setOwner: "تعيين الصفحة المالكة",
    clearOwner: "إزالة المالك",
    clusterKeywordsCount: (n: number) => (n === 1 ? "كلمة واحدة" : `${n} كلمات`),
    clusterVolume: "إجمالي الحجم",
    clusterHead: "الكلمة الرئيسية",
    noClusters: "لا مجموعات بعد",
    conflictTitle: (n: number) => (n === 0 ? "لا صفحات متنافسة" : n === 1 ? "كلمة واحدة لها صفحات متنافسة" : `${n} كلمات لها صفحات متنافسة`),
    conflictBody: "عندما تُصنَّف صفحتان من موقعك للكلمة نفسها تتقاسمان النقرات والروابط. احتفظ بواحدة وادمج الأخرى أو غيّر وجهتها.",
    conflictNone: "لا صفحتين من موقعك تُصنَّفان للكلمة نفسها.",
    keep: "الإبقاء",
    positionShort: (n: number) => `الترتيب ${n}`,
    keepThis: "أبقِ هذه الصفحة",
    failed: "تعذّر الحفظ. حاول مرة أخرى.",
    tip: "يُخمَّن القصد من صياغة الكلمة. مرّر قصدك الخاص لتعديله.",
  },
};

export type KeywordPlannerLabels = typeof STRINGS.en;

export interface PlannerKeyword {
  id: string;
  keyword: string;
  volume: number;
  /** 0 (easy) to 100 (hard). */
  difficulty: number;
  /** Your own classification. Default: guessed from the wording. */
  intent?: SearchIntent;
  /** The page that should rank for this keyword. */
  ownerUrl?: string;
  /** Your pages that rank now, with positions. Two or more make the keyword cannibalized. */
  rankingUrls?: readonly RankingUrl[];
}

type Result = void | { error?: string };

const INTENT_VARIANT: Record<SearchIntent, "info" | "accent" | "success" | "neutral"> = { informational: "info", commercial: "accent", transactional: "success", navigational: "neutral" };

export interface KeywordPlannerProps {
  keywords: readonly PlannerKeyword[];
  /** Saves the owning page of a keyword. An empty string removes the owner. Without it owners are read only. */
  onAssignOwner?: (id: string, url: string) => Promise<Result>;
  title?: ReactNode;
  description?: ReactNode;
  pageSize?: number;
  loading?: boolean;
  error?: ReactNode;
  onRetry?: () => void;
  className?: string;
  labels?: Partial<KeywordPlannerLabels>;
}

/**
 * A keyword planner: every keyword with its intent, cluster, volume, difficulty and owning page (edit it in the cell),
 * a clusters view that groups related keywords under the biggest one, and a cannibalization view that lists keywords
 * where two of your pages compete, with a one-click way to choose the page to keep.
 */
export function KeywordPlanner({ keywords, onAssignOwner, title, description, pageSize = 8, loading, error, onRetry, className, labels }: KeywordPlannerProps) {
  const t = useAnalyticsLabels(STRINGS, labels);
  const [tab, setTab] = useState("keywords");
  const [failed, setFailed] = useState<string | null>(null);

  const clusters = useMemo(() => clusterKeywords(keywords), [keywords]);
  const clusterOf = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of clusters) for (const k of c.keywords) m.set(k.id, c.head);
    return m;
  }, [clusters]);
  const conflicts = useMemo(() => findCannibalization(keywords), [keywords]);
  const conflictKeys = useMemo(() => new Set(conflicts.map((c) => c.keyword)), [conflicts]);

  const assign = async (id: string, url: string) => {
    if (!onAssignOwner) return;
    setFailed(null);
    try {
      const out = await onAssignOwner(id, url);
      if (out && out.error) setFailed(out.error);
    } catch {
      setFailed(t.failed);
    }
  };

  const stateOf = (k: PlannerKeyword): "conflict" | "owned" | "unassigned" => (conflictKeys.has(k.keyword) ? "conflict" : k.ownerUrl ? "owned" : "unassigned");

  const columns = useMemo<DataTableColumn<PlannerKeyword>[]>(
    () => [
      {
        id: "keyword",
        header: t.keyword,
        label: t.keyword,
        hideable: false,
        sortValue: (k) => k.keyword,
        searchValue: (k) => `${k.keyword} ${k.ownerUrl ?? ""}`,
        cell: (k) => (
          <span dir="auto" className="block max-w-[26ch] truncate text-label text-foreground">
            {k.keyword}
          </span>
        ),
      },
      {
        id: "intent",
        header: t.intent,
        label: t.intent,
        sortValue: (k) => k.intent ?? classifyIntent(k.keyword),
        filterValue: (k) => k.intent ?? classifyIntent(k.keyword),
        cell: (k) => {
          const i = k.intent ?? classifyIntent(k.keyword);
          return <Badge variant={INTENT_VARIANT[i]}>{t.intents[i]}</Badge>;
        },
      },
      {
        id: "cluster",
        header: t.cluster,
        label: t.cluster,
        sortValue: (k) => clusterOf.get(k.id) ?? "",
        cell: (k) => (
          <span dir="auto" className="block max-w-[20ch] truncate text-body-sm text-muted-foreground">
            {clusterOf.get(k.id)}
          </span>
        ),
      },
      { id: "volume", header: t.volume, label: t.volume, align: "end", sortValue: (k) => k.volume, cell: (k) => <Num value={k.volume} format={{ notation: "compact", maximumFractionDigits: 1 }} /> },
      { id: "difficulty", header: t.difficulty, label: t.difficulty, align: "end", sortValue: (k) => k.difficulty, cell: (k) => <Num value={k.difficulty} /> },
      {
        id: "owner",
        header: t.owner,
        label: t.owner,
        sortValue: (k) => k.ownerUrl ?? "",
        searchValue: (k) => k.ownerUrl ?? "",
        edit: onAssignOwner ? { type: "text", value: (k) => k.ownerUrl ?? "", label: t.owner, validate: (v) => (String(v).trim() === "" || /^\/|^https?:\/\//i.test(String(v).trim()) ? null : t.ownerInvalid) } : undefined,
        cell: (k) =>
          k.ownerUrl ? (
            <bdi dir="ltr" className="block max-w-[22ch] truncate text-caption text-foreground">
              {k.ownerUrl}
            </bdi>
          ) : (
            <span className="text-caption text-muted-foreground">{t.ownerEmpty}</span>
          ),
      },
      {
        id: "status",
        header: t.status,
        label: t.status,
        sortValue: (k) => stateOf(k),
        filterValue: (k) => stateOf(k),
        cell: (k) => {
          const s = stateOf(k);
          return s === "conflict" ? <Status tone="danger">{t.conflict}</Status> : s === "owned" ? <Status tone="success">{t.owned}</Status> : <Status tone="warning">{t.unassigned}</Status>;
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, clusterOf, conflictKeys, onAssignOwner],
  );

  const table = useDataTable({ data: [...keywords], columns, getRowId: (k) => k.id, pageSize, defaultSort: { id: "volume", direction: "desc" } });

  const rowActions = (k: PlannerKeyword): DataTableRowAction[] =>
    onAssignOwner && k.ownerUrl ? [{ id: "clear", label: t.clearOwner, onSelect: () => void assign(k.id, "") }] : [];

  return (
    <Card data-slot="keyword-planner" className={className}>
      <CardHeader>
        <CardTitle as="h3">{title ?? t.title}</CardTitle>
        <CardDescription>{description ?? t.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
          <TabsList variant="underline">
            <TabsTab value="keywords">{t.tabKeywords}</TabsTab>
            <TabsTab value="clusters">
              <Layers aria-hidden />
              {t.tabClusters}
            </TabsTab>
            <TabsTab value="cannibalization">
              <TriangleAlert aria-hidden />
              {t.tabCannibalization}
              {conflicts.length > 0 ? <Badge variant="danger">{conflicts.length}</Badge> : null}
            </TabsTab>
          </TabsList>

          <TabsPanel value="keywords" className="flex flex-col gap-3 pt-4">
            <DataTableToolbar>
              <DataTableSearch table={table} placeholder={t.filter} />
              <DataTableFacetFilter table={table} column="intent" title={t.intent} options={(["informational", "commercial", "transactional", "navigational"] as const).map((v) => ({ value: v, label: t.intents[v] }))} />
              <DataTableFacetFilter
                table={table}
                column="status"
                title={t.status}
                options={[
                  { value: "unassigned", label: t.unassigned },
                  { value: "owned", label: t.owned },
                  { value: "conflict", label: t.conflict },
                ]}
              />
            </DataTableToolbar>
            {failed ? (
              <Status tone="danger" role="alert">
                {failed}
              </Status>
            ) : null}
            <DataTable
              table={table}
              label={t.title}
              loading={loading}
              error={error}
              onRetry={onRetry}
              empty={t.empty}
              rowActions={rowActions}
              onCellEdit={onAssignOwner ? (row, _col, value) => onAssignOwner(row.id, String(value).trim()) : undefined}
            />
            {keywords.length > pageSize ? <DataTablePagination table={table} /> : null}
          </TabsPanel>

          <TabsPanel value="clusters" className="pt-4">
            {clusters.length === 0 ? (
              <EmptyState icon={Layers} title={t.noClusters} />
            ) : (
              <ul className="grid gap-3 md:grid-cols-2">
                {clusters.map((c) => (
                  <li key={c.id} data-slot="keyword-cluster" className="flex flex-col gap-2 rounded-card border border-border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 flex-col">
                        <span className="text-caption text-muted-foreground">{t.clusterHead}</span>
                        <span dir="auto" className="truncate text-label text-foreground">
                          {c.head}
                        </span>
                      </div>
                      <div className="flex shrink-0 flex-col items-end text-caption text-muted-foreground">
                        <span>{t.clusterKeywordsCount(c.keywords.length)}</span>
                        <span>
                          {t.clusterVolume} <Num value={c.volume} format={{ notation: "compact", maximumFractionDigits: 1 }} />
                        </span>
                      </div>
                    </div>
                    <ul className="flex flex-wrap gap-1">
                      {c.keywords.map((k) => (
                        <li key={k.id}>
                          <Badge variant="outline" dir="auto">
                            {k.keyword}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </TabsPanel>

          <TabsPanel value="cannibalization" className="flex flex-col gap-3 pt-4">
            <p className="text-body-sm text-muted-foreground">{t.conflictBody}</p>
            <p role="status" className="text-label text-foreground">
              {t.conflictTitle(conflicts.length)}
            </p>
            {conflicts.length === 0 ? (
              <EmptyState title={t.conflictNone} />
            ) : (
              <ul className="flex flex-col gap-3">
                {conflicts.map((c) => {
                  const row = keywords.find((k) => k.keyword === c.keyword);
                  return (
                    <li key={c.keyword} data-slot="keyword-conflict" className="flex flex-col gap-2 rounded-card border border-border p-3">
                      <span dir="auto" className="text-label text-foreground">
                        {c.keyword}
                      </span>
                      <ul className="flex flex-col divide-y divide-border">
                        {c.urls.map((u) => {
                          const keep = normalizeUrl(u.url) === normalizeUrl(c.keep);
                          return (
                            <li key={u.url} className="flex flex-wrap items-center justify-between gap-2 py-2">
                              <span className="flex min-w-0 items-center gap-2">
                                {keep ? (
                                  <Badge variant="success">
                                    <Crown aria-hidden />
                                    {t.keep}
                                  </Badge>
                                ) : null}
                                <bdi dir="ltr" className="truncate text-body-sm text-foreground">
                                  {u.url}
                                </bdi>
                              </span>
                              <span className="flex items-center gap-3">
                                <span className="text-caption text-muted-foreground">
                                  <bdi>{t.positionShort(u.position)}</bdi>
                                </span>
                                {onAssignOwner && row && !keep ? (
                                  <Button size="sm" variant="secondary" onClick={() => void assign(row.id, u.url)}>
                                    {t.keepThis}
                                  </Button>
                                ) : null}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </li>
                  );
                })}
              </ul>
            )}
          </TabsPanel>
        </Tabs>
      </CardContent>
    </Card>
  );
}
