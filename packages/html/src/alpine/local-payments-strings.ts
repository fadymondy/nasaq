// The words the Alpine local payments modules need on their own. The Blade components pass their (localised, overridable) text in the
// config; these are the defaults for hand-written markup. Placeholders: {min}, {max}, {who}.
export const LOCAL_PAYMENTS_STRINGS = {
  en: {
    failed: "That did not go through. Try again.",
    problems: {
      empty: "Enter the transfer reference.",
      short: "That reference looks too short.",
      chars: "Use letters, digits and dashes only.",
      receipt: "Add the receipt.",
      min: "This method needs at least {min}.",
      max: "This method allows up to {max}.",
      method: "Choose a payment method.",
    },
    rejectDescription: "{who} will be asked to send a new receipt.",
  },
  ar: {
    failed: "لم تتم العملية. حاول مرة أخرى.",
    problems: {
      empty: "أدخل مرجع التحويل.",
      short: "المرجع يبدو قصيرًا جدًا.",
      chars: "استخدم الأحرف والأرقام والشرطات فقط.",
      receipt: "أرفق الإيصال.",
      min: "تتطلب هذه الطريقة {min} على الأقل.",
      max: "تسمح هذه الطريقة بحد أقصى {max}.",
      method: "اختر طريقة الدفع.",
    },
    rejectDescription: "سيُطلب من {who} إرسال إيصال جديد.",
  },
};

export type LocalPaymentsStrings = typeof LOCAL_PAYMENTS_STRINGS.en;

/** Fills {name} placeholders. */
export function fillPayment(text: string, values: Record<string, string>): string {
  return Object.entries(values).reduce((out, [key, value]) => out.split(`{${key}}`).join(value), text);
}

export function localPaymentsStrings(locale: string, override: Partial<{ failed: string; problems: Partial<LocalPaymentsStrings["problems"]>; rejectDescription: string }> = {}): LocalPaymentsStrings {
  const base = LOCAL_PAYMENTS_STRINGS[locale.startsWith("ar") ? "ar" : "en"];
  return { ...base, ...override, problems: { ...base.problems, ...override.problems } } as LocalPaymentsStrings;
}
