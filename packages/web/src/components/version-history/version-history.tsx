"use client";

import { ArrowLeft, History, RotateCcw } from "lucide-react";
import { type ComponentProps, type ReactNode, useId, useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../alert-dialog";
import { Badge } from "../badge";
import { Button } from "../button";
import { CodeBlock } from "../code-block";
import { DateTime, useFormatNumber } from "../numeric";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { EmptyState, Skeleton } from "../states";
import { Tabs, TabsList, TabsPanel, TabsTab } from "../tabs";
import { type DiffLine, diffLines, diffStats, foldDiff, sortVersions } from "./diff";

const STRINGS = {
  en: {
    list: "Versions",
    title: "Version history",
    version: (n: string) => `Version ${n}`,
    current: "Current",
    by: (name: string) => `by ${name}`,
    none: "No versions yet",
    noneBody: "Every save will show up here, newest first.",
    pick: "Choose a version",
    pickBody: "Pick a version to read it, compare it and restore it.",
    back: "Back to versions",
    preview: "Preview",
    changes: "Changes",
    readOnly: "Read only",
    compareWith: "Compare with",
    previous: "Previous version",
    currentVersion: "Current version",
    noPrevious: "This is the first version. There is nothing to compare it with.",
    identical: "No differences.",
    added: (n: string) => `${n} added`,
    removed: (n: string) => `${n} removed`,
    unchanged: (n: string) => `${n} unchanged lines`,
    lineAdded: "Added",
    lineRemoved: "Removed",
    restore: "Restore this version",
    restoring: "Restoring",
    restoreTitle: (n: string) => `Restore version ${n}?`,
    restoreBody: "Restoring saves it as a new version on top. Nothing is deleted, and you can go back.",
    restoreConfirm: "Restore",
    cancel: "Cancel",
    diffLabel: "Differences",
  },
  ar: {
    list: "النسخ",
    title: "سجل النسخ",
    version: (n: string) => `النسخة ${n}`,
    current: "الحالية",
    by: (name: string) => `بواسطة ${name}`,
    none: "لا نسخ بعد",
    noneBody: "ستظهر كل عملية حفظ هنا، الأحدث أولًا.",
    pick: "اختر نسخة",
    pickBody: "اختر نسخة لقراءتها ومقارنتها واستعادتها.",
    back: "العودة إلى النسخ",
    preview: "معاينة",
    changes: "التغييرات",
    readOnly: "للقراءة فقط",
    compareWith: "قارن مع",
    previous: "النسخة السابقة",
    currentVersion: "النسخة الحالية",
    noPrevious: "هذه أول نسخة، فلا شيء لمقارنتها به.",
    identical: "لا اختلافات.",
    added: (n: string) => `${n} مضاف`,
    removed: (n: string) => `${n} محذوف`,
    unchanged: (n: string) => `${n} أسطر دون تغيير`,
    lineAdded: "مضاف",
    lineRemoved: "محذوف",
    restore: "استعادة هذه النسخة",
    restoring: "جارٍ الاستعادة",
    restoreTitle: (n: string) => `استعادة النسخة ${n}؟`,
    restoreBody: "تُحفظ الاستعادة كنسخة جديدة فوق الحالية. لا يُحذف شيء ويمكنك الرجوع.",
    restoreConfirm: "استعادة",
    cancel: "إلغاء",
    diffLabel: "الاختلافات",
  },
};

export type VersionHistoryLabels = Partial<(typeof STRINGS)["en"]>;

export interface HistoryVersion {
  id: string;
  /** Sequence number shown to people: 1, 2, 3. */
  version: number;
  savedAt: Date | number | string;
  author?: string;
  /** What changed, in the author's words. */
  note?: string;
  /** The saved content as text: JSON, Markdown, code. It is what gets previewed and compared. */
  content: string;
}

export interface VersionHistoryProps extends Omit<ComponentProps<"div">, "children" | "onSelect"> {
  versions: readonly HistoryVersion[];
  /** The version live now. Default: the newest. */
  currentId?: string;
  selectedId?: string | null;
  defaultSelectedId?: string | null;
  onSelect?: (version: HistoryVersion | null) => void;
  /** Restore is itself a new version. Return `{ error }` to show why it failed. Without it there is no restore button. */
  onRestore?: (version: HistoryVersion) => Promise<void | { error?: string }>;
  /** Syntax for the preview and diff text. Default "text". */
  language?: string;
  /** Draw the preview yourself, for content that is not text (a form, a page). */
  renderPreview?: (version: HistoryVersion) => ReactNode;
  /** Draw the changes yourself. Receives the older and newer versions. */
  renderDiff?: (older: HistoryVersion, newer: HistoryVersion) => ReactNode;
  loading?: boolean;
  labels?: VersionHistoryLabels;
}

function DiffView({ lines, t }: { lines: DiffLine[]; t: (typeof STRINGS)["en"] }) {
  const items = useMemo(() => foldDiff(lines, 3), [lines]);
  const formatNumber = useFormatNumber();
  return (
    <div dir="ltr" role="table" aria-label={t.diffLabel} data-slot="version-diff" className="overflow-x-auto rounded-control border border-border font-mono text-code">
      {items.map((it, i) =>
        it.type === "gap" ? (
          <div role="row" key={`g${i}`} className="bg-nq-surface-soft px-3 py-1 text-center text-caption text-muted-foreground" dir="auto">
            {t.unchanged(formatNumber(it.count))}
          </div>
        ) : (
          <div role="row" key={`${it.oldLine ?? "-"}:${it.newLine ?? "-"}`} data-diff={it.type} className={cn("flex min-w-max", it.type === "add" && "bg-nq-success-soft", it.type === "del" && "bg-nq-danger-soft")}>
            <span role="cell" aria-hidden className="w-10 shrink-0 select-none px-2 text-end text-muted-foreground tabular-nums">
              {it.oldLine ?? ""}
            </span>
            <span role="cell" aria-hidden className="w-10 shrink-0 select-none px-2 text-end text-muted-foreground tabular-nums">
              {it.newLine ?? ""}
            </span>
            <span role="cell" className="w-6 shrink-0 select-none text-center font-semibold" aria-label={it.type === "add" ? t.lineAdded : it.type === "del" ? t.lineRemoved : undefined}>
              {it.type === "add" ? "+" : it.type === "del" ? "−" : ""}
            </span>
            <span role="cell" className="whitespace-pre pe-3 text-foreground">
              {it.text || " "}
            </span>
          </div>
        ),
      )}
    </div>
  );
}

/**
 * Saved versions newest first. Choose one to read it (read-only), compare it with the previous version, the current one
 * or any other, and restore it after a confirmation. Content is text, so it works for JSON, Markdown, code or
 * anything you can serialise; pass `renderPreview` and `renderDiff` for richer views. No backend: `onRestore` does the saving.
 */
export function VersionHistory({ versions, currentId, selectedId: selectedProp, defaultSelectedId = null, onSelect, onRestore, language = "text", renderPreview, renderDiff, loading, labels, className, ...rest }: VersionHistoryProps) {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  const t = { ...STRINGS[ar ? "ar" : "en"], ...labels } as (typeof STRINGS)["en"];
  const uid = useId();
  const fmt = useFormatNumber();
  const sorted = useMemo(() => sortVersions(versions), [versions]);
  const liveId = currentId ?? sorted[0]?.id;
  const [selectedState, setSelectedState] = useState<string | null>(defaultSelectedId);
  const selectedId = selectedProp === undefined ? selectedState : selectedProp;
  const selected = sorted.find((v) => v.id === selectedId) ?? null;
  const [baseline, setBaseline] = useState<string>("previous");
  const [tab, setTab] = useState("preview");
  const [confirm, setConfirm] = useState<HistoryVersion | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const choose = (v: HistoryVersion | null) => {
    if (selectedProp === undefined) setSelectedState(v?.id ?? null);
    setError(null);
    onSelect?.(v);
  };
  const index = selected ? sorted.findIndex((v) => v.id === selected.id) : -1;
  const older = index >= 0 ? sorted[index + 1] : undefined;
  const base = baseline === "previous" ? older : baseline === "current" ? sorted.find((v) => v.id === liveId) : sorted.find((v) => v.id === baseline);
  const lines = useMemo(() => (selected && base ? diffLines(base.content, selected.content) : []), [selected, base]);
  const stats = diffStats(lines);

  async function restore(v: HistoryVersion) {
    if (!onRestore) return;
    setBusy(true);
    setError(null);
    const res = await onRestore(v);
    setBusy(false);
    if (res && res.error) setError(res.error);
    setConfirm(null);
  }

  const baselineItems = [
    { value: "previous", label: t.previous },
    { value: "current", label: t.currentVersion },
    ...sorted.filter((v) => v.id !== selected?.id).map((v) => ({ value: v.id, label: t.version(fmt(v.version)) })),
  ];

  return (
    <div data-slot="version-history" aria-busy={loading || undefined} className={cn("grid min-w-0 gap-4 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:items-start", className)} {...rest}>
      <section aria-label={t.list} className={cn("min-w-0 rounded-card border border-border bg-card", selected && "hidden lg:block")}>
        {loading ? (
          <div className="flex flex-col gap-2 p-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <EmptyState icon={History} title={t.none} description={t.noneBody} />
        ) : (
          <ol className="divide-y divide-border">
            {sorted.map((v) => {
              const on = v.id === selectedId;
              return (
                <li key={v.id} data-version-row={v.version} className={cn(on && "bg-nq-selected")}>
                  <button type="button" aria-pressed={on} onClick={() => choose(on ? null : v)} className="block w-full px-4 py-3 text-start outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-label text-foreground">{t.version(fmt(v.version))}</span>
                      {v.id === liveId ? <Badge variant="success">{t.current}</Badge> : null}
                    </span>
                    <span className="block text-caption text-muted-foreground">
                      <DateTime value={v.savedAt} format={{ dateStyle: "medium", timeStyle: "short" }} />
                      {v.author ? <> · {t.by(v.author)}</> : null}
                    </span>
                    {v.note ? (
                      <span dir="auto" className="mt-1 block text-body-sm text-foreground">
                        {v.note}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <section aria-label={selected ? t.version(fmt(selected.version)) : t.pick} className={cn("min-w-0 rounded-card border border-border bg-card p-4", !selected && "hidden lg:block")}>
        {selected ? (
          <div className="flex flex-col gap-4">
            <header className="flex flex-wrap items-start gap-3">
              <Button variant="ghost" size="icon-sm" className="lg:hidden" aria-label={t.back} title={t.back} onClick={() => choose(null)}>
                <ArrowLeft aria-hidden className="rtl:-scale-x-100" />
              </Button>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-h4 text-foreground">{t.version(fmt(selected.version))}</h2>
                  {selected.id === liveId ? <Badge variant="success">{t.current}</Badge> : <Badge variant="outline">{t.readOnly}</Badge>}
                </div>
                <p className="text-body-sm text-muted-foreground">
                  <DateTime value={selected.savedAt} format={{ dateStyle: "medium", timeStyle: "short" }} />
                  {selected.author ? <> · {t.by(selected.author)}</> : null}
                </p>
                {selected.note ? (
                  <p dir="auto" className="mt-1 text-body-sm text-foreground">
                    {selected.note}
                  </p>
                ) : null}
              </div>
              {onRestore && selected.id !== liveId ? (
                <Button variant="primary" size="sm" onClick={() => setConfirm(selected)}>
                  <RotateCcw aria-hidden />
                  {t.restore}
                </Button>
              ) : null}
            </header>
            {error ? (
              <p role="alert" className="rounded-control bg-nq-danger-soft px-3 py-2 text-body-sm text-nq-danger-text">
                {error}
              </p>
            ) : null}
            <Tabs value={tab} onValueChange={(v) => setTab(v as string)}>
              <TabsList variant="underline">
                <TabsTab value="preview">{t.preview}</TabsTab>
                <TabsTab value="changes">{t.changes}</TabsTab>
              </TabsList>
              <TabsPanel value="preview">{renderPreview ? renderPreview(selected) : <CodeBlock code={selected.content} language={language} label={t.version(fmt(selected.version))} preClassName="max-h-[28rem]" />}</TabsPanel>
              <TabsPanel value="changes">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-label text-foreground" id={`${uid}-compare`}>
                      {t.compareWith}
                    </span>
                    <Select value={baseline} onValueChange={(v) => setBaseline(v as string)} items={baselineItems}>
                      <SelectTrigger aria-labelledby={`${uid}-compare`} className="w-56">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {baselineItems.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {base && stats.changed ? (
                      <span className="flex gap-2 text-body-sm tabular-nums" aria-live="polite">
                        <span className="text-nq-success-text">+ {t.added(fmt(stats.added))}</span>
                        <span className="text-nq-danger-text">− {t.removed(fmt(stats.removed))}</span>
                      </span>
                    ) : null}
                  </div>
                  {!base ? (
                    <p className="text-body-sm text-muted-foreground">{t.noPrevious}</p>
                  ) : renderDiff ? (
                    renderDiff(base, selected)
                  ) : stats.changed ? (
                    <DiffView lines={lines} t={t} />
                  ) : (
                    <p className="text-body-sm text-muted-foreground">{t.identical}</p>
                  )}
                </div>
              </TabsPanel>
            </Tabs>
          </div>
        ) : (
          <EmptyState icon={History} title={t.pick} description={t.pickBody} />
        )}
      </section>

      <AlertDialog open={confirm !== null} onOpenChange={(o) => !o && !busy && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm ? t.restoreTitle(fmt(confirm.version)) : ""}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.restoreBody}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>{t.cancel}</AlertDialogCancel>
            <Button variant="primary" loading={busy} onClick={() => confirm && void restore(confirm)}>
              {busy ? t.restoring : t.restoreConfirm}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
