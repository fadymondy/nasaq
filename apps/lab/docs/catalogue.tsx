import { Badge, cn, Input, Text } from "@nasaq/web";
import { useEffect, useMemo, useState } from "react";
import { components } from "virtual:nasaq-catalogue";
import { docsHref, storyHref } from "./nav";

/**
 * Two live views for the docs. The component list is read from the READMEs at build time (see
 * .storybook/catalogue-plugin.ts); the page-template list is read from the built story index, so both
 * stay correct without anyone editing a list.
 */

const CATEGORY_LABEL: Record<string, string> = {
  layout: "Layout",
  navigation: "Navigation",
  actions: "Actions",
  forms: "Forms",
  pickers: "Pickers",
  "data-display": "Data display",
  charts: "Charts",
  commerce: "Commerce",
  collaboration: "Collaboration",
  auth: "Auth",
  account: "Account",
  developer: "Developer",
  ai: "AI",
  workflow: "Workflow",
  analytics: "Analytics",
  crm: "CRM",
  editors: "Editors",
  health: "Health",
  feedback: "Feedback",
  overlays: "Overlays",
  brand: "Brand",
  typography: "Typography",
  utilities: "Utilities",
};
const label = (c: string) => CATEGORY_LABEL[c] ?? c.replace(/(^|-)(\w)/g, (_, s, ch: string) => (s ? " " : "") + ch.toUpperCase());

const linkClass =
  "rounded-[2px] outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus";

export function ComponentCatalogue() {
  const [q, setQ] = useState("");
  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const shown = needle ? components.filter((c) => `${c.name} ${c.title} ${c.summary}`.toLowerCase().includes(needle)) : components;
    const byCat = new Map<string, typeof components>();
    for (const c of shown) byCat.set(c.category, [...(byCat.get(c.category) ?? []), c]);
    return [...byCat].sort(([a], [b]) => label(a).localeCompare(label(b)));
  }, [q]);
  const shownCount = groups.reduce((n, [, list]) => n + list.length, 0);

  return (
    <div className="mt-8 flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter components"
          aria-label="Filter components"
          className="max-w-xs"
        />
        <Text as="span" variant="caption" className="text-muted-foreground" aria-live="polite">
          {shownCount} of {components.length} components
        </Text>
      </div>
      <nav aria-label="Categories" className="flex flex-wrap gap-2">
        {groups.map(([cat, list]) => (
          <a key={cat} href={`#cat-${cat}`} className={cn("text-body-sm text-muted-foreground hover:text-foreground", linkClass)}>
            {label(cat)} <span className="text-caption">({list.length})</span>
          </a>
        ))}
      </nav>
      {groups.map(([cat, list]) => (
        <section key={cat} id={`cat-${cat}`} aria-labelledby={`h-${cat}`} className="scroll-mt-6 border-t border-border pt-5">
          <Text as="h2" variant="h3" id={`h-${cat}`} className="mb-3 text-start">
            {label(cat)}
          </Text>
          <ul className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {list.map((c) => (
              <li key={c.name} className="min-w-0">
                <a href={c.story ? docsHref(c.story) : undefined} target="_top" className={cn("font-medium text-foreground", linkClass)}>
                  {c.title}
                </a>
                {c.status && c.status !== "stable" ? (
                  <Badge variant="outline" className="ms-2 align-middle">
                    {c.status}
                  </Badge>
                ) : null}
                <p className="text-body-sm text-muted-foreground">{c.summary}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

interface IndexEntry {
  id: string;
  title: string;
  name: string;
  type: "story" | "docs";
}

/** Every `Pages/<group>/<name>` template, grouped, read from the story index of whichever build is running. */
export function PageTemplates() {
  const [entries, setEntries] = useState<IndexEntry[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    fetch(new URL("../index.json", window.location.href))
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j: { entries: Record<string, IndexEntry> }) => live && setEntries(Object.values(j.entries)))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, []);

  const groups = useMemo(() => {
    const first = new Map<string, IndexEntry>();
    for (const e of entries ?? []) {
      if (e.type !== "story" || !e.title.startsWith("Pages/") || first.has(e.title)) continue;
      first.set(e.title, e);
    }
    const byGroup = new Map<string, { title: string; name: string; id: string }[]>();
    for (const [title, e] of first) {
      const [, group = "Other", ...rest] = title.split("/");
      byGroup.set(group, [...(byGroup.get(group) ?? []), { title, name: rest.join(" / ") || group, id: e.id }]);
    }
    return [...byGroup].sort(([a], [b]) => a.localeCompare(b));
  }, [entries]);

  if (failed) return <p className="mt-6 text-body-sm text-muted-foreground">The page list could not be loaded. Open the Pages section in the sidebar instead.</p>;
  if (!entries) return <p className="mt-6 text-body-sm text-muted-foreground">Loading the page list</p>;
  const total = groups.reduce((n, [, l]) => n + l.length, 0);
  return (
    <div className="mt-8 flex flex-col gap-6">
      <Text as="p" variant="caption" className="text-muted-foreground">
        {total} page templates in {groups.length} groups
      </Text>
      {groups.map(([group, list]) => (
        <section key={group} aria-labelledby={`pg-${group}`} className="border-t border-border pt-5">
          <Text as="h2" variant="h3" id={`pg-${group}`} className="mb-3 text-start">
            {group}
          </Text>
          <ul className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((p) => (
              <li key={p.title}>
                <a href={storyHref(p.id)} target="_top" className={cn("text-body-sm text-foreground", linkClass)}>
                  {p.name}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
