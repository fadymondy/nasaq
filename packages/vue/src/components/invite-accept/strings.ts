export const STRINGS = {
  en: {
    validTitle: (workspace: string) => `Join ${workspace}`,
    validBody: (who: string) => `${who} invited you to collaborate.`,
    validBodyAnon: "You have been invited to collaborate.",
    invitedAs: "You will join as",
    invitedEmail: "Invitation for",
    expiresOn: "Expires",
    signedInAs: "Signed in as",
    accept: "Accept invitation",
    decline: "Decline",
    signInToAccept: "Sign in to accept",
    createAccount: "Create an account",
    signInHint: (email: string) => `Use ${email} so this invitation matches your account.`,
    expiredTitle: "This invitation has expired",
    expiredBody: (who: string) => `Invitations only work for a limited time. Ask ${who} to send you a new one.`,
    expiredBodyAnon: "Invitations only work for a limited time. Ask the person who invited you to send a new one.",
    requestNew: "Ask for a new invitation",
    requested: "We told them you asked for a new invitation.",
    wrongTitle: "This invitation is for another account",
    wrongBody: (invited: string, current: string) => `It was sent to ${invited}, but you are signed in as ${current}.`,
    switchAccount: "Sign in with another account",
    acceptedTitle: "You have already joined",
    acceptedBody: (workspace: string) => `This invitation was used and you are a member of ${workspace}.`,
    open: (workspace: string) => `Open ${workspace}`,
    revokedTitle: "This invitation was cancelled",
    revokedBody: (who: string) => `${who} cancelled it. Ask them if you still need access.`,
    revokedBodyAnon: "The person who invited you cancelled it. Ask them if you still need access.",
    goHome: "Go to your account",
    failed: "Something went wrong. Try again.",
  },
  ar: {
    validTitle: (workspace: string) => `الانضمام إلى ${workspace}`,
    validBody: (who: string) => `دعاك ${who} للتعاون معه.`,
    validBodyAnon: "تمت دعوتك للتعاون.",
    invitedAs: "ستنضم بصفة",
    invitedEmail: "الدعوة موجهة إلى",
    expiresOn: "تنتهي",
    signedInAs: "مسجّل الدخول باسم",
    accept: "قبول الدعوة",
    decline: "رفض",
    signInToAccept: "سجّل الدخول للقبول",
    createAccount: "إنشاء حساب",
    signInHint: (email: string) => `استخدم ${email} ليطابق حسابك هذه الدعوة.`,
    expiredTitle: "انتهت صلاحية هذه الدعوة",
    expiredBody: (who: string) => `تعمل الدعوات لفترة محدودة. اطلب من ${who} إرسال دعوة جديدة.`,
    expiredBodyAnon: "تعمل الدعوات لفترة محدودة. اطلب ممن دعاك إرسال دعوة جديدة.",
    requestNew: "اطلب دعوة جديدة",
    requested: "أبلغناهم بأنك طلبت دعوة جديدة.",
    wrongTitle: "هذه الدعوة لحساب آخر",
    wrongBody: (invited: string, current: string) => `أُرسلت إلى ${invited}، لكنك مسجّل الدخول باسم ${current}.`,
    switchAccount: "سجّل الدخول بحساب آخر",
    acceptedTitle: "لقد انضممت بالفعل",
    acceptedBody: (workspace: string) => `استُخدمت هذه الدعوة وأنت عضو في ${workspace}.`,
    open: (workspace: string) => `فتح ${workspace}`,
    revokedTitle: "أُلغيت هذه الدعوة",
    revokedBody: (who: string) => `ألغاها ${who}. اسأله إن كنت لا تزال بحاجة إلى الوصول.`,
    revokedBodyAnon: "ألغاها من دعاك. اسأله إن كنت لا تزال بحاجة إلى الوصول.",
    goHome: "الانتقال إلى حسابك",
    failed: "حدث خطأ ما. حاول مرة أخرى.",
  },
};

export type InviteAcceptLabels = Partial<typeof STRINGS.en>;

/** Keeps an email address in its own direction inside a sentence of the other one. */
export const isolate = (value: string) => `⁨${value}⁩`;

export type InviteState = "valid" | "expired" | "wrong-account" | "already-accepted" | "revoked";

export interface InviteWorkspace {
  name: string;
  /** An image URL for the workspace logo. Without one, its initials show. */
  logo?: string;
  /** A short line under the name: "12 members". */
  meta?: string;
}
