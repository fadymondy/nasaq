export interface ConsentApp {
  name: string;
  /** An image URL. Without one, the app's initial is shown (or fill the `logo` slot). */
  logo?: string;
  /** Who runs the app, shown under its name. */
  publisher?: string;
}

export interface ConsentScope {
  id: string;
  /** Short permission name: "Read your profile". */
  label: string;
  /** One line on what it lets the app do. */
  description?: string;
  /** Marks a broad permission with a "Sensitive" badge. */
  sensitive?: boolean;
}

export interface ConsentAccount {
  name: string;
  email: string;
  avatar?: string;
}

export interface OAuthConsentLabels {
  /** Use `{app}` and `{product}`. */
  title: string;
  signedInAs: string;
  switchAccount: string;
  /** Use `{app}`. */
  scopesIntro: string;
  sensitive: string;
  allow: string;
  deny: string;
  /** Use `{host}`. */
  redirect: string;
  revoke: string;
  failed: string;
}


export const STRINGS: Record<"en" | "ar", OAuthConsentLabels> = {
  en: {
    title: "{app} wants to access your {product} account",
    signedInAs: "Signed in as",
    switchAccount: "Switch account",
    scopesIntro: "This will let {app}:",
    sensitive: "Sensitive",
    allow: "Allow",
    deny: "Deny",
    redirect: "You will be sent to {host}.",
    revoke: "You can remove this access at any time in your account settings.",
    failed: "Something went wrong. Try again.",
  },
  ar: {
    title: "يريد {app} الوصول إلى حسابك في {product}",
    signedInAs: "مسجّل الدخول باسم",
    switchAccount: "تبديل الحساب",
    scopesIntro: "سيسمح هذا لتطبيق {app} بما يلي:",
    sensitive: "حساس",
    allow: "السماح",
    deny: "رفض",
    redirect: "ستتم إعادة توجيهك إلى {host}.",
    revoke: "يمكنك إزالة هذا الوصول في أي وقت من إعدادات حسابك.",
    failed: "حدث خطأ ما. حاول مرة أخرى.",
  },
};
