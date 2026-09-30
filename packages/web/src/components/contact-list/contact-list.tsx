"use client";

import { Users } from "lucide-react";
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
import { EmptyState } from "../states";
import { Status, type StatusTone } from "../status";

/* ------------------------------------------------------------------ strings */

const STRINGS = {
  en: {
    label: "Contacts",
    search: "Search contacts…",
    name: "Name",
    company: "Company",
    phone: "Phone",
    stage: "Stage",
    tags: "Tags",
    owner: "Owner",
    lastActivity: "Last activity",
    stages: { lead: "Lead", prospect: "Prospect", customer: "Customer", churned: "Churned" },
    unassigned: "Unassigned",
    empty: "No contacts yet",
    emptyHint: "Add a contact or import a list to get started.",
  },
  ar: {
    label: "جهات الاتصال",
    search: "ابحث في جهات الاتصال…",
    name: "الاسم",
    company: "الشركة",
    phone: "الهاتف",
    stage: "المرحلة",
    tags: "الوسوم",
    owner: "المسؤول",
    lastActivity: "آخر نشاط",
    stages: { lead: "عميل محتمل", prospect: "مهتم", customer: "عميل", churned: "منقطع" },
    unassigned: "غير معيّن",
    empty: "لا توجد جهات اتصال بعد",
    emptyHint: "أضف جهة اتصال أو استورد قائمة للبدء.",
  },
};
export type ContactListLabels = Omit<typeof STRINGS.en, "stages"> & { stages: Record<ContactStage, string> };

/* ------------------------------------------------------------------ types */

export type ContactStage = "lead" | "prospect" | "customer" | "churned";

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  /** Company name, shown as plain text. */
  company?: string;
  jobTitle?: string;
  stage?: ContactStage;
  tags?: EntityTag[];
  owner?: EntityPerson;
  lastActivity?: Date | string | number | null;
}

const STAGE_TONE: Record<ContactStage, StatusTone> = { lead: "info", prospect: "warning", customer: "success", churned: "neutral" };
const STAGE_ORDER: ContactStage[] = ["lead", "prospect", "customer", "churned"];

export interface ContactListProps
  extends Omit<EntityListProps<Contact>, "data" | "columns" | "getRowId" | "renderCard" | "label" | "facets" | "labels"> {
  contacts: Contact[];
  /** The list's accessible name. Default "Contacts" / "جهات الاتصال". */
  label?: string;
  /** Override any built-in string, including the stage names. */
  labels?: Partial<Omit<ContactListLabels, "stages">> & { stages?: Partial<ContactListLabels["stages"]> } & EntityListProps<Contact>["labels"];
}

/**
 * Contacts as a table or as cards, with search, stage / tag / owner filters, bulk select, tags, owner and
 * last activity. Built on `EntityList` (and so on `DataTable`): pass `bulkActions`, `toolbar`, `rowActions`
 * and `onRowClick` to wire it up.
 */
export function ContactList({ contacts, label, labels, empty, ...props }: ContactListProps) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const base = STRINGS[locale.startsWith("ar") ? "ar" : "en"];
  const t = { ...base, ...labels, stages: { ...base.stages, ...labels?.stages } };

  const columns = useMemo<DataTableColumn<Contact>[]>(
    () => [
      {
        id: "name",
        header: t.name,
        hideable: false,
        cell: (c) => (
          <EntityIdentity
            name={c.name}
            avatarName={c.name}
            avatar={c.avatar}
            subtitle={<bdi dir="ltr">{c.email}</bdi>}
          />
        ),
        sortValue: (c) => c.name,
        searchValue: (c) => `${c.name} ${c.email} ${c.phone ?? ""} ${c.company ?? ""} ${c.jobTitle ?? ""}`,
        className: "min-w-56",
      },
      {
        id: "company",
        header: t.company,
        cell: (c) => (
          <span className="flex min-w-0 flex-col">
            <span className="truncate">{c.company ?? "—"}</span>
            {c.jobTitle ? <span className="truncate text-body-sm text-muted-foreground">{c.jobTitle}</span> : null}
          </span>
        ),
        sortValue: (c) => c.company,
      },
      {
        id: "phone",
        header: t.phone,
        cell: (c) => (c.phone ? <bdi dir="ltr" className="tabular-nums">{c.phone}</bdi> : "—"),
        defaultHidden: true,
      },
      {
        id: "stage",
        header: t.stage,
        cell: (c) => (c.stage ? <Status tone={STAGE_TONE[c.stage]}>{t.stages[c.stage]}</Status> : "—"),
        sortValue: (c) => (c.stage ? STAGE_ORDER.indexOf(c.stage) : null),
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
    [locale, JSON.stringify(labels)],
  );

  const facets = useMemo<EntityFacet<Contact>[]>(() => {
    const tags = new Map<string, EntityTag>();
    const owners = new Set<string>();
    for (const c of contacts) {
      for (const tag of c.tags ?? []) tags.set(tag.label, tag);
      if (c.owner) owners.add(c.owner.name);
    }
    return [
      {
        id: "stage",
        title: t.stage,
        options: STAGE_ORDER.map((s) => ({ value: s, label: t.stages[s] })),
        getValues: (c: Contact) => (c.stage ? [c.stage] : []),
      },
      {
        id: "tags",
        title: t.tags,
        options: [...tags.keys()].sort((a, b) => a.localeCompare(b, locale)).map((v) => ({ value: v, label: v })),
        getValues: (c: Contact) => (c.tags ?? []).map((tag) => tag.label),
      },
      {
        id: "owner",
        title: t.owner,
        options: [...owners].sort((a, b) => a.localeCompare(b, locale)).map((v) => ({ value: v, label: v })),
        getValues: (c: Contact) => (c.owner ? [c.owner.name] : []),
      },
    ].filter((f) => f.options.length > 0);
  }, [contacts, locale, JSON.stringify(labels)]);

  return (
    <EntityList<Contact>
      data={contacts}
      columns={columns}
      getRowId={(c) => c.id}
      rowLabel={(c) => c.name}
      label={label ?? t.label}
      facets={facets}
      searchPlaceholder={t.search}
      defaultSort={{ id: "name", direction: "asc" }}
      empty={empty ?? <EmptyState icon={Users} title={t.empty} description={t.emptyHint} className="border-0" />}
      labels={labels as EntityListProps<Contact>["labels"]}
      renderCard={(c) => (
        <div className="flex min-w-0 flex-col gap-3">
          <EntityIdentity className="pe-(--entity-card-controls)" name={c.name} avatarName={c.name} avatar={c.avatar} size="lg" subtitle={c.jobTitle ?? c.company} />
          <bdi dir="ltr" className="truncate text-body-sm text-muted-foreground">
            {c.email}
          </bdi>
          <div className="flex flex-col gap-1.5">
            {c.stage ? (
              <CardMeta label={t.stage}>
                <Status tone={STAGE_TONE[c.stage]}>{t.stages[c.stage]}</Status>
              </CardMeta>
            ) : null}
            {c.company && c.jobTitle ? <CardMeta label={t.company}>{c.company}</CardMeta> : null}
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
