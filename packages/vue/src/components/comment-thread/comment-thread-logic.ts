/** Pure helpers for CommentThread: one-level threading, ordering and @mention links. */

export type CommentAuthorKind = "human" | "agent" | "client" | "bot";

export interface CommentAuthor {
  id: string;
  name: string;
  avatar?: string;
  /** Humans (the default) get no badge. Agents, clients and bots are labelled. */
  kind?: CommentAuthorKind;
}

export interface CommentMention {
  id: string;
  name: string;
}

export interface ThreadComment {
  id: string;
  author: CommentAuthor;
  /** Markdown. `@Name` for each entry of `mentions` renders as a mention chip. */
  body: string;
  createdAt: Date | string | number;
  editedAt?: Date | string | number | null;
  /** The comment this replies to. Threads are one level deep: a reply to a reply joins the same thread. */
  parentId?: string | null;
  /** Waiting for a moderator before others see it. */
  pending?: boolean;
  mentions?: readonly CommentMention[];
}

export interface ThreadNode {
  comment: ThreadComment;
  replies: ThreadComment[];
}

const time = (d: Date | string | number) => new Date(d).getTime();

/**
 * Groups a flat list into threads: roots oldest first, each with its replies oldest first. A reply whose parent is
 * itself a reply is moved under the root, and a reply whose parent is missing becomes a root.
 */
export function buildThread(comments: readonly ThreadComment[]): ThreadNode[] {
  const byId = new Map(comments.map((c) => [c.id, c]));
  const rootOf = (c: ThreadComment): string | null => {
    let cur: ThreadComment | undefined = c;
    const seen = new Set<string>();
    while (cur?.parentId && !seen.has(cur.id)) {
      seen.add(cur.id);
      const parent = byId.get(cur.parentId);
      if (!parent) return null;
      cur = parent;
    }
    return cur ? cur.id : null;
  };
  const sorted = [...comments].sort((a, b) => time(a.createdAt) - time(b.createdAt));
  const nodes = new Map<string, ThreadNode>();
  const roots: ThreadNode[] = [];
  for (const c of sorted) {
    const root = c.parentId ? rootOf(c) : c.id;
    if (root === null || root === c.id) {
      const node = { comment: c, replies: [] };
      nodes.set(c.id, node);
      roots.push(node);
    }
  }
  for (const c of sorted) {
    if (!c.parentId) continue;
    const root = rootOf(c);
    if (root !== null && root !== c.id) nodes.get(root)?.replies.push(c);
  }
  return roots;
}

/** Comments in all, replies included. Pending ones only count when `includePending` is set. */
export function countComments(comments: readonly ThreadComment[], includePending = true): number {
  return includePending ? comments.length : comments.filter((c) => !c.pending).length;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const escapeMd = (s: string) => s.replace(/[[\]\\]/g, "\\$&");

/** Prefix of the in-page links `linkMentions` writes. */
export const MENTION_HREF = "#mention-";

/** Turns `@Name` (for every known mention) into a Markdown link `[@Name](#mention-<id>)`, longest names first. */
export function linkMentions(body: string, mentions: readonly CommentMention[] | undefined): string {
  if (!mentions?.length) return body;
  const byName = new Map(mentions.map((m) => [m.name.toLowerCase(), m]));
  const names = [...byName.keys()].sort((a, b) => b.length - a.length).map(escapeRe);
  const re = new RegExp(`(?<![\\p{L}\\p{N}\\[\\\\])@(${names.join("|")})(?![\\p{L}\\p{N}])`, "giu");
  return body.replace(re, (whole, name: string) => {
    const m = byName.get(name.toLowerCase());
    return m ? `[@${escapeMd(name)}](${MENTION_HREF}${encodeURIComponent(m.id)})` : whole;
  });
}

/** The mention id of a link written by `linkMentions`, or null for any other href. */
export function mentionIdFromHref(href: string | undefined): string | null {
  return href?.startsWith(MENTION_HREF) ? decodeURIComponent(href.slice(MENTION_HREF.length)) : null;
}
