export type TwoFactorMethod = "totp" | "recovery";

export interface TwoFactorValues {
  code: string;
  method: TwoFactorMethod;
  /** The "Trust this device" checkbox. */
  trustDevice: boolean;
}

export interface TwoFactorChallengeLabels {
  totpDescription: string;
  recoveryDescription: string;
  totpGroup: string;
  /** Use `{index}` and `{length}`. */
  box: string;
  recoveryLabel: string;
  recoveryPlaceholder: string;
  trust: string;
  submit: string;
  useRecovery: string;
  useTotp: string;
  usePasskey: string;
  incomplete: string;
  recoveryRequired: string;
  failed: string;
}

export const STRINGS: Record<"en" | "ar", TwoFactorChallengeLabels> = {
  en: {
    totpDescription: "Open your authenticator app and enter the {length}-digit code.",
    recoveryDescription: "Enter one of the recovery codes you saved when you turned on two-step verification. Each code works once.",
    totpGroup: "Authenticator code",
    box: "Digit {index} of {length}",
    recoveryLabel: "Recovery code",
    recoveryPlaceholder: "xxxx-xxxx",
    trust: "Trust this device for 30 days",
    submit: "Verify",
    useRecovery: "Use a recovery code instead",
    useTotp: "Use your authenticator app instead",
    usePasskey: "Use a passkey instead",
    incomplete: "Enter all {length} digits.",
    recoveryRequired: "Enter a recovery code.",
    failed: "Something went wrong. Try again.",
  },
  ar: {
    totpDescription: "افتح تطبيق المصادقة وأدخل الرمز المكوّن من {length} أرقام.",
    recoveryDescription: "أدخل أحد رموز الاسترداد التي حفظتها عند تفعيل التحقق بخطوتين. كل رمز يعمل مرة واحدة.",
    totpGroup: "رمز تطبيق المصادقة",
    box: "الخانة {index} من {length}",
    recoveryLabel: "رمز الاسترداد",
    recoveryPlaceholder: "xxxx-xxxx",
    trust: "الوثوق بهذا الجهاز لمدة 30 يومًا",
    submit: "تحقّق",
    useRecovery: "استخدم رمز استرداد بدلًا من ذلك",
    useTotp: "استخدم تطبيق المصادقة بدلًا من ذلك",
    usePasskey: "استخدم مفتاح مرور بدلًا من ذلك",
    incomplete: "أدخل الأرقام الـ {length} كاملة.",
    recoveryRequired: "أدخل رمز استرداد.",
    failed: "حدث خطأ ما. حاول مرة أخرى.",
  },
};
