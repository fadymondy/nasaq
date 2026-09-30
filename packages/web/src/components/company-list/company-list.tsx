"use client";

import { Building2 } from "lucide-react";
import { useMemo } from "react";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import type { DataTableColumn } from "../data-table";
import {
  ActivityCell,
  CardMeta,
  EntityIdentity,
  type EntityFacet,
  EntityList,
  type EntityListProps,
  type EntityPerson,
  type EntityTag,
  PersonCell,
  TagList,
} from "../entity-list";
import { formatNumber } from "../numeric";
import { EmptyState } from "../states";

/* ------------------------------------------------------------------ strings */

const STRINGS = {
  en: {
    label: "Companies",
    search: "Search companies…",
    name: "Company",
    industry: "Industry",
    contacts: "Contacts",
    tags: "Tags",
    owner: "Owner",
    lastActivity: "Last activity",
    location: "Location",
    empty: "No companies yet",
    emptyHint: "Add a company or import a list to get started.",
  },
  ar: {
    label: "الشركات",
    search: "ابحث في الشركات…",
    name: "الشركة",
    industry: "المجال",
    contacts: "جهات الاتصال",
    tags: "الوسوم",
    owner: "المسؤول",
    lastActivity: "آخر نشاط",
    location: "الموقع",
    empty: "لا توجد شركات بعد",
    emptyHint: "أضف شركة أو استورد قائمة للبدء.",
  },
};
export type CompanyListLabels = typeof STRINGS.en;

/* ------------------------------------------------------------------ types */

export interface Company {
  id: string;
  name: string;
  /** Bare domain such as "acme.com". Always shown left-to-right. */
  domain?: string;
  /** Logo URL. Shown square and uncropped by a circle; the initials show until it loads. */
  logo?: string;
  industry?: string;
  location?: string;
  contactsCount: number;
  tags?: EntityTag[];
  owner?: EntityPerson;
  lastActivity?: Date | string | number | null;
}

export interface CompanyListProps
  extends Omit<EntityListProps<Company>, "data" | "columns" | "getRowId" | "renderCard" | "label" | "facets" | "labels"> {
  companies: Company[];
  /** The list's accessible name. Default "Companies" / "الشركات". */
  label?: string;
  /** Override any built-in string. */
  labels?: Partial<CompanyListLabels> & EntityListProps<Company>["labels"];
}

/**
 * Companies as a table or as cards: logo, domain, contact count, industry, tags, owner and last activity, with
 * search, industry / tag / owner filters and bulk select. Built on `EntityList` (and so on `DataTable`).
 */
export function CompanyList({ companies, label, labels, empty, ...props }: CompanyListProps) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const t = { ...STRINGS[locale.startsWith("ar") ? "ar" : "en"], ...labels };
  const labelKey = JSON.stringify(labels);

  const columns = useMemo<DataTableColumn<Company>[]>(
    () => [
      {
        id: "name",
        header: t.name,
        hideable: false,
        cell: (c) => (
          <EntityIdentity
            name={c.name}
            avatarName={c.name}
            avatar={c.logo}
            shape="square"
            subtitle={c.domain ? <bdi dir="ltr">{c.domain}</bdi> : undefined}
          />
        ),
        sortValue: (c) => c.name,
        searchValue: (c) => `${c.name} ${c.domain ?? ""} ${c.industry ?? ""} ${c.location ?? ""}`,
        className: "min-w-56",
      },
      { id: "industry", header: t.industry, cell: (c) => c.industry ?? "—", sortValue: (c) => c.industry },
      { id: "location", header: t.location, cell: (c) => c.location ?? "—", defaultHidden: true },
      {
        id: "contacts",
        header: t.contacts,
        cell: (c) => <span className="tabular-nums">{formatNumber(c.contactsCount, locale)}</span>,
        sortValue: (c) => c.contactsCount,
        align: "end",
      },
      { id: "tags", header: t.tags, cell: (c) => <TagList tags={c.tags ?? []} /> },
      { id: "owner", header: t.owner, cell: (c) => <PersonCell person={c.owner} />, sortValue: (c) => c.owner?.name },
      {
        id: "lastActivity",
        header: t.lastActivity,
        cell: (c) => <ActivityCell value={c.lastActivity} />,
        sortValue: (c) => (c.lastActivity == null ? null : new Date(c.lastActivity)),
        align: "end",
      },
    ],
    // `t` is rebuilt every render; its values only change with the locale or the labels.
    [locale, labelKey],
  );

  const facets = useMemo<EntityFacet<Company>[]>(() => {
    const industries = new Set<string>();
    const tags = new Set<string>();
    const owners = new Set<string>();
    for (const c of companies) {
      if (c.industry) industries.add(c.industry);
      for (const tag of c.tags ?? []) tags.add(tag.label);
      if (c.owner) owners.add(c.owner.name);
    }
    const options = (set: Set<string>) =>
      [...set].sort((a, b) => a.localeCompare(b, locale)).map((v) => ({ value: v, label: v }));
    return [
      { id: "industry", title: t.industry, options: options(industries), getValues: (c: Company) => (c.industry ? [c.industry] : []) },
      { id: "tags", title: t.tags, options: options(tags), getValues: (c: Company) => (c.tags ?? []).map((tag) => tag.label) },
      { id: "owner", title: t.owner, options: options(owners), getValues: (c: Company) => (c.owner ? [c.owner.name] : []) },
    ].filter((f) => f.options.length > 0);
  }, [companies, locale, labelKey]);

  return (
    <EntityList<Company>
      data={companies}
      columns={columns}
      getRowId={(c) => c.id}
      rowLabel={(c) => c.name}
      label={label ?? t.label}
      facets={facets}
      searchPlaceholder={t.search}
      defaultSort={{ id: "name", direction: "asc" }}
      empty={empty ?? <EmptyState icon={Building2} title={t.empty} description={t.emptyHint} className="border-0" />}
      labels={labels as EntityListProps<Company>["labels"]}
      renderCard={(c) => (
        <div className="flex min-w-0 flex-col gap-3">
          <EntityIdentity className="pe-(--entity-card-controls)"
            name={c.name}
            avatarName={c.name}
            avatar={c.logo}
            shape="square"
            size="lg"
            subtitle={c.domain ? <bdi dir="ltr">{c.domain}</bdi> : c.industry}
          />
          <div className="flex flex-col gap-1.5">
            {c.industry ? <CardMeta label={t.industry}>{c.industry}</CardMeta> : null}
            <CardMeta label={t.contacts}>
              <span className="tabular-nums">{formatNumber(c.contactsCount, locale)}</span>
            </CardMeta>
            <CardMeta label={t.owner}>
              <PersonCell person={c.owner} />
            </CardMeta>
            <CardMeta label={t.lastActivity}>
              <ActivityCell value={c.lastActivity} />
            </CardMeta>
          </div>
          {c.tags?.length ? <TagList tags={c.tags} /> : null}
        </div>
      )}
      {...props}
    />
  );
}
