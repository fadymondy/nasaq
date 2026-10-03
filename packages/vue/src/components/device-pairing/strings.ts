export const STRINGS = {
  en: {
    entryTitle: "Connect a device",
    entryDescription: "Enter the code shown on the device you are signing in to.",
    entryGroup: "Device code",
    box: "Character {index} of {length}",
    entrySubmit: "Continue",
    incomplete: "Enter all {length} characters.",
    failed: "Something went wrong. Try again.",
    approveTitle: "Approve this device?",
    approveDescription: "{client} wants to sign in to your account. Check that the code below matches the one on the device.",
    signedInAs: "Signing in as {name}",
    code: "Code",
    device: "Device",
    platform: "Platform",
    browser: "Browser",
    ip: "IP address",
    location: "Location",
    requested: "Requested",
    scopes: "It will be able to",
    warning: "Only approve if you started this yourself. If you do not recognise it, deny it and change your password.",
    approve: "Approve",
    deny: "Deny",
    expiresIn: "Expires in {time}",
    approvedTitle: "Device approved",
    approvedDescription: "You can go back to the device. It will sign in in a few seconds.",
    deniedTitle: "Request denied",
    deniedDescription: "The device was not given access. You can close this page.",
    expiredTitle: "This code expired",
    expiredDescription: "Codes only last a few minutes. Start again on the device to get a new one.",
    another: "Enter another code",
    displayTitle: "Sign in on your phone or computer",
    displayDescription: "Go to the address below and enter this code, or scan the QR code.",
    address: "Address",
    yourCode: "Your code",
    scan: "QR code to open the sign-in page",
    waiting: "Waiting for approval",
    refresh: "Get a new code",
    approvedDevice: "Approved. Signing you in",
    deniedDevice: "The request was denied.",
    handoffTitle: "Open {app}",
    handoffOpening: "Opening {app}. If your browser asks, allow it to open the app.",
    handoffOpened: "{app} should be open now. You can close this tab.",
    handoffFailed: "We could not open {app}. Make sure it is installed, then try again.",
    handoffOpen: "Open {app}",
    handoffAgain: "Try again",
    handoffBrowser: "Continue in the browser instead",
    handoffCode: "Or type this code in the app",
    handoffCancel: "Cancel sign-in",
  },
  ar: {
    entryTitle: "ربط جهاز",
    entryDescription: "أدخل الرمز الظاهر على الجهاز الذي تسجّل الدخول إليه.",
    entryGroup: "رمز الجهاز",
    box: "الحرف {index} من {length}",
    entrySubmit: "متابعة",
    incomplete: "أدخل الأحرف الـ {length} كاملة.",
    failed: "حدث خطأ ما. حاول مرة أخرى.",
    approveTitle: "الموافقة على هذا الجهاز؟",
    approveDescription: "يريد {client} تسجيل الدخول إلى حسابك. تأكد من أن الرمز أدناه يطابق الرمز على الجهاز.",
    signedInAs: "تسجيل الدخول باسم {name}",
    code: "الرمز",
    device: "الجهاز",
    platform: "المنصة",
    browser: "المتصفح",
    ip: "عنوان IP",
    location: "الموقع",
    requested: "وقت الطلب",
    scopes: "سيتمكن من",
    warning: "وافق فقط إذا كنت أنت من بدأ هذا الطلب. إذا لم تتعرف عليه فارفضه وغيّر كلمة مرورك.",
    approve: "موافقة",
    deny: "رفض",
    expiresIn: "ينتهي خلال {time}",
    approvedTitle: "تمت الموافقة على الجهاز",
    approvedDescription: "يمكنك العودة إلى الجهاز. سيسجّل الدخول خلال ثوانٍ.",
    deniedTitle: "تم رفض الطلب",
    deniedDescription: "لم يُمنح الجهاز أي وصول. يمكنك إغلاق هذه الصفحة.",
    expiredTitle: "انتهت صلاحية هذا الرمز",
    expiredDescription: "الرموز تدوم بضع دقائق فقط. ابدأ من جديد على الجهاز للحصول على رمز جديد.",
    another: "أدخل رمزًا آخر",
    displayTitle: "سجّل الدخول من هاتفك أو حاسوبك",
    displayDescription: "افتح العنوان أدناه وأدخل هذا الرمز، أو امسح رمز QR.",
    address: "العنوان",
    yourCode: "رمزك",
    scan: "رمز QR لفتح صفحة تسجيل الدخول",
    waiting: "بانتظار الموافقة",
    refresh: "احصل على رمز جديد",
    approvedDevice: "تمت الموافقة. جارٍ تسجيل دخولك",
    deniedDevice: "تم رفض الطلب.",
    handoffTitle: "افتح {app}",
    handoffOpening: "جارٍ فتح {app}. إذا سأل المتصفح فاسمح له بفتح التطبيق.",
    handoffOpened: "يجب أن يكون {app} مفتوحًا الآن. يمكنك إغلاق هذا التبويب.",
    handoffFailed: "تعذّر فتح {app}. تأكد من أنه مثبّت ثم حاول مرة أخرى.",
    handoffOpen: "افتح {app}",
    handoffAgain: "حاول مرة أخرى",
    handoffBrowser: "المتابعة في المتصفح بدلًا من ذلك",
    handoffCode: "أو اكتب هذا الرمز في التطبيق",
    handoffCancel: "إلغاء تسجيل الدخول",
  },
};

export type DevicePairingLabels = (typeof STRINGS)["en"];

export type HandoffState = "opening" | "opened" | "failed";

export interface DeviceRequest {
  /** The code shown on the device. */
  code: string;
  /** Who is asking: an app or client name. */
  client: string;
  /** "Fady's MacBook Pro", "Living room TV". */
  deviceName?: string;
  /** "macOS 15", "Android 15", "CLI". */
  platform?: string;
  browser?: string;
  ip?: string;
  /** "Riyadh, Saudi Arabia". Approximate, from the IP. */
  location?: string;
  requestedAt?: Date | number | string;
  /** What approving lets it do, one line each. */
  scopes?: string[];
}
