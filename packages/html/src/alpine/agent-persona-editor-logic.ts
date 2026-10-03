export interface PersonaLike {
  name: string;
  tagline?: string;
  color: string;
  icon: string;
  persona: string;
  traits: readonly string[];
  model?: string;
  greeting?: string;
}

export type PersonaProblem = "nameRequired" | "personaTooLong";

/** True when any saved field differs. Trait order matters. */
export function isPersonaDirty(a: PersonaLike, b: PersonaLike): boolean {
  return (
    a.name !== b.name ||
    (a.tagline ?? "") !== (b.tagline ?? "") ||
    a.color !== b.color ||
    a.icon !== b.icon ||
    a.persona !== b.persona ||
    (a.model ?? "") !== (b.model ?? "") ||
    (a.greeting ?? "") !== (b.greeting ?? "") ||
    a.traits.length !== b.traits.length ||
    a.traits.some((t, i) => t !== b.traits[i])
  );
}

/** What blocks saving. */
export function personaProblems(p: PersonaLike, maxLength: number): PersonaProblem[] {
  const out: PersonaProblem[] = [];
  if (!p.name.trim()) out.push("nameRequired");
  if (maxLength > 0 && p.persona.length > maxLength) out.push("personaTooLong");
  return out;
}

/** Adds a `## Heading` section at the end of the Markdown, with a blank line before it. Does nothing if the heading is already there. */
export function appendSection(markdown: string, heading: string): string {
  const title = heading.trim();
  if (!title) return markdown;
  const has = markdown.split(/\r?\n/).some((line) => line.replace(/^#{1,6}\s+/, "").trim().toLowerCase() === title.toLowerCase() && /^#{1,6}\s/.test(line));
  if (has) return markdown;
  const base = markdown.replace(/\s+$/, "");
  return `${base}${base ? "\n\n" : ""}## ${title}\n\n`;
}

/** Words in a text, splitting on whitespace. Empty text is 0. */
export function countWords(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}
