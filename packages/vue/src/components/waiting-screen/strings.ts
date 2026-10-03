import { computed, onBeforeUnmount, onMounted, ref, type ComputedRef, type Ref } from "vue";
import { useNasaq } from "../../provider";

export type QueueConnection = "live" | "reconnecting" | "offline";

export const STRINGS = {
  en: {
    yourTicket: "Your ticket",
    position: "Your place in line",
    peopleAhead: (n: number) => (n === 0 ? "You are next" : `${n} ${n === 1 ? "person" : "people"} ahead of you`),
    wait: "Estimated wait",
    minutes: (n: number) => (n === 0 ? "Any moment" : `About ${n} min`),
    nowServing: "Now serving",
    nobody: "Nobody is being served right now.",
    room: (r: string) => `Room ${r}`,
    waiting: "Waiting",
    called: "It is your turn",
    calledText: (room: string) => `Please go to ${room} now.`,
    calledNoRoom: "Please go to the desk now.",
    serving: "In your visit",
    servingText: (room: string) => `You are with the doctor in ${room}.`,
    done: "Visit finished",
    doneText: "Thank you for coming. Take care.",
    skipped: "We called you and could not find you",
    skippedText: "Please see reception and they will put you back in line.",
    left: "You left the line",
    leftText: "Check in again at the kiosk if you still need to be seen.",
    leave: "Leave the line",
    leaveTitle: "Leave the line?",
    leaveText: "You lose your place. You can check in again, but you go to the back.",
    leaveConfirm: "Yes, leave",
    live: "Live",
    reconnecting: "Reconnecting",
    offline: "Offline",
    updated: (s: number) => (s < 5 ? "Updated just now" : `Updated ${s} s ago`),
    offlineText: "You are offline. The numbers below may be out of date.",
    connection: "Connection",
  },
  ar: {
    yourTicket: "تذكرتك",
    position: "دورك في الصف",
    peopleAhead: (n: number) => (n === 0 ? "أنت التالي" : n === 1 ? "شخص واحد قبلك" : n === 2 ? "شخصان قبلك" : `${n} أشخاص قبلك`),
    wait: "وقت الانتظار المتوقع",
    minutes: (n: number) => (n === 0 ? "في أي لحظة" : `حوالي ${n} دقيقة`),
    nowServing: "يُخدم الآن",
    nobody: "لا أحد يُخدم الآن.",
    room: (r: string) => `الغرفة ${r}`,
    waiting: "في الانتظار",
    called: "حان دورك",
    calledText: (room: string) => `تفضّل إلى ${room} الآن.`,
    calledNoRoom: "تفضّل إلى المكتب الآن.",
    serving: "أنت في الزيارة",
    servingText: (room: string) => `أنت مع الطبيب في ${room}.`,
    done: "انتهت الزيارة",
    doneText: "شكرًا لزيارتك. سلامتك.",
    skipped: "ناديناك ولم نجدك",
    skippedText: "توجّه إلى الاستقبال وسيعيدونك إلى الصف.",
    left: "غادرت الصف",
    leftText: "سجّل الوصول مجددًا من الكشك إن كنت ما زلت تريد الكشف.",
    leave: "مغادرة الصف",
    leaveTitle: "مغادرة الصف؟",
    leaveText: "ستفقد دورك. يمكنك تسجيل الوصول مجددًا لكن في آخر الصف.",
    leaveConfirm: "نعم، غادر",
    live: "مباشر",
    reconnecting: "جارٍ إعادة الاتصال",
    offline: "غير متصل",
    updated: (s: number) => (s < 5 ? "تم التحديث الآن" : `تم التحديث قبل ${s} ثانية`),
    offlineText: "أنت غير متصل. قد تكون الأرقام أدناه قديمة.",
    connection: "الاتصال",
  },
};

export type WaitingScreenLabels = Partial<(typeof STRINGS)["en"]>;

export function useWaitingLabels(override?: () => WaitingScreenLabels | undefined): ComputedRef<(typeof STRINGS)["en"]> {
  const nq = useNasaq();
  return computed(() => ({ ...STRINGS[nq.locale.value.startsWith("ar") ? "ar" : "en"], ...override?.() }) as (typeof STRINGS)["en"]);
}

/**
 * A clock that ticks every `intervalMs`. Pass `fixed` (ms) to freeze it, which keeps examples and tests deterministic.
 * Returns epoch milliseconds.
 */
export function useQueueNow(fixed: () => number | undefined, intervalMs = 1000): Ref<number> {
  const now = ref(fixed() ?? Date.now());
  let id: ReturnType<typeof setInterval> | undefined;
  onMounted(() => {
    if (fixed() !== undefined) return;
    id = setInterval(() => (now.value = Date.now()), intervalMs);
  });
  onBeforeUnmount(() => {
    if (id !== undefined) clearInterval(id);
  });
  return computed(() => fixed() ?? now.value) as unknown as Ref<number>;
}
