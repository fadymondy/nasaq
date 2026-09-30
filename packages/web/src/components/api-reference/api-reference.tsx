"use client";

import { ArrowLeft, ArrowRight, KeyRound, LayoutGrid, Search, ShieldCheck, TriangleAlert, Wrench } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Badge } from "../badge";
import { Button } from "../button";
import { Chip, ChipGroup } from "../chip-group";
import { CodeBlock } from "../code-block";
import { CopyButton } from "../copy-button";
import { Input } from "../field";
import { formatNumber } from "../numeric";
import { EmptyState } from "../states";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../table";
import { Toggle, ToggleGroup } from "../toggle-group";
import { countByAccess, filterTools, groupTools, type ToolAccess } from "./api-reference-format";

export type { ToolAccess } from "./api-reference-format";

/* ------------------------------------------------------------------ strings */

const STRINGS = {
  en: {
    tools: "Tools",
    search: "Search tools",
    all: "All",
    catalog: "Catalog",
    reference: "Reference",
    view: "View",
    access: "Access",
    accessLevels: { read: "Read only", write: "Changes data", destructive: "Destructive" } satisfies Record<ToolAccess, string>,
    accessAll: "Any access",
    scope: "Scope",
    minRole: "Minimum role",
    arguments: "Arguments",
    noArguments: "This tool takes no arguments.",
    name: "Name",
    type: "Type",
    required: "Required",
    optional: "Optional",
    defaultValue: "Default",
    description: "Description",
    returns: "Returns",
    examples: "Example",
    call: "Call",
    result: "Result",
    deprecated: "Deprecated",
    since: (v: string) => `Since ${v}`,
    copyName: "Copy tool name",
    back: "All tools",
    emptyTitle: "No tools match",
    emptyBody: "Try another word or clear the filters.",
    clear: "Clear filters",
    results: (n: string) => `${n} tools`,
    permissions: "Permissions",
    values: "One of",
  },
  ar: {
    tools: "الأدوات",
    search: "ابحث في الأدوات",
    all: "الكل",
    catalog: "الفهرس",
    reference: "المرجع",
    view: "العرض",
    access: "الوصول",
    accessLevels: { read: "قراءة فقط", write: "يغيّر البيانات", destructive: "مدمّر" } satisfies Record<ToolAccess, string>,
    accessAll: "أي وصول",
    scope: "النطاق",
    minRole: "أدنى دور",
    arguments: "المعاملات",
    noArguments: "هذه الأداة لا تأخذ معاملات.",
    name: "الاسم",
    type: "النوع",
    required: "مطلوب",
    optional: "اختياري",
    defaultValue: "الافتراضي",
    description: "الوصف",
    returns: "ما تُرجعه",
    examples: "مثال",
    call: "الاستدعاء",
    result: "النتيجة",
    deprecated: "متقادمة",
    since: (v: string) => `منذ ${v}`,
    copyName: "نسخ اسم الأداة",
    back: "كل الأدوات",
    emptyTitle: "لا أدوات مطابقة",
    emptyBody: "جرّب كلمة أخرى أو امسح التصفية.",
    clear: "مسح التصفية",
    results: (n: string) => `${n} أداة`,
    permissions: "الصلاحيات",
    values: "إحدى القيم",
  },
};
export type ApiReferenceLabels = typeof STRINGS.en;

function useT(labels?: Partial<ApiReferenceLabels>) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const ar = locale.startsWith("ar");
  return { t: { ...STRINGS[ar ? "ar" : "en"], ...labels } as ApiReferenceLabels, locale, ar };
}

/* ------------------------------------------------------------------ types */

export interface ApiArg {
  name: string;
  /** `string`, `integer`, `boolean`, `string[]`, `object`. Shown left-to-right. */
  type: string;
  required?: boolean;
  description?: string;
  /** Shown left-to-right. */
  default?: string;
  /** Allowed values, when the argument is an enum. */
  values?: string[];
}

export interface ApiExample {
  title?: string;
  /** The request, usually JSON. */
  call: string;
  /** The response, usually JSON. */
  result: string;
  callLanguage?: string;
  resultLanguage?: string;
}

export interface ApiTool {
  id: string;
  /** The identifier callers use, e.g. `create_issue` or `POST /v1/issues`. Shown left-to-right. */
  name: string;
  summary: string;
  description?: string;
  /** Groups the catalog, e.g. "Issues". Localise it. */
  category?: string;
  /** The permission the caller's token needs, e.g. `issues:write`. */
  scope: string;
  /** The lowest role that may call it, e.g. "Member". Localise it. */
  minRole: string;
  /** Default `read`. */
  access?: ToolAccess;
  args?: ApiArg[];
  /** What comes back, in a sentence. */
  returns?: string;
  examples?: ApiExample[];
  deprecated?: boolean;
  since?: string;
}

const accessVariant: Record<ToolAccess, "neutral" | "warning" | "danger"> = { read: "neutral", write: "warning", destructive: "danger" };

/* ------------------------------------------------------------------ detail */

export interface ApiToolDetailProps {
  tool: ApiTool;
  className?: string;
  labels?: Partial<ApiReferenceLabels>;
}

/** One tool: name, scope and minimum role, the arguments table and example call and result. */
export function ApiToolDetail({ tool, className, labels }: ApiToolDetailProps) {
  const { t } = useT(labels);
  const access = tool.access ?? "read";
  const args = tool.args ?? [];
  return (
    <article data-slot="api-tool" data-tool={tool.id} className={cn("flex min-w-0 flex-col gap-5", className)}>
      <header className="flex flex-col gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h2 className="min-w-0 break-all font-mono text-h3 text-foreground">
            <bdi dir="ltr">{tool.name}</bdi>
          </h2>
          <CopyButton value={tool.name} label={t.copyName} size="icon-sm" variant="ghost" />
          {tool.deprecated ? (
            <Badge variant="warning">
              <TriangleAlert aria-hidden className="size-3" />
              {t.deprecated}
            </Badge>
          ) : null}
        </div>
        <p dir="auto" className="text-body text-foreground">
          {tool.description ?? tool.summary}
        </p>
        <dl className="flex flex-wrap gap-x-6 gap-y-2 text-body-sm">
          <div className="flex items-center gap-2">
            <dt className="flex items-center gap-1 text-muted-foreground">
              <KeyRound aria-hidden className="size-3.5" />
              {t.scope}
            </dt>
            <dd>
              <Badge variant="outline">
                <bdi dir="ltr" className="font-mono">
                  {tool.scope}
                </bdi>
              </Badge>
            </dd>
          </div>
          <div className="flex items-center gap-2">
            <dt className="flex items-center gap-1 text-muted-foreground">
              <ShieldCheck aria-hidden className="size-3.5" />
              {t.minRole}
            </dt>
            <dd>
              <Badge variant="info">{tool.minRole}</Badge>
            </dd>
          </div>
          <div className="flex items-center gap-2">
            <dt className="text-muted-foreground">{t.access}</dt>
            <dd>
              <Badge variant={accessVariant[access]}>{t.accessLevels[access]}</Badge>
            </dd>
          </div>
          {tool.since ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <dt className="sr-only">{t.since("")}</dt>
              <dd>{t.since(tool.since)}</dd>
            </div>
          ) : null}
        </dl>
      </header>

      <section className="flex flex-col gap-2" aria-labelledby={`${tool.id}-args`}>
        <h3 id={`${tool.id}-args`} className="text-label text-foreground">
          {t.arguments}
        </h3>
        {args.length ? (
          <Table label={t.arguments}>
            <TableHeader>
              <TableRow>
                <TableHead>{t.name}</TableHead>
                <TableHead>{t.type}</TableHead>
                <TableHead>{t.description}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {args.map((a) => (
                <TableRow key={a.name}>
                  <TableCell className="align-top">
                    <div className="flex flex-col items-start gap-1">
                      <bdi dir="ltr" className="font-mono text-code text-foreground">
                        {a.name}
                      </bdi>
                      <Badge variant={a.required ? "danger" : "neutral"}>{a.required ? t.required : t.optional}</Badge>
                    </div>
                  </TableCell>
                  <TableCell className="align-top">
                    <bdi dir="ltr" className="font-mono text-code text-muted-foreground">
                      {a.type}
                    </bdi>
                  </TableCell>
                  <TableCell className="min-w-56 align-top whitespace-normal">
                    <p dir="auto" className="text-foreground">
                      {a.description ?? "—"}
                    </p>
                    {a.values?.length ? (
                      <p className="mt-1 flex flex-wrap items-center gap-1 text-caption text-muted-foreground">
                        {t.values}:
                        {a.values.map((v) => (
                          <bdi key={v} dir="ltr" className="rounded-control bg-muted px-1.5 py-0.5 font-mono text-code text-foreground">
                            {v}
                          </bdi>
                        ))}
                      </p>
                    ) : null}
                    {a.default !== undefined ? (
                      <p className="mt-1 text-caption text-muted-foreground">
                        {t.defaultValue}:{" "}
                        <bdi dir="ltr" className="font-mono text-code text-foreground">
                          {a.default}
                        </bdi>
                      </p>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-body-sm text-muted-foreground">{t.noArguments}</p>
        )}
        {tool.returns ? (
          <p dir="auto" className="text-body-sm text-muted-foreground">
            <span className="text-foreground">{t.returns}:</span> {tool.returns}
          </p>
        ) : null}
      </section>

      {tool.examples?.length ? (
        <section className="flex flex-col gap-3" aria-labelledby={`${tool.id}-ex`}>
          <h3 id={`${tool.id}-ex`} className="text-label text-foreground">
            {t.examples}
          </h3>
          {tool.examples.map((ex, i) => (
            <div key={`${ex.title ?? ""}-${i}`} className="flex flex-col gap-2">
              {ex.title ? (
                <p dir="auto" className="text-body-sm text-muted-foreground">
                  {ex.title}
                </p>
              ) : null}
              <div className="grid min-w-0 gap-3 xl:grid-cols-2">
                <CodeBlock code={ex.call} language={ex.callLanguage ?? "json"} filename={t.call} preClassName="max-h-80" />
                <CodeBlock code={ex.result} language={ex.resultLanguage ?? "json"} filename={t.result} preClassName="max-h-80" />
              </div>
            </div>
          ))}
        </section>
      ) : null}
    </article>
  );
}

/* ------------------------------------------------------------------ catalog */

export interface ApiToolCatalogProps {
  tools: ApiTool[];
  onSelect?: (tool: ApiTool) => void;
  className?: string;
  labels?: Partial<ApiReferenceLabels>;
}

/** Every tool as a card, grouped by category: name, summary, scope and minimum role at a glance. */
export function ApiToolCatalog({ tools, onSelect, className, labels }: ApiToolCatalogProps) {
  const { t } = useT(labels);
  const groups = useMemo(() => groupTools(tools), [tools]);
  return (
    <div data-slot="api-tool-catalog" className={cn("flex min-w-0 flex-col gap-5", className)}>
      {groups.map((g) => (
        <section key={g.category} className="flex flex-col gap-2">
          {g.category ? <h3 className="eyebrow">{g.category}</h3> : null}
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,18rem),1fr))] gap-3">
            {g.tools.map((tool) => {
              const access = tool.access ?? "read";
              return (
                <li key={tool.id} className="min-w-0">
                  <article data-tool={tool.id} className="relative flex h-full flex-col gap-2 rounded-card border border-border bg-card p-4 shadow-xs transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-nq-focus hover:bg-nq-hover">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="min-w-0 break-all font-mono text-label text-foreground">
                        <button type="button" onClick={() => onSelect?.(tool)} className="text-start outline-none after:absolute after:inset-0 after:content-['']">
                          <bdi dir="ltr">{tool.name}</bdi>
                        </button>
                      </h4>
                      {tool.deprecated ? <Badge variant="warning">{t.deprecated}</Badge> : null}
                    </div>
                    <p dir="auto" className="line-clamp-2 text-body-sm text-muted-foreground">
                      {tool.summary}
                    </p>
                    <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
                      <Badge variant="outline">
                        <bdi dir="ltr" className="font-mono">
                          {tool.scope}
                        </bdi>
                      </Badge>
                      <Badge variant="info">{tool.minRole}</Badge>
                      {access !== "read" ? <Badge variant={accessVariant[access]}>{t.accessLevels[access]}</Badge> : null}
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ reference */

export interface ApiReferenceProps {
  tools: ApiTool[];
  /** Open tool id. Uncontrolled when omitted (starts on the first tool). */
  selectedId?: string;
  onSelectedChange?: (id: string) => void;
  /** `"reference"` (list plus detail) or `"catalog"` (cards). Uncontrolled when omitted. */
  view?: "reference" | "catalog";
  defaultView?: "reference" | "catalog";
  onViewChange?: (view: "reference" | "catalog") => void;
  className?: string;
  labels?: Partial<ApiReferenceLabels>;
}

/**
 * An API or MCP tool reference: a searchable list of tools beside the selected tool's scope, minimum role,
 * arguments table and example call and result, plus a catalog view with cards. It renders the data you pass.
 */
export function ApiReference({ tools, selectedId, onSelectedChange, view, defaultView = "reference", onViewChange, className, labels }: ApiReferenceProps) {
  const { t, locale, ar } = useT(labels);
  const num = (n: number) => formatNumber(n, locale);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [access, setAccess] = useState<ToolAccess | "all">("all");
  const [innerId, setInnerId] = useState<string | undefined>(undefined);
  const [innerView, setInnerView] = useState<"reference" | "catalog">(defaultView);
  const [mobileList, setMobileList] = useState(true);
  const currentView = view ?? innerView;
  const categories = useMemo(() => [...new Set(tools.map((x) => x.category).filter((c): c is string => !!c))], [tools]);
  const accessCounts = useMemo(() => countByAccess(tools), [tools]);
  const listed = useMemo(() => filterTools(tools, { query, category, access }), [tools, query, category, access]);
  const groups = useMemo(() => groupTools(listed), [listed]);
  const openId = selectedId ?? innerId ?? tools[0]?.id;
  const open = tools.find((x) => x.id === openId);
  const Back = ar ? ArrowRight : ArrowLeft;

  function select(id: string) {
    setInnerId(id);
    onSelectedChange?.(id);
    setMobileList(false);
  }
  function setView(v: "reference" | "catalog") {
    setInnerView(v);
    onViewChange?.(v);
  }
  const clear = () => {
    setQuery("");
    setCategory("all");
    setAccess("all");
  };

  const filters = (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search aria-hidden className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.search} aria-label={t.search} className="ps-8" />
      </div>
      {categories.length > 1 ? (
        <ChipGroup value={category} onValueChange={setCategory} aria-label={t.tools}>
          <Chip value="all">{t.all}</Chip>
          {categories.map((c) => (
            <Chip key={c} value={c}>
              {c}
            </Chip>
          ))}
        </ChipGroup>
      ) : null}
      <ToggleGroup value={[access]} onValueChange={(v) => setAccess((v[0] as ToolAccess | "all" | undefined) ?? "all")} aria-label={t.access} className="flex-wrap">
        <Toggle value="all">{t.accessAll}</Toggle>
        {(["read", "write", "destructive"] as const).map((a) => (
          <Toggle key={a} value={a} disabled={accessCounts[a] === 0}>
            {t.accessLevels[a]}
          </Toggle>
        ))}
      </ToggleGroup>
    </div>
  );

  return (
    <div data-slot="api-reference" data-view={currentView} className={cn("flex min-w-0 flex-col gap-4", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-body-sm text-muted-foreground" role="status">
          {t.results(num(listed.length))}
        </p>
        <ToggleGroup value={[currentView]} onValueChange={(v) => v[0] && setView(v[0] as "reference" | "catalog")} aria-label={t.view}>
          <Toggle value="reference">
            <Wrench aria-hidden />
            {t.reference}
          </Toggle>
          <Toggle value="catalog">
            <LayoutGrid aria-hidden />
            {t.catalog}
          </Toggle>
        </ToggleGroup>
      </div>

      {currentView === "catalog" ? (
        <div className="flex min-w-0 flex-col gap-4">
          {filters}
          {listed.length ? (
            <ApiToolCatalog
              tools={listed}
              onSelect={(tool) => {
                select(tool.id);
                setView("reference");
              }}
              {...(labels ? { labels } : {})}
            />
          ) : (
            <EmptyState title={t.emptyTitle} description={t.emptyBody} actions={<Button variant="secondary" onClick={clear}>{t.clear}</Button>} />
          )}
        </div>
      ) : (
        <div className="grid min-w-0 gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <nav aria-label={t.tools} className={cn("flex min-w-0 flex-col gap-3 lg:self-start", !mobileList && "max-lg:hidden")}>
            {filters}
            {listed.length === 0 ? (
              <EmptyState title={t.emptyTitle} description={t.emptyBody} actions={<Button variant="secondary" onClick={clear}>{t.clear}</Button>} />
            ) : (
              <div className="flex max-h-[calc(100vh-14rem)] min-h-40 flex-col gap-3 overflow-y-auto">
                {groups.map((g) => (
                  <section key={g.category} className="flex flex-col gap-1">
                    {g.category ? <h3 className="eyebrow px-2">{g.category}</h3> : null}
                    <ul className="flex flex-col">
                      {g.tools.map((tool) => (
                        <li key={tool.id}>
                          <button
                            type="button"
                            aria-current={tool.id === openId ? "true" : undefined}
                            onClick={() => select(tool.id)}
                            className={cn("flex w-full min-w-0 flex-col items-start gap-0.5 rounded-control px-2 py-1.5 text-start outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus", tool.id === openId && "bg-secondary")}
                          >
                            <bdi dir="ltr" className="max-w-full truncate font-mono text-code text-foreground">
                              {tool.name}
                            </bdi>
                            <span dir="auto" className="line-clamp-1 max-w-full text-caption text-muted-foreground">
                              {tool.summary}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </nav>
          <div className={cn("min-w-0", mobileList && "max-lg:hidden")}>
            <Button variant="ghost" size="sm" className="mb-3 lg:hidden" onClick={() => setMobileList(true)}>
              <Back aria-hidden />
              {t.back}
            </Button>
            {open ? <ApiToolDetail tool={open} {...(labels ? { labels } : {})} /> : <EmptyState title={t.emptyTitle} description={t.emptyBody} />}
          </div>
        </div>
      )}
    </div>
  );
}
