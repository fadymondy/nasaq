// The pure helpers of the issue view's Alpine modules (ported from issue-logic.ts of the React component).

/** Hours as "1h 30m" ("0m" for zero). */
export function issueFormatHours(hours: number): string {
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return [h ? `${h}h` : "", m || !h ? `${m}m` : ""].filter(Boolean).join(" ");
}

/** Parses an estimate typed as "2", "1.5", "1,5" or "2h 30m". Null for empty or invalid input. */
export function issueParseEstimate(text: string): number | null {
  const s = text.trim().toLowerCase().replace(",", ".");
  if (!s) return null;
  const hm = /^(?:(\d+(?:\.\d+)?)\s*h)?\s*(?:(\d+)\s*m)?$/.exec(s);
  if (hm && (hm[1] || hm[2])) return Number(hm[1] ?? 0) + Number(hm[2] ?? 0) / 60;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Plain text (blank lines between paragraphs) as the HTML the description stores. */
export function issueTextToHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
}
