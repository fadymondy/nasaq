"use client";

import { Check, Link2, TriangleAlert } from "lucide-react";
import { type ComponentProps, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Alert } from "../alert";
import { TableOfContents, useActiveHeading } from "../blog-post";
import { copyText } from "../copy-button";
import { Icon } from "../icon";
import { Markdown } from "../markdown";
import { DateTime } from "../numeric";
import { Text } from "../text";
import { legalHashTarget, legalSectionUrl, resolveLegalSections } from "./legal-model";

const STRINGS = {
  en: {
    documents: "Legal documents",
    onThisPage: "On this page",
    updated: "Last updated",
    effective: "Effective",
    version: "Version {version}",
    draftTitle: "Draft",
    draft: "This document is a draft and is not yet in force.",
    copyLink: "Copy link to this section",
    linkCopied: "Link copied",
  },
  ar: {
    documents: "المستندات القانونية",
    onThisPage: "في هذه الصفحة",
    updated: "آخر تحديث",
    effective: "ساري من",
    version: "الإصدار {version}",
    draftTitle: "مسودة",
    draft: "هذا المستند مسودة وليس ساريًا بعد.",
    copyLink: "انسخ رابط هذا القسم",
    linkCopied: "تم نسخ الرابط",
  },
};

export type LegalPageLabels = Partial<(typeof STRINGS)["en"]>;

const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ""));

export interface LegalSection {
  /** Anchor id, kept stable across edits so shared links keep working. Default a slug of the title. */
  id?: string;
  title: string;
  /** The section text as Markdown. */
  body: string;
}

export interface LegalDocument {
  id: string;
  title: string;
  /** One line under the title. */
  summary?: string;
  /** ISO date of the last change. */
  updated: string;
  /** ISO date the terms take effect. */
  effective?: string;
  version?: string;
  /** Shows a notice that the document is not in force. */
  draft?: boolean;
  sections: LegalSection[];
}

export interface LegalPageProps extends Omit<ComponentProps<"div">, "children" | "title"> {
  /** The document to show. */
  document: LegalDocument;
  /** The documents of the site (terms, privacy, cookies). With two or more, a switcher is shown. */
  documents?: { id: string; title: string }[];
  /** A document was picked in the switcher. Navigate, then pass the new `document`. */
  onSelectDocument?: (id: string) => void;
  /** After a section link was copied. The page also announces it. */
  onCopyLink?: (url: string) => void;
  /** Under the last section: contact details or a link to support. */
  footer?: ReactNode;
  /** Pixels headings keep from the top when scrolled to. Default 96. */
  scrollOffset?: number;
  labels?: LegalPageLabels;
}

/**
 * Terms, privacy and similar documents: a switcher between documents, the date it was updated, a draft notice, numbered
 * sections with `#anchors` you can copy, and an "On this page" rail. The text is one readable column (about 68
 * characters). A link with a `#section` hash scrolls to its section on load.
 */
export function LegalPage({ document: doc, documents, onSelectDocument, onCopyLink, footer, scrollOffset = 96, labels, className, ...props }: LegalPageProps) {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  const t = { ...STRINGS[ar ? "ar" : "en"], ...labels };
  const bodyRef = useRef<HTMLDivElement>(null);
  const resolved = useMemo(() => resolveLegalSections(doc.sections), [doc.sections]);
  const items = useMemo(() => resolved.map((r) => ({ id: r.id, text: r.section.title, level: 2, line: r.number })), [resolved]);
  const active = useActiveHeading(
    resolved.map((r) => r.id),
    bodyRef,
    scrollOffset,
  );
  const [copied, setCopied] = useState<string | null>(null);

  // Open on the section the URL points to.
  // biome-ignore lint/correctness/useExhaustiveDependencies: run when the document changes, not on every section edit
  useEffect(() => {
    const target = legalHashTarget(window.location.hash, resolved.map((r) => r.id));
    if (target) document.getElementById(target)?.scrollIntoView({ block: "start" });
  }, [doc.id]);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(null), 1800);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copyLink = async (id: string) => {
    const url = legalSectionUrl(window.location.href, id);
    if (await copyText(url)) {
      setCopied(id);
      onCopyLink?.(url);
    }
  };

  return (
    <div data-slot="legal-page" className={cn("mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:flex-row lg:gap-12", className)} {...props}>
      <div className="flex min-w-0 flex-1 flex-col gap-8">
        {documents && documents.length > 1 ? (
          <nav aria-label={t.documents} className="flex flex-wrap gap-1 border-b border-border pb-3">
            {documents.map((d) => {
              const current = d.id === doc.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  aria-current={current ? "page" : undefined}
                  onClick={() => !current && onSelectDocument?.(d.id)}
                  className={cn(
                    "h-control-sm rounded-control px-3 text-body-sm outline-none transition-colors duration-150 ease-nq focus-visible:outline-2 focus-visible:outline-nq-focus",
                    current ? "bg-nq-selected font-medium text-foreground" : "text-muted-foreground hover:bg-nq-hover hover:text-foreground",
                  )}
                >
                  {d.title}
                </button>
              );
            })}
          </nav>
        ) : null}

        <header className="flex max-w-[68ch] flex-col gap-3">
          <Text as="h1" variant="h1" dir="auto" className="text-start">
            {doc.title}
          </Text>
          {doc.summary ? (
            <p dir="auto" className="text-body-lg text-muted-foreground">
              {doc.summary}
            </p>
          ) : null}
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-muted-foreground">
            <span>
              {t.updated} <DateTime value={doc.updated} format={{ dateStyle: "long" }} />
            </span>
            {doc.effective ? (
              <span>
                {t.effective} <DateTime value={doc.effective} format={{ dateStyle: "long" }} />
              </span>
            ) : null}
            {doc.version ? <bdi>{fill(t.version, { version: doc.version })}</bdi> : null}
          </p>
          {doc.draft ? (
            <Alert tone="warning" title={t.draftTitle} icon={TriangleAlert}>
              {t.draft}
            </Alert>
          ) : null}
        </header>

        <div ref={bodyRef} className="flex max-w-[68ch] flex-col gap-10">
          {resolved.map(({ section, id, number }) => (
            <section key={id} aria-labelledby={`${id}-title`} data-slot="legal-section" className="group/section flex flex-col gap-3">
              <h2 id={id} style={{ scrollMarginTop: scrollOffset }} className="flex items-baseline gap-3 text-start">
                <span aria-hidden className="text-h3 font-semibold tabular-nums text-muted-foreground">
                  {number}.
                </span>
                <Text as="span" variant="h2" dir="auto" id={`${id}-title`} className="min-w-0">
                  {section.title}
                </Text>
                <button
                  type="button"
                  aria-label={fill(`${t.copyLink}: {title}`, { title: section.title })}
                  onClick={() => void copyLink(id)}
                  className="ms-1 inline-flex size-6 shrink-0 items-center justify-center self-center rounded-control text-muted-foreground opacity-0 outline-none transition-opacity duration-150 hover:text-foreground focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-nq-focus group-hover/section:opacity-100 pointer-coarse:opacity-100"
                >
                  <Icon icon={copied === id ? Check : Link2} className="size-4" />
                </button>
              </h2>
              <Markdown className="gap-4 text-body leading-relaxed">{section.body}</Markdown>
            </section>
          ))}
        </div>

        {footer ? <div className="max-w-[68ch] border-t border-border pt-6 text-body-sm text-muted-foreground">{footer}</div> : null}
        <p role="status" className="sr-only">
          {copied ? t.linkCopied : ""}
        </p>
      </div>

      <aside className="hidden w-56 shrink-0 lg:block">
        <div className="sticky top-20">
          <TableOfContents items={items} activeId={active} title={t.onThisPage} />
        </div>
      </aside>
    </div>
  );
}
