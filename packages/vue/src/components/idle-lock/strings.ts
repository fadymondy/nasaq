export const STRINGS = {
  en: {
    title: "Still there?",
    description: "You have been inactive, so the app will lock in {time} to protect your data.",
    remaining: "Time left",
    stay: "Stay signed in",
    lockNow: "Lock now",
  },
  ar: {
    title: "هل ما زلت هنا؟",
    description: "لم تكن نشطًا، لذلك سيُقفل التطبيق بعد {time} لحماية بياناتك.",
    remaining: "الوقت المتبقي",
    stay: "ابقَ متصلًا",
    lockNow: "اقفل الآن",
  },
};

export type IdleLockLabels = (typeof STRINGS)["en"];
export type IdleLockReason = "idle" | "manual";
