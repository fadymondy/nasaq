// Strings of the copilot launcher, English and Arabic (copied from the React STRINGS table).
export const copilotLauncherStrings = {
  en: { label: "Ask AI", open: "Open assistant", close: "Close assistant" },
  ar: { label: "اسأل الذكاء الاصطناعي", open: "افتح المساعد", close: "أغلق المساعد" },
};

export type CopilotLauncherLabels = (typeof copilotLauncherStrings)["en"];

export function copilotLauncherWords(locale: string, labels?: Partial<CopilotLauncherLabels>): CopilotLauncherLabels {
  return { ...copilotLauncherStrings[locale.startsWith("ar") ? "ar" : "en"], ...labels };
}
