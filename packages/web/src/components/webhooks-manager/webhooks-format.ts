/** Pure helpers for the webhooks manager: URL and endpoint checks, event selection, delivery stats, secret display. No React here. */

export type DeliveryStatus = "success" | "failed" | "pending";

export const isSuccessCode = (code: number | undefined): boolean => code !== undefined && code >= 200 && code < 300;

/** A delivery is `pending` while queued, a 2xx is `success`, everything else `failed`. */
export function deliveryStatus(d: { code?: number; pending?: boolean; error?: string }): DeliveryStatus {
  if (d.pending) return "pending";
  return isSuccessCode(d.code) && !d.error ? "success" : "failed";
}

export type UrlProblem = "empty" | "invalid" | "insecure" | "credentials";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

/** Endpoints must be HTTPS. Plain HTTP is accepted only for localhost, so a receiver can be tried on a dev machine. */
export function validateEndpointUrl(value: string): { ok: true; url: URL } | { ok: false; problem: UrlProblem } {
  const text = value.trim();
  if (!text) return { ok: false, problem: "empty" };
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return { ok: false, problem: "invalid" };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return { ok: false, problem: "invalid" };
  if (url.username || url.password) return { ok: false, problem: "credentials" };
  if (url.protocol === "http:" && !LOCAL_HOSTS.has(url.hostname)) return { ok: false, problem: "insecure" };
  if (!url.hostname) return { ok: false, problem: "invalid" };
  return { ok: true, url };
}

export type EndpointField = "name" | "url" | "events";

export interface EndpointDraft {
  name: string;
  url: string;
  events: readonly string[];
}

export function validateEndpoint(draft: EndpointDraft): EndpointField[] {
  const out: EndpointField[] = [];
  if (!draft.name.trim()) out.push("name");
  if (!validateEndpointUrl(draft.url).ok) out.push("url");
  if (draft.events.length === 0) out.push("events");
  return out;
}

export interface EventInfo {
  id: string;
  group?: string;
}

/** Events grouped by `group` in first-seen order. Ungrouped events go under an empty key. */
export function groupEvents<T extends EventInfo>(events: readonly T[]): { group: string; events: T[] }[] {
  const map = new Map<string, T[]>();
  for (const e of events) {
    const key = e.group ?? "";
    const list = map.get(key);
    if (list) list.push(e);
    else map.set(key, [e]);
  }
  return [...map].map(([group, list]) => ({ group, events: list }));
}

/** Adds or removes `ids` from `selected`, keeping order and no duplicates. */
export function setEvents(selected: readonly string[], ids: readonly string[], on: boolean): string[] {
  const set = new Set(selected);
  for (const id of ids) {
    if (on) set.add(id);
    else set.delete(id);
  }
  return [...set];
}

export type GroupState = "none" | "some" | "all";

export function groupState(selected: readonly string[], ids: readonly string[]): GroupState {
  const set = new Set(selected);
  const n = ids.filter((id) => set.has(id)).length;
  return n === 0 ? "none" : n === ids.length ? "all" : "some";
}

/** `whsec_••••abcd`: what to show once the full secret is gone. */
export const maskSecret = (last4: string, prefix = "whsec_"): string => `${prefix}••••••••${last4}`;

export interface DeliveryStats {
  total: number;
  success: number;
  failed: number;
  pending: number;
  /** 0 to 1 over finished deliveries, or null with none. */
  rate: number | null;
}

export function deliveryStats(deliveries: readonly { status: DeliveryStatus }[]): DeliveryStats {
  const out = { total: deliveries.length, success: 0, failed: 0, pending: 0 };
  for (const d of deliveries) out[d.status] += 1;
  const finished = out.success + out.failed;
  return { ...out, rate: finished === 0 ? null : out.success / finished };
}

/** Only a finished delivery can be sent again. */
export const canReplay = (status: DeliveryStatus): boolean => status !== "pending";

export const POLL_INTERVALS: readonly number[] = [60, 300, 900, 3600, 21600];

/** `{ value: 5, unit: "minute" }` for 300 seconds: the largest whole unit. */
export function pollUnit(seconds: number): { value: number; unit: "second" | "minute" | "hour" } {
  if (seconds >= 3600 && seconds % 3600 === 0) return { value: seconds / 3600, unit: "hour" };
  if (seconds >= 60 && seconds % 60 === 0) return { value: seconds / 60, unit: "minute" };
  return { value: seconds, unit: "second" };
}

/** A source is late when it has not been polled for more than twice its interval. */
export function isSourceStale(lastAt: number | Date | string | undefined, intervalSeconds: number, now = Date.now()): boolean {
  if (lastAt === undefined) return false;
  return now - new Date(lastAt).getTime() > intervalSeconds * 2000;
}

/** Node.js snippet that checks the `X-Signature` header (hex HMAC SHA-256 of the raw body). */
export function verifySnippet(header = "x-signature"): string {
  return [
    "import { createHmac, timingSafeEqual } from 'node:crypto';",
    "",
    "export function verify(rawBody, headers, secret) {",
    `  const sent = Buffer.from(headers["${header}"] ?? "", "hex");`,
    '  const expected = createHmac("sha256", secret).update(rawBody).digest();',
    "  return sent.length === expected.length && timingSafeEqual(sent, expected);",
    "}",
  ].join("\n");
}

/** Pretty-prints JSON text; anything that does not parse comes back unchanged. */
export function prettyJson(text: string | undefined): string {
  if (!text) return "";
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}
