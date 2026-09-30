/** Pure helpers for workspace URLs. No React. */

export const SLUG_MIN = 3;
export const SLUG_MAX = 40;

const SLUG = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

/**
 * "Sahab Studio!" becomes "sahab-studio". Latin letters and digits only: accents are folded and everything
 * else (including Arabic, which has no reliable Latin form) becomes a dash, so an Arabic-only name gives an
 * empty slug and the person types one.
 */
export function slugify(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX)
    .replace(/-+$/g, "");
}

export type SlugProblem = "empty" | "short" | "long" | "format";

/** Why a slug is not acceptable, or null. */
export function slugProblem(slug: string): SlugProblem | null {
  if (!slug) return "empty";
  if (slug.length < SLUG_MIN) return "short";
  if (slug.length > SLUG_MAX) return "long";
  if (!SLUG.test(slug)) return "format";
  return null;
}

/** The phrase to type before deleting: the workspace name, trimmed. */
export const deletePhrase = (name: string) => name.trim();
