import { computed } from "vue";
import { useNasaq } from "../../provider";
import type { CommentAuthorKind } from "./comment-thread-logic";

export const COMMENT_THREAD_STRINGS = {
  en: {
    title: "Comments",
    empty: "No comments yet",
    emptyHint: "Start the conversation. Use @ to mention someone.",
    write: "Write a comment…",
    writeReply: "Write a reply…",
    send: "Comment",
    reply: "Reply",
    save: "Save",
    cancel: "Cancel",
    edit: "Edit",
    delete: "Delete",
    confirmDelete: "Delete this comment?",
    approve: "Approve",
    edited: "edited",
    pending: "Awaiting review",
    pendingHint: "Only you and moderators can see this until it is approved.",
    actions: (name: string) => `Actions for the comment by ${name}`,
    replies: (n: string) => `${n} replies`,
    kinds: { human: "Member", agent: "Agent", client: "Client", bot: "Bot" } satisfies Record<CommentAuthorKind, string>,
    signIn: "Sign in to comment",
    signInHint: "You need an account to join this conversation.",
    signInAction: "Sign in",
    threadLabel: "Comment thread",
  },
  ar: {
    title: "التعليقات",
    empty: "لا توجد تعليقات بعد",
    emptyHint: "ابدأ النقاش. استخدم @ للإشارة إلى شخص.",
    write: "اكتب تعليقًا…",
    writeReply: "اكتب ردًا…",
    send: "تعليق",
    reply: "رد",
    save: "حفظ",
    cancel: "إلغاء",
    edit: "تعديل",
    delete: "حذف",
    confirmDelete: "حذف هذا التعليق؟",
    approve: "اعتماد",
    edited: "معدّل",
    pending: "بانتظار المراجعة",
    pendingHint: "لا يراه غيرك والمشرفون إلى أن يُعتمد.",
    actions: (name: string) => `إجراءات تعليق ${name}`,
    replies: (n: string) => `${n} ردود`,
    kinds: { human: "عضو", agent: "وكيل", client: "عميل", bot: "روبوت" } satisfies Record<CommentAuthorKind, string>,
    signIn: "سجّل الدخول للتعليق",
    signInHint: "تحتاج إلى حساب للمشاركة في هذا النقاش.",
    signInAction: "تسجيل الدخول",
    threadLabel: "سلسلة التعليقات",
  },
};

export type CommentThreadLabels = Partial<typeof COMMENT_THREAD_STRINGS.en>;
export type CommentResult = void | { error?: string };
export const commentError = (r: CommentResult) => (r && "error" in r && r.error ? r.error : null);

/** The thread's words for the page language, with `labels` laid over them. */
export function useCommentLabels(labels: () => CommentThreadLabels | undefined) {
  const nq = useNasaq();
  const locale = computed(() => nq.locale.value);
  const t = computed(() => ({ ...COMMENT_THREAD_STRINGS[locale.value.startsWith("ar") ? "ar" : "en"], ...labels() }));
  return { locale, t };
}
