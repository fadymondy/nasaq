export const copilotDockStrings = {
  en: {
    open: "Open assistant",
    close: "Close assistant",
    panel: "Assistant",
    layout: "Panel position",
    end: "Dock right",
    start: "Dock left",
    bottom: "Dock bottom",
    float: "Floating window",
    expand: "Expand to full page",
    collapse: "Exit full page",
    ask: "Ask anything…",
    send: "Send",
  },
  ar: {
    open: "افتح المساعد",
    close: "أغلق المساعد",
    panel: "المساعد",
    layout: "مكان اللوحة",
    end: "ثبّت يسارًا",
    start: "ثبّت يمينًا",
    bottom: "ثبّت بالأسفل",
    float: "نافذة عائمة",
    expand: "وسّع لملء الصفحة",
    collapse: "اخرج من ملء الصفحة",
    ask: "اسأل عن أي شيء…",
    send: "أرسل",
  },
};

export type CopilotDockLabels = (typeof copilotDockStrings)["en"];

export function copilotDockWords(locale: string, labels?: Partial<CopilotDockLabels>): CopilotDockLabels {
  return { ...copilotDockStrings[locale.startsWith("ar") ? "ar" : "en"], ...labels };
}
