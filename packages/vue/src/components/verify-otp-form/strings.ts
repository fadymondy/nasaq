export interface VerifyOtpValues {
  code: string;
}

export interface VerifyOtpFormLabels {
  /** Use `{length}` and `{destination}`. */
  descriptionEmail: string;
  descriptionSms: string;
  group: string;
  /** Use `{index}` and `{length}`. */
  box: string;
  submit: string;
  noCode: string;
  resend: string;
  /** Use `{time}`. */
  resendIn: string;
  resent: string;
  incomplete: string;
  failed: string;
}

export const STRINGS: Record<"en" | "ar", VerifyOtpFormLabels> = {
  en: {
    descriptionEmail: "Enter the {length}-digit code we sent to {destination}.",
    descriptionSms: "Enter the {length}-digit code we texted to {destination}.",
    group: "Verification code",
    box: "Digit {index} of {length}",
    submit: "Verify",
    noCode: "Did not get a code?",
    resend: "Resend code",
    resendIn: "Resend in {time}",
    resent: "We sent a new code.",
    incomplete: "Enter all {length} digits.",
    failed: "Something went wrong. Try again.",
  },
  ar: {
    descriptionEmail: "أدخل الرمز المكوّن من {length} أرقام الذي أرسلناه إلى {destination}.",
    descriptionSms: "أدخل الرمز المكوّن من {length} أرقام الذي أرسلناه برسالة نصية إلى {destination}.",
    group: "رمز التحقق",
    box: "الخانة {index} من {length}",
    submit: "تحقّق",
    noCode: "لم يصلك الرمز؟",
    resend: "إعادة إرسال الرمز",
    resendIn: "إعادة الإرسال بعد {time}",
    resent: "أرسلنا رمزًا جديدًا.",
    incomplete: "أدخل الأرقام الـ {length} كاملة.",
    failed: "حدث خطأ ما. حاول مرة أخرى.",
  },
};

/**
 * Hides most of an email or phone number: `fady@example.com` becomes `f•••y@example.com`, `+966501234567`
 * becomes `••••••••••67`. The domain stays visible so people recognise which inbox to open.
 */
export function maskDestination(destination: string, channel: "email" | "sms" = "email"): string {
  const value = destination.trim();
  if (channel === "email" && value.includes("@")) {
    const at = value.lastIndexOf("@");
    const local = value.slice(0, at);
    const domain = value.slice(at);
    return local.length <= 2 ? `${local.slice(0, 1)}•••${domain}` : `${local.slice(0, 1)}•••${local.slice(-1)}${domain}`;
  }
  const digits = value.replace(/[^\d]/g, "");
  return `${"•".repeat(Math.max(4, digits.length - 2))}${digits.slice(-2)}`;
}
