// Pure helpers of the chat widget (the offline form rules and the file filter of chat-widget.tsx).

export const CHAT_WIDGET_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ChatWidgetOfflineForm {
  name: string;
  email: string;
  message: string;
}

/** The error text of each offline-form field, "" when it is fine. */
export function chatWidgetOfflineErrors(form: ChatWidgetOfflineForm, words: { formRequired: string; formInvalidEmail: string }): ChatWidgetOfflineForm {
  return {
    name: form.name.trim() ? "" : words.formRequired,
    email: !form.email.trim() ? words.formRequired : CHAT_WIDGET_EMAIL.test(form.email.trim()) ? "" : words.formInvalidEmail,
    message: form.message.trim() ? "" : words.formRequired,
  };
}

/** Replaces `{name}`-style placeholders. */
export function chatWidgetFill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => values[k] ?? m);
}

/** Splits `files` into those within `maxMb` and the first one that is too big (for the error text). */
export function chatWidgetSplitFiles(files: File[], maxMb: number): { ok: File[]; tooBig: File[] } {
  const ok: File[] = [];
  const tooBig: File[] = [];
  for (const f of files) (f.size > maxMb * 1024 * 1024 ? tooBig : ok).push(f);
  return { ok, tooBig };
}

/** Reads the `{ error }` out of whatever the host resolved the event's waitUntil promises with. */
export function chatWidgetErrorOf(results: unknown[]): string {
  for (const r of results) {
    if (r && typeof r === "object" && "error" in r && typeof (r as { error?: unknown }).error === "string" && (r as { error: string }).error) return (r as { error: string }).error;
  }
  return "";
}
