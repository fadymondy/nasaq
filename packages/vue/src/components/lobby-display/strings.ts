import { computed, type ComputedRef } from "vue";
import { useNasaq } from "../../provider";

export const LOBBY_DISPLAY_STRINGS = {
  en: {
    nowServing: "Now serving",
    room: (r: string) => `Room ${r}`,
    free: "Available",
    called: "Please come in",
    inVisit: "In visit",
    recent: "Recently called",
    upNext: "Up next",
    waiting: "Waiting",
    none: "No calls yet.",
    nobodyWaiting: "Nobody is waiting.",
    soundOn: "Sound on",
    soundOff: "Turn sound on",
    announce: (ticket: string, room: string) => (room ? `Ticket ${ticket}, please go to ${room}.` : `Ticket ${ticket}, please come to the desk.`),
    board: "Queue board",
    toRoom: "to",
    more: (n: number) => `+${n} more`,
  },
  ar: {
    nowServing: "يُخدم الآن",
    room: (r: string) => `الغرفة ${r}`,
    free: "متاحة",
    called: "تفضّل بالدخول",
    inVisit: "في الزيارة",
    recent: "آخر النداءات",
    upNext: "التالي",
    waiting: "في الانتظار",
    none: "لا نداءات بعد.",
    nobodyWaiting: "لا أحد في الانتظار.",
    soundOn: "الصوت يعمل",
    soundOff: "تشغيل الصوت",
    announce: (ticket: string, room: string) => (room ? `التذكرة ${ticket}، تفضّل إلى ${room}.` : `التذكرة ${ticket}، تفضّل إلى المكتب.`),
    board: "شاشة الدور",
    toRoom: "إلى",
    more: (n: number) => `+${n} أخرى`,
  },
};

export type LobbyDisplayLabels = (typeof LOBBY_DISPLAY_STRINGS)["en"];

export function useLobbyDisplayLabels(override?: () => Partial<LobbyDisplayLabels> | undefined): ComputedRef<LobbyDisplayLabels> {
  const nq = useNasaq();
  return computed(() => ({ ...LOBBY_DISPLAY_STRINGS[nq.locale.value.startsWith("ar") ? "ar" : "en"], ...override?.() }) as LobbyDisplayLabels);
}

/** Two soft notes, high then low. Created on demand and only after the operator turned sound on (browsers block audio before a click). */
export function playLobbyChime() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const notes: [number, number][] = [
      [880, 0],
      [660, 0.35],
    ];
    for (const [freq, at] of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + at);
      gain.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + at + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + at + 0.6);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + at);
      osc.stop(ctx.currentTime + at + 0.65);
    }
    setTimeout(() => void ctx.close(), 1500);
  } catch {
    // No audio device or blocked: the visual call still shows.
  }
}
