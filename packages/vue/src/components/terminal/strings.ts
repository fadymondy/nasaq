export const TERMINAL_STRINGS = {
  en: {
    title: "Terminal",
    output: "Terminal output",
    copy: "Copy output",
    copied: "Output copied to clipboard",
    copyFailed: "Could not copy",
    clear: "Clear",
    wrap: "Wrap lines",
    follow: "Follow output",
    jump: "Jump to latest",
    streaming: "Streaming",
    finished: "Finished",
    input: "Command",
    running: "Running",
    trimmed: (n: number) => (n === 1 ? "1 earlier line hidden" : `${n} earlier lines hidden`),
    empty: "No output yet",
    lines: (n: number) => (n === 1 ? "1 line" : `${n} lines`),
  },
  ar: {
    title: "الطرفية",
    output: "مخرجات الطرفية",
    copy: "نسخ المخرجات",
    copied: "تم نسخ المخرجات إلى الحافظة",
    copyFailed: "تعذر النسخ",
    clear: "مسح",
    wrap: "التفاف الأسطر",
    follow: "تتبّع المخرجات",
    jump: "الانتقال إلى الأحدث",
    streaming: "جارٍ البث",
    finished: "انتهى",
    input: "أمر",
    running: "قيد التنفيذ",
    trimmed: (n: number) => (n === 1 ? "أُخفي سطر سابق واحد" : `أُخفيت ${n} أسطر سابقة`),
    empty: "لا توجد مخرجات بعد",
    lines: (n: number) => (n === 1 ? "سطر واحد" : `${n} أسطر`),
  },
};
export type TerminalLabels = (typeof TERMINAL_STRINGS)["en"];

export type TerminalLineKind = "command" | "output" | "error" | "info" | "success";
export interface TerminalLineData {
  /** `command` shows the prompt before the text. Default `output`. */
  kind?: TerminalLineKind;
  /** The text. May contain ANSI colour codes and newlines; each line becomes a row. */
  text: string;
  id?: string | number;
}
/** A plain string is an `output` line. */
export type TerminalLine = string | TerminalLineData;
