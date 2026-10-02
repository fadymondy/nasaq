import { computed, type ComputedRef } from "vue";
import { useNasaq } from "../../provider";
import { fill } from "../countdown/strings";
import type { TimerRingTone } from "../countdown/tone";
import type { PomodoroPhase } from "./pomodoro-model";

export const POMODORO_STRINGS = {
  en: {
    title: "Pomodoro",
    focus: "Focus",
    shortBreak: "Short break",
    longBreak: "Long break",
    startFocus: "Start focus",
    startBreak: "Start break",
    pause: "Pause",
    resume: "Resume",
    skip: "Skip",
    stop: "Stop",
    paused: "Paused",
    ready: "Ready",
    task: "Working on",
    noTask: "No task linked",
    pickTask: "Link a task",
    today: "Today",
    sessionsToday: "{done} of {target} sessions",
    focusToday: "{minutes} min focused",
    announceFocus: "Focus started",
    announceBreak: "Break started",
    breakTitleShort: "Time for a short break",
    breakTitleLong: "Time for a long break",
    breakBody: "Focus sessions finished today: {done}. Step away from the screen and let your mind rest.",
    breakNext: "Next up: {task}",
    breakLeft: "left",
    anotherIdea: "Another idea",
    postpone: "Postpone {minutes} min",
    skipBreak: "Skip break",
    confirmTitle: "Skip this break?",
    confirmBody: "Rest is what keeps the next session sharp. Skipping starts focus again right away.",
    confirmSkip: "Skip anyway",
    confirmKeep: "Keep resting",
    breakScreen: "Break",
    suggestionLabel: "A suggestion for this break",
    stretchTitle: "Stand up and stretch",
    stretchBody: "Roll your shoulders and reach overhead for thirty seconds.",
    waterTitle: "Drink a glass of water",
    waterBody: "Hydrate now, before the next session begins.",
    eyesTitle: "Rest your eyes",
    eyesBody: "Look at something far away for twenty seconds.",
    walkTitle: "Take a short walk",
    walkBody: "Even a minute on your feet resets your back and neck.",
  },
  ar: {
    title: "بومودورو",
    focus: "تركيز",
    shortBreak: "استراحة قصيرة",
    longBreak: "استراحة طويلة",
    startFocus: "ابدأ التركيز",
    startBreak: "ابدأ الاستراحة",
    pause: "إيقاف مؤقت",
    resume: "متابعة",
    skip: "تخطَّ",
    stop: "إنهاء",
    paused: "متوقف مؤقتًا",
    ready: "جاهز",
    task: "أعمل على",
    noTask: "لا توجد مهمة مرتبطة",
    pickTask: "اربط مهمة",
    today: "اليوم",
    sessionsToday: "{done} من {target} جلسات",
    focusToday: "{minutes} دقيقة تركيز",
    announceFocus: "بدأ التركيز",
    announceBreak: "بدأت الاستراحة",
    breakTitleShort: "حان وقت استراحة قصيرة",
    breakTitleLong: "حان وقت استراحة طويلة",
    breakBody: "جلسات التركيز المنتهية اليوم: {done}. ابتعد عن الشاشة ودع ذهنك يرتاح.",
    breakNext: "التالي: {task}",
    breakLeft: "متبقٍ",
    anotherIdea: "فكرة أخرى",
    postpone: "أجّل {minutes} دقائق",
    skipBreak: "تخطَّ الاستراحة",
    confirmTitle: "تخطي هذه الاستراحة؟",
    confirmBody: "الراحة هي ما يُبقي الجلسة التالية حادّة. التخطي يبدأ التركيز فورًا.",
    confirmSkip: "تخطَّ على أي حال",
    confirmKeep: "واصل الراحة",
    breakScreen: "استراحة",
    suggestionLabel: "اقتراح لهذه الاستراحة",
    stretchTitle: "قف وتمطَّ",
    stretchBody: "حرّك كتفيك وارفع ذراعيك فوق رأسك ثلاثين ثانية.",
    waterTitle: "اشرب كوب ماء",
    waterBody: "اشرب الآن قبل أن تبدأ الجلسة التالية.",
    eyesTitle: "أرِح عينيك",
    eyesBody: "انظر إلى شيء بعيد لمدة عشرين ثانية.",
    walkTitle: "امشِ قليلًا",
    walkBody: "حتى دقيقة واحدة على قدميك تريح ظهرك ورقبتك.",
  },
};

export type PomodoroLabels = Partial<(typeof POMODORO_STRINGS)["en"]>;

export function usePomodoroStrings(labels?: () => PomodoroLabels | undefined): ComputedRef<(typeof POMODORO_STRINGS)["en"]> {
  const nq = useNasaq();
  return computed(() => ({ ...POMODORO_STRINGS[nq.locale.value.startsWith("ar") ? "ar" : "en"], ...labels?.() }));
}

export { fill };

export const phaseTone: Record<PomodoroPhase, TimerRingTone> = { focus: "primary", shortBreak: "success", longBreak: "info" };
