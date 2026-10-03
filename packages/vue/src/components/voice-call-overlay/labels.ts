// Strings of the voice call overlay, English and Arabic (copied from the React STRINGS table).
import type { VoiceCallState } from "./voice-call-math";

export const voiceCallStrings = {
  en: {
    label: "Voice call",
    states: { connecting: "Connecting", listening: "Listening", thinking: "Thinking", speaking: "Speaking", error: "Connection lost" } as Record<VoiceCallState, string>,
    muted: "Muted. The agent cannot hear you.",
    mute: "Mute microphone",
    unmute: "Unmute microphone",
    captionsOn: "Show captions",
    captionsOff: "Hide captions",
    end: "End call",
    ending: "Ending call",
    retry: "Reconnect",
    you: "You",
    duration: "Call length",
    level: "Voice level",
    captions: "Captions",
    noCaptions: "Captions appear here as you talk.",
    interrupt: "Interrupt",
  },
  ar: {
    label: "مكالمة صوتية",
    states: { connecting: "جارٍ الاتصال", listening: "يستمع", thinking: "يفكّر", speaking: "يتحدث", error: "انقطع الاتصال" } as Record<VoiceCallState, string>,
    muted: "الميكروفون مكتوم. لا يسمعك الوكيل.",
    mute: "كتم الميكروفون",
    unmute: "إلغاء كتم الميكروفون",
    captionsOn: "إظهار الترجمة النصية",
    captionsOff: "إخفاء الترجمة النصية",
    end: "إنهاء المكالمة",
    ending: "جارٍ إنهاء المكالمة",
    retry: "إعادة الاتصال",
    you: "أنت",
    duration: "مدة المكالمة",
    level: "مستوى الصوت",
    captions: "الترجمة النصية",
    noCaptions: "تظهر الترجمة النصية هنا أثناء حديثك.",
    interrupt: "مقاطعة",
  },
};

export type VoiceCallLabels = Omit<(typeof voiceCallStrings)["en"], "states"> & { states: Record<VoiceCallState, string> };
export type VoiceCallLabelOverrides = Partial<Omit<VoiceCallLabels, "states">> & { states?: Partial<VoiceCallLabels["states"]> };

export function voiceCallWords(locale: string, labels?: VoiceCallLabelOverrides): VoiceCallLabels {
  const base = voiceCallStrings[locale.startsWith("ar") ? "ar" : "en"];
  return { ...base, ...labels, states: { ...base.states, ...labels?.states } } as VoiceCallLabels;
}
