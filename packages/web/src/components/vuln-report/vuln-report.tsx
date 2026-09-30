"use client";

import { ArrowDownRight, ArrowUpRight, Minus, ScanSearch } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Badge } from "../badge";
import { Button } from "../button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../card";
import { CopyButton } from "../copy-button";
import { DateTime, Num } from "../numeric";
import { EmptyState } from "../states";
import {
  countBySeverity,
  emptyCounts,
  isCveId,
  riskTone,
  type RankableFinding,
  VULN_SEVERITIES,
  type Severity,
  type SeverityCounts,
  topFindings,
  totalCount,
  trend,
} from "./vuln-format";

export { countBySeverity, emptyCounts, isCveId, riskTone, type RankableFinding, VULN_SEVERITIES, type Severity, type SeverityCounts, topFindings, totalCount, trend, type RiskTone } from "./vuln-format";

const STRINGS = {
  en: {
    title: "Vulnerability report",
    description: "What the last scan found in your packages and images.",
    severity: { critical: "Critical", high: "High", medium: "Medium", low: "Low" } satisfies Record<Severity, string>,
    total: "Total findings",
    clean: "No vulnerabilities found",
    cleanBody: "The last scan came back clean.",
    top: "Top findings",
    topEmpty: "Nothing to fix.",
    pkg: "Package",
    installed: "Installed",
    fixedIn: "Fixed in",
    noFix: "No fix yet",
    cvss: "CVSS",
    history: "Scan history",
    historyLabel: (d: string, n: number) => `Scan on ${d}: ${n} findings`,
    scannedAt: "Last scan",
    scanNow: "Scan now",
    scanning: "Scanning",
    better: (n: number) => `${n} fewer than the previous scan`,
    worse: (n: number) => `${n} more than the previous scan`,
    same: "Same as the previous scan",
    showAll: "Show all findings",
    noScan: "No scan yet",
    noScanBody: "Run a scan to see what needs patching.",
    copyCve: (id: string) => `Copy ${id}`,
    genericError: "Something went wrong. Try again.",
  },
  ar: {
    title: "تقرير الثغرات",
    description: "ما وجده آخر فحص في حزمك وصورك.",
    severity: { critical: "حرجة", high: "عالية", medium: "متوسطة", low: "منخفضة" } satisfies Record<Severity, string>,
    total: "إجمالي النتائج",
    clean: "لا توجد ثغرات",
    cleanBody: "انتهى آخر فحص دون نتائج.",
    top: "أهم النتائج",
    topEmpty: "لا شيء يحتاج إصلاحًا.",
    pkg: "الحزمة",
    installed: "المثبّتة",
    fixedIn: "أُصلحت في",
    noFix: "لا إصلاح بعد",
    cvss: "CVSS",
    history: "سجل الفحوص",
    historyLabel: (d: string, n: number) => `فحص بتاريخ ${d}: ${n} نتيجة`,
    scannedAt: "آخر فحص",
    scanNow: "افحص الآن",
    scanning: "جارٍ الفحص",
    better: (n: number) => `أقل بـ ${n} من الفحص السابق`,
    worse: (n: number) => `أكثر بـ ${n} من الفحص السابق`,
    same: "مثل الفحص السابق",
    showAll: "عرض كل النتائج",
    noScan: "لا فحص بعد",
    noScanBody: "شغّل فحصًا لمعرفة ما يحتاج إلى ترقيع.",
    copyCve: (id: string) => `نسخ ${id}`,
    genericError: "حدث خطأ ما. حاول مرة أخرى.",
  },
};
type T = typeof STRINGS.en;
export type VulnReportLabels = Partial<T>;

export interface VulnFinding extends RankableFinding {
  /** CVE id like CVE-2024-12345. */
  id: string;
  title?: string;
  package: string;
  installedVersion?: string;
  fixedVersion?: string;
}

export interface VulnScan {
  id: string;
  at: Date | number | string;
  counts: Partial<SeverityCounts>;
}

const sevVariant: Record<Severity, "danger" | "warning" | "info" | "neutral"> = { critical: "danger", high: "danger", medium: "warning", low: "neutral" };
const sevBar: Record<Severity, string> = { critical: "bg-nq-danger", high: "bg-nq-danger/60", medium: "bg-nq-warning", low: "bg-muted-foreground/40" };
const sevBox: Record<Severity, string> = { critical: "text-nq-danger", high: "text-nq-danger", medium: "text-nq-warning", low: "text-muted-foreground" };

export interface SeverityCountsProps extends Omit<ComponentProps<"dl">, "children"> {
  counts: Partial<SeverityCounts>;
  labels?: VulnReportLabels;
}

/** Four tiles with the number of findings per severity. Severity is always spelled out, never colour alone. */
export function SeverityTiles({ counts, labels, className, ...props }: SeverityCountsProps) {
  const ar = (useOptionalNasaq()?.locale ?? "en").startsWith("ar");
  const t = { ...STRINGS[ar ? "ar" : "en"], ...labels };
  return (
    <dl data-slot="severity-tiles" className={cn("grid grid-cols-2 gap-2 sm:grid-cols-4", className)} {...props}>
      {VULN_SEVERITIES.map((s) => (
        <div key={s} data-severity={s} className="rounded-control border border-border bg-card p-3">
          <dt className="text-body-sm text-muted-foreground">{t.severity[s]}</dt>
          <dd className={cn("text-h2 font-semibold tabular-nums", (counts[s] ?? 0) > 0 ? sevBox[s] : "text-foreground")}>
            <Num value={counts[s] ?? 0} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

export interface VulnReportProps extends Omit<ComponentProps<typeof Card>, "children"> {
  /** Every finding from the latest scan. Counts come from these unless `counts` is given. */
  findings: readonly VulnFinding[];
  /** Override the counts, for example when `findings` holds only the top items. */
  counts?: Partial<SeverityCounts>;
  /** Oldest first. The last entry is the latest scan. */
  history?: readonly VulnScan[];
  lastScanAt?: Date | number | string;
  /** How many findings to list. Default 5. */
  topLimit?: number;
  scanning?: boolean;
  /** Shows Scan now when set. */
  onScan?: () => Promise<void | { error?: string }>;
  /** Called with a finding when its row is chosen, for a details page. */
  onOpenFinding?: (finding: VulnFinding) => void;
  labels?: VulnReportLabels;
}

/** Latest scan at a glance: counts per severity, the worst findings with the fixed version, and the last scans as stacked bars with the trend. */
export function VulnReport({ findings, counts, history = [], lastScanAt, topLimit = 5, scanning = false, onScan, onOpenFinding, labels, className, ...props }: VulnReportProps) {
  const ar = (useOptionalNasaq()?.locale ?? "en").startsWith("ar");
  const t: T = { ...STRINGS[ar ? "ar" : "en"], ...labels };
  const c = counts ?? countBySeverity(findings);
  const total = totalCount(c);
  const top = topFindings(findings, topLimit);
  const delta = trend(history);
  const peak = Math.max(1, ...history.map((h) => totalCount(h.counts)));
  const hasScan = lastScanAt !== undefined || history.length > 0 || findings.length > 0;
  const tone = riskTone(c);

  return (
    <Card data-slot="vuln-report" data-risk={tone} className={cn("w-full", className)} {...props}>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle as="h3" className="flex items-center gap-2">
            <ScanSearch aria-hidden className="size-4 text-muted-foreground" />
            {t.title}
          </CardTitle>
          {onScan ? (
            <Button size="sm" variant="secondary" loading={scanning} onClick={() => void onScan()}>
              {scanning ? t.scanning : t.scanNow}
            </Button>
          ) : null}
        </div>
        <CardDescription>
          {t.description}
          {lastScanAt ? (
            <>
              {" "}
              {t.scannedAt} <DateTime value={lastScanAt} relative />.
            </>
          ) : null}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        {!hasScan ? (
          <EmptyState title={t.noScan} description={t.noScanBody} />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-body-sm text-muted-foreground">
                {t.total}: <span className="text-h3 font-semibold text-foreground tabular-nums"><Num value={total} /></span>
              </p>
              {delta !== null ? (
                <Badge variant={delta < 0 ? "success" : delta > 0 ? "danger" : "neutral"}>
                  {delta < 0 ? <ArrowDownRight aria-hidden /> : delta > 0 ? <ArrowUpRight aria-hidden /> : <Minus aria-hidden />}
                  {delta < 0 ? t.better(-delta) : delta > 0 ? t.worse(delta) : t.same}
                </Badge>
              ) : null}
            </div>
            <SeverityTiles counts={c} labels={labels} />

            <section aria-labelledby="vuln-top" className="grid gap-2">
              <h4 id="vuln-top" className="text-label text-foreground">
                {t.top}
              </h4>
              {total === 0 ? (
                <p className="rounded-control border border-dashed border-border p-4 text-body-sm text-muted-foreground">
                  {t.clean}. {t.cleanBody}
                </p>
              ) : top.length === 0 ? (
                <p className="text-body-sm text-muted-foreground">{t.topEmpty}</p>
              ) : (
                <ul className="divide-y divide-border rounded-control border border-border">
                  {top.map((f) => (
                    <li key={f.id + f.package} data-slot="vuln-finding" className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
                      <Badge variant={sevVariant[f.severity]}>{t.severity[f.severity]}</Badge>
                      <div className="grid min-w-0 flex-1 gap-0.5">
                        {onOpenFinding ? (
                          <button type="button" className="w-fit text-start font-mono text-body-sm text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring" onClick={() => onOpenFinding(f)}>
                            <bdi dir="ltr">{f.id}</bdi>
                          </button>
                        ) : (
                          <bdi dir="ltr" className="font-mono text-body-sm text-foreground">
                            {f.id}
                          </bdi>
                        )}
                        {f.title ? (
                          <span className="truncate text-caption text-muted-foreground" dir="auto">
                            {f.title}
                          </span>
                        ) : null}
                      </div>
                      <span className="text-body-sm text-muted-foreground">
                        <bdi dir="ltr" className="font-mono">
                          {f.package}
                          {f.installedVersion ? `@${f.installedVersion}` : ""}
                        </bdi>
                        {" → "}
                        {f.fixedVersion ? (
                          <bdi dir="ltr" className="font-mono text-nq-success">
                            {f.fixedVersion}
                          </bdi>
                        ) : (
                          <span>{t.noFix}</span>
                        )}
                      </span>
                      {f.cvss !== undefined ? (
                        <span className="text-caption text-muted-foreground tabular-nums">
                          {t.cvss} <bdi dir="ltr">{f.cvss.toFixed(1)}</bdi>
                        </span>
                      ) : null}
                      {isCveId(f.id) ? <CopyButton value={f.id} label={t.copyCve(f.id)} size="icon-sm" variant="ghost" /> : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {history.length > 0 ? (
              <section aria-labelledby="vuln-history" className="grid gap-2">
                <h4 id="vuln-history" className="text-label text-foreground">
                  {t.history}
                </h4>
                <ol className="flex h-24 items-end gap-1.5">
                  {history.map((h) => {
                    const n = totalCount(h.counts);
                    return (
                      <li
                        key={h.id}
                        className="flex h-full min-w-2 flex-1 flex-col-reverse overflow-hidden rounded-t-[2px]"
                        style={{ height: `${Math.max(4, (n / peak) * 100)}%` }}
                        role="img"
                        aria-label={t.historyLabel(new Date(h.at).toLocaleDateString(ar ? "ar" : "en"), n)}
                        title={t.historyLabel(new Date(h.at).toLocaleDateString(ar ? "ar" : "en"), n)}
                      >
                        {[...VULN_SEVERITIES].reverse().map((s) => ((h.counts[s] ?? 0) > 0 ? <span key={s} className={sevBar[s]} style={{ flexGrow: h.counts[s] }} /> : null))}
                      </li>
                    );
                  })}
                </ol>
              </section>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
