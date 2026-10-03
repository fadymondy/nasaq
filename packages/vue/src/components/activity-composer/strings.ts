import { computed, toValue, type MaybeRefOrGetter } from "vue";
import { useNasaq } from "../../provider";
import type { ActivityError, ComposableKind, LoggedActivityKind } from "./activity-logic";

export const ACTIVITY_STRINGS = {
  en: {
    kinds: { note: "Note", call: "Call", meeting: "Meeting", task: "Task", event: "Event" } satisfies Record<LoggedActivityKind, string>,
    kindPicker: "Kind of activity",
    bodyLabel: { note: "Note", call: "What was discussed", meeting: "Minutes", task: "What needs doing" } satisfies Record<ComposableKind, string>,
    bodyHint: { note: "Write a note…", call: "Summarise the call…", meeting: "Decisions and next steps…", task: "Follow up on…" } satisfies Record<ComposableKind, string>,
    whenLabel: { note: "When", call: "When", meeting: "When", task: "Due" } satisfies Record<ComposableKind, string>,
    duration: "Duration (minutes)",
    submit: { note: "Log note", call: "Log call", meeting: "Log meeting", task: "Add task" } satisfies Record<ComposableKind, string>,
    errors: { empty: "Write something first.", badDate: "Pick a valid date and time.", badDuration: "Duration must be between 0 and 1440 minutes." } satisfies Record<ActivityError, string>,
    planned: "Planned",
    history: "History",
    empty: "No activity yet",
    emptyHint: "Log a note, a call, a meeting or a task to start the history.",
    overdue: "Overdue",
    due: "Due",
    minutes: (n: string) => `${n} min`,
    complete: (task: string) => `Mark done: ${task}`,
    reopen: (task: string) => `Reopen: ${task}`,
    delete: "Delete",
    actions: "Activity actions",
    completed: "Done",
    listLabel: "Activity history",
    plannedLabel: "Planned tasks",
    by: "by",
  },
  ar: {
    kinds: { note: "ملاحظة", call: "مكالمة", meeting: "اجتماع", task: "مهمة", event: "حدث" } satisfies Record<LoggedActivityKind, string>,
    kindPicker: "نوع النشاط",
    bodyLabel: { note: "الملاحظة", call: "ما جرى النقاش فيه", meeting: "محضر الاجتماع", task: "المطلوب إنجازه" } satisfies Record<ComposableKind, string>,
    bodyHint: { note: "اكتب ملاحظة…", call: "لخّص المكالمة…", meeting: "القرارات والخطوات التالية…", task: "متابعة…" } satisfies Record<ComposableKind, string>,
    whenLabel: { note: "الوقت", call: "الوقت", meeting: "الوقت", task: "الاستحقاق" } satisfies Record<ComposableKind, string>,
    duration: "المدة (بالدقائق)",
    submit: { note: "تسجيل ملاحظة", call: "تسجيل مكالمة", meeting: "تسجيل اجتماع", task: "إضافة مهمة" } satisfies Record<ComposableKind, string>,
    errors: { empty: "اكتب شيئًا أولًا.", badDate: "اختر تاريخًا ووقتًا صالحين.", badDuration: "يجب أن تكون المدة بين 0 و1440 دقيقة." } satisfies Record<ActivityError, string>,
    planned: "المخطط",
    history: "السجل",
    empty: "لا يوجد نشاط بعد",
    emptyHint: "سجّل ملاحظة أو مكالمة أو اجتماعًا أو مهمة لبدء السجل.",
    overdue: "متأخرة",
    due: "الاستحقاق",
    minutes: (n: string) => `${n} د`,
    complete: (task: string) => `إنهاء: ${task}`,
    reopen: (task: string) => `إعادة فتح: ${task}`,
    delete: "حذف",
    actions: "إجراءات النشاط",
    completed: "منجزة",
    listLabel: "سجل النشاط",
    plannedLabel: "المهام المخططة",
    by: "بواسطة",
  },
};

export type ActivityLabels = Partial<typeof ACTIVITY_STRINGS.en>;
export type ActivityResult = void | { error?: string };

export function useActivityLabels(labels: MaybeRefOrGetter<ActivityLabels | undefined>) {
  const nq = useNasaq();
  const locale = computed(() => nq.locale.value);
  const t = computed(() => ({ ...ACTIVITY_STRINGS[locale.value.startsWith("ar") ? "ar" : "en"], ...toValue(labels) }) as typeof ACTIVITY_STRINGS.en);
  return { locale, t };
}
