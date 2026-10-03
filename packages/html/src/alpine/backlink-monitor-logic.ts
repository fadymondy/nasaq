/*
 * Backlink monitor maths: is a link new, lost or toxic, how many domains link to you, and the daily gained/lost series.
 * Pure, shared by the UI and the tests. Dates are ISO strings (day precision is enough).
 */

export type BacklinkStatus = "new" | "lost" | "active";

export interface BacklinkLike {
  id: string;
  sourceUrl: string;
  /** ISO date the link was first seen. */
  firstSeen: string;
  /** ISO date the link was found gone. Absent while the link is live. */
  lostAt?: string;
  /** 0 to 100, higher is spammier. */
  spamScore: number;
  /** A link you have already told search engines to ignore. */
  disavowed?: boolean;
}

/** From this spam score a link counts as toxic. */
export const TOXIC_SPAM_SCORE = 60;
/** A live link first seen within this many days is "new". */
export const NEW_LINK_DAYS = 7;

const DAY = 86_400_000;

function time(iso: string): number {
  return new Date(iso).getTime();
}

/** Lost beats new: a link found gone is lost even if it appeared this week. */
export function backlinkStatus(link: Pick<BacklinkLike, "firstSeen" | "lostAt">, now: number = Date.now(), newDays: number = NEW_LINK_DAYS): BacklinkStatus {
  if (link.lostAt) return "lost";
  return now - time(link.firstSeen) <= newDays * DAY ? "new" : "active";
}

/** A spam score at or above the threshold. Links already disavowed are not toxic any more: the problem is handled. */
export function isToxic(link: Pick<BacklinkLike, "spamScore" | "disavowed">, threshold: number = TOXIC_SPAM_SCORE): boolean {
  return !link.disavowed && link.spamScore >= threshold;
}

/** The host of a link source, lowercased and without "www.". Falls back to the input when it is not a URL. */
export function domainOf(url: string): string {
  try {
    return new URL(/^[a-z]+:\/\//i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

/** How many different domains have at least one live link to you. */
export function referringDomains(links: readonly BacklinkLike[]): number {
  return new Set(links.filter((l) => !l.lostAt).map((l) => domainOf(l.sourceUrl))).size;
}

export interface BacklinkSummary {
  total: number;
  active: number;
  new: number;
  lost: number;
  toxic: number;
  domains: number;
}

/** Counts per status. `total` is every link seen; `active` and `new` are live links, `lost` is gone. */
export function summarizeBacklinks(links: readonly BacklinkLike[], now: number = Date.now(), newDays: number = NEW_LINK_DAYS): BacklinkSummary {
  const out: BacklinkSummary = { total: links.length, active: 0, new: 0, lost: 0, toxic: 0, domains: referringDomains(links) };
  for (const l of links) {
    const s = backlinkStatus(l, now, newDays);
    if (s === "lost") out.lost += 1;
    else {
      out.active += 1;
      if (s === "new") out.new += 1;
    }
    if (!l.lostAt && isToxic(l)) out.toxic += 1;
  }
  return out;
}

/** What changed between two snapshots of link ids: added ones and removed ones. */
export function diffBacklinks(previousIds: readonly string[], currentIds: readonly string[]): { added: string[]; removed: string[] } {
  const prev = new Set(previousIds);
  const cur = new Set(currentIds);
  return { added: currentIds.filter((id) => !prev.has(id)), removed: previousIds.filter((id) => !cur.has(id)) };
}

function dayKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** One row per day for the last `days` days, oldest first, with how many links were gained and lost that day. */
export function dailyLinkSeries(links: readonly BacklinkLike[], days: number, now: number = Date.now()): { date: string; gained: number; lost: number }[] {
  const rows = new Map<string, { date: string; gained: number; lost: number }>();
  for (let i = days - 1; i >= 0; i--) {
    const date = dayKey(now - i * DAY);
    rows.set(date, { date, gained: 0, lost: 0 });
  }
  for (const l of links) {
    const g = rows.get(l.firstSeen.slice(0, 10));
    if (g) g.gained += 1;
    if (l.lostAt) {
      const x = rows.get(l.lostAt.slice(0, 10));
      if (x) x.lost += 1;
    }
  }
  return [...rows.values()];
}
