/** Built-in strings of DataState and ServiceUnavailable; override any with the `labels` prop. */
export const dataStateStrings = {
  en: {
    unauthorizedTitle: "Your session has ended",
    unauthorizedBody: "Sign in again to see this page.",
    signIn: "Sign in",
    unavailableTitle: "This service is not available right now",
    unavailableBody: "It may be starting up or under maintenance. Try again in a moment.",
    retry: "Try again",
    errorTitle: "Something went wrong",
    emptyTitle: "Nothing here yet",
    emptyBody: "",
  },
  ar: {
    unauthorizedTitle: "انتهت جلستك",
    unauthorizedBody: "سجّل الدخول مرة أخرى لعرض هذه الصفحة.",
    signIn: "تسجيل الدخول",
    unavailableTitle: "هذه الخدمة غير متاحة الآن",
    unavailableBody: "قد تكون قيد التشغيل أو الصيانة. حاول مرة أخرى بعد قليل.",
    retry: "حاول مرة أخرى",
    errorTitle: "حدث خطأ ما",
    emptyTitle: "لا يوجد شيء هنا بعد",
    emptyBody: "",
  },
};

export type DataStateLabels = (typeof dataStateStrings)["en"];

/** An error detail as text: a string, an Error's message, or String(value). Undefined when there is no error. */
export function errorText(error: unknown): string | undefined {
  if (!error) return undefined;
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  return String(error);
}
