export type ErrorPageKind = "not-found" | "server-error" | "offline" | "maintenance" | "forbidden" | "unknown-workspace" | "coming-soon";

const KIND_CODE: Partial<Record<ErrorPageKind, string>> = { "not-found": "404", "server-error": "500", forbidden: "403", maintenance: "503" };

/** The default status code shown for a kind. Only HTTP-like kinds have one, and it stays Latin so it can be quoted. */
export function statusCodeFor(kind: ErrorPageKind): string | undefined {
  return KIND_CODE[kind];
}

export const ERROR_PAGE_STRINGS = {
  en: {
    home: "Go to home",
    back: "Go back",
    retry: "Try again",
    support: "Contact support",
    switchWorkspace: "Switch workspace",
    requestAccess: "Request access",
    notify: "Notify me",
    notified: "Done. We will tell you when it is ready.",
    reload: "Reload",
    errorId: "Error ID",
    copyId: "Copy error ID",
    notFoundTitle: "We could not find that page",
    notFoundBody: "The address may be mistyped, or the page may have moved or been removed.",
    serverTitle: "Something went wrong on our side",
    serverBody: "The error has been recorded. Try again in a moment, and contact support if it keeps happening.",
    offlineTitle: "You are offline",
    offlineBody: "Check your connection. Your changes are kept on this device and will sync when you are back.",
    onlineTitle: "You are back online",
    onlineBody: "The connection is back. Reload to pick up where you left off.",
    maintenanceTitle: "We are doing some maintenance",
    maintenanceBody: "The service is briefly unavailable while we make it better.",
    maintenanceEta: "Expected back",
    forbiddenTitle: "You do not have access to this page",
    forbiddenBody: "Your account does not have permission to see this. Ask an admin of the workspace for access.",
    workspaceTitle: "That workspace does not exist",
    workspaceBody: "The workspace address may be wrong, or you may have been removed from it.",
    workspaceNamed: "There is no workspace called {name}.",
    soonTitle: "Coming soon",
    soonBody: "We are still building this part. It will show up here when it is ready.",
    soonNamed: "{name} is coming soon",
  },
  ar: {
    home: "الذهاب إلى الرئيسية",
    back: "رجوع",
    retry: "حاول مرة أخرى",
    support: "تواصل مع الدعم",
    switchWorkspace: "تبديل مساحة العمل",
    requestAccess: "طلب صلاحية",
    notify: "نبّهني",
    notified: "تم. سنخبرك عندما يصبح جاهزاً.",
    reload: "إعادة التحميل",
    errorId: "معرّف الخطأ",
    copyId: "نسخ معرّف الخطأ",
    notFoundTitle: "لم نعثر على هذه الصفحة",
    notFoundBody: "قد يكون العنوان مكتوباً بشكل خاطئ، أو أن الصفحة نُقلت أو حُذفت.",
    serverTitle: "حدث خطأ من جهتنا",
    serverBody: "سُجّل الخطأ. حاول مجدداً بعد لحظات، وتواصل مع الدعم إذا استمر.",
    offlineTitle: "أنت غير متصل",
    offlineBody: "تحقق من اتصالك. تغييراتك محفوظة على هذا الجهاز وستُزامَن عند عودتك.",
    onlineTitle: "عاد الاتصال",
    onlineBody: "عاد الاتصال بالإنترنت. أعد التحميل لتكمل من حيث توقفت.",
    maintenanceTitle: "نجري بعض أعمال الصيانة",
    maintenanceBody: "الخدمة غير متاحة لفترة وجيزة أثناء تحسينها.",
    maintenanceEta: "العودة المتوقعة",
    forbiddenTitle: "ليست لديك صلاحية لهذه الصفحة",
    forbiddenBody: "حسابك لا يملك إذن رؤية هذا المحتوى. اطلب الصلاحية من مسؤول مساحة العمل.",
    workspaceTitle: "مساحة العمل هذه غير موجودة",
    workspaceBody: "قد يكون عنوان مساحة العمل خاطئاً، أو قد أُزيلت منها.",
    workspaceNamed: "لا توجد مساحة عمل باسم {name}.",
    soonTitle: "قريباً",
    soonBody: "ما زلنا نبني هذا الجزء. سيظهر هنا عندما يجهز.",
    soonNamed: "{name} قريباً",
  },
};

export type ErrorPageLabels = (typeof ERROR_PAGE_STRINGS)["en"];
