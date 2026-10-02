export const STRINGS = {
  en: {
    copyMenu: "Copy options",
    copyCode: "Copy code",
    copyMarkdown: "Copy as Markdown",
    promptFor: "Copy prompt for",
    openIn: "Open in",
    copiedCode: "Code copied to clipboard",
    copiedMarkdown: "Markdown copied to clipboard",
    copiedPrompt: (target: string) => `Prompt for ${target} copied to clipboard`,
    copyFailed: "Could not copy",
    tooLong: "Too long for a link. Prompt copied instead.",
    copyCommand: "Copy command",
    commandCopied: "Command copied to clipboard",
    command: "Command",
    ai: "Use with AI",
    tabsLabel: "Code variants",
  },
  ar: {
    copyMenu: "خيارات النسخ",
    copyCode: "نسخ الشيفرة",
    copyMarkdown: "نسخ بصيغة Markdown",
    promptFor: "نسخ موجّه لـ",
    openIn: "فتح في",
    copiedCode: "تم نسخ الشيفرة إلى الحافظة",
    copiedMarkdown: "تم نسخ Markdown إلى الحافظة",
    copiedPrompt: (target: string) => `تم نسخ الموجّه الخاص بـ ${target} إلى الحافظة`,
    copyFailed: "تعذر النسخ",
    tooLong: "النص أطول من أن يُفتح برابط. تم نسخ الموجّه بدلًا من ذلك.",
    copyCommand: "نسخ الأمر",
    commandCopied: "تم نسخ الأمر إلى الحافظة",
    command: "أمر",
    ai: "استخدم مع الذكاء الاصطناعي",
    tabsLabel: "صيغ الشيفرة",
  },
};

export type CodeVariantLabels = (typeof STRINGS)["en"];

/** Brand names are proper nouns: shown as text, never translated and not drawn as logos. */
export const TARGET_NAME: Record<"claude" | "chatgpt" | "cursor", string> = { claude: "Claude", chatgpt: "ChatGPT", cursor: "Cursor" };

export type CodeCopyKind = "code" | "markdown" | "prompt" | "open";

export interface CodeTab {
  /** Stable id, also the key used to sync tabs across blocks. Default: the label. */
  value?: string;
  /** The tab text: `pnpm`, `curl`, `Python`. Shown left-to-right. */
  label: string;
  code: string;
  language?: string;
  /** Names the code region for screen readers and the AI prompt. Default: the label. */
  filename?: string;
}
