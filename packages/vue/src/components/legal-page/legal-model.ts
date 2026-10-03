/* Pure logic of the legal page: stable anchors for sections and reading the URL hash. */

const MARKS = /[̀-ًͯ-ٰٟـ]/g;
function slugifyHeading(text: string): string {
  const slug = text
    .normalize("NFKD")
    .replace(MARKS, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]+/gu, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "section";
}

export interface LegalSectionInput {
  /** Anchor id. Default a slug of the title (Arabic titles keep their letters). */
  id?: string;
  title: string;
}

export interface LegalSectionResolved<T extends LegalSectionInput> {
  section: T;
  /** Unique anchor id. */
  id: string;
  /** 1-based position, shown as the section number. */
  number: number;
}

/** Gives every section a unique anchor: its own `id`, else a slug of the title, with "-2", "-3" added on repeats. */
export function resolveLegalSections<T extends LegalSectionInput>(sections: readonly T[]): LegalSectionResolved<T>[] {
  const used = new Set<string>();
  return sections.map((section, i) => {
    const base = section.id?.trim() || slugifyHeading(section.title);
    let id = base;
    for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
    used.add(id);
    return { section, id, number: i + 1 };
  });
}

/** The section a URL hash points to (`#data-we-collect`, percent-encoded Arabic too), or `undefined`. */
export function legalHashTarget(hash: string, ids: readonly string[]): string | undefined {
  const raw = hash.replace(/^#/, "");
  if (!raw) return undefined;
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    /* Malformed escapes: compare the raw text. */
  }
  return ids.find((id) => id === decoded || id === raw);
}

/** The link to a section for sharing: the page's own URL with the section's hash. */
export function legalSectionUrl(href: string, id: string): string {
  const base = href.split("#")[0] as string;
  return `${base}#${encodeURIComponent(id)}`;
}
