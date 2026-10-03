// Strings of the cookie consent banner, English and Arabic. Pass `labels` to override any of them.

export const COOKIE_CONSENT_STRINGS = {
  en: {
    title: "Your privacy choices",
    description: "We use cookies to keep the site working. With your permission we also use them to understand how it is used and to remember your settings. You can change this at any time.",
    policy: "Cookie policy",
    acceptAll: "Accept all",
    rejectAll: "Reject all",
    customise: "Customise",
    preferencesTitle: "Cookie preferences",
    preferencesDescription: "Choose which kinds of cookies we may use. Strictly necessary cookies cannot be turned off because the site does not work without them.",
    save: "Save choices",
    alwaysOn: "Always on",
    showCookies: "Show cookies ({count})",
    hideCookies: "Hide cookies",
    colName: "Name",
    colPurpose: "Purpose",
    colDuration: "Duration",
    failed: "Your choices could not be saved. Try again.",
    banner: "Cookie consent",
    categories: {
      necessary: { label: "Strictly necessary", description: "Keep you signed in, protect against fraud and remember this choice." },
      preferences: { label: "Preferences", description: "Remember your language, theme and layout." },
      analytics: { label: "Analytics", description: "Help us see which pages are used and where things break, in aggregate." },
      marketing: { label: "Marketing", description: "Measure campaigns and show relevant ads on other sites." },
    } as Record<string, { label: string; description: string }>,
  },
  ar: {
    title: "خياراتك في الخصوصية",
    description: "نستخدم ملفات تعريف الارتباط لإبقاء الموقع يعمل. وبإذنك نستخدمها أيضًا لفهم كيفية استخدامه وتذكّر إعداداتك. يمكنك تغيير ذلك في أي وقت.",
    policy: "سياسة ملفات تعريف الارتباط",
    acceptAll: "قبول الكل",
    rejectAll: "رفض الكل",
    customise: "تخصيص",
    preferencesTitle: "تفضيلات ملفات تعريف الارتباط",
    preferencesDescription: "اختر أنواع ملفات تعريف الارتباط التي يمكننا استخدامها. لا يمكن إيقاف الضرورية منها لأن الموقع لا يعمل بدونها.",
    save: "حفظ الاختيارات",
    alwaysOn: "مفعّلة دائمًا",
    showCookies: "عرض الملفات ({count})",
    hideCookies: "إخفاء الملفات",
    colName: "الاسم",
    colPurpose: "الغرض",
    colDuration: "المدة",
    failed: "تعذّر حفظ اختياراتك. حاول مرة أخرى.",
    banner: "الموافقة على ملفات تعريف الارتباط",
    categories: {
      necessary: { label: "ضرورية", description: "تُبقيك مسجّل الدخول وتحميك من الاحتيال وتتذكّر هذا الاختيار." },
      preferences: { label: "التفضيلات", description: "تتذكّر لغتك وسمتك وتخطيطك." },
      analytics: { label: "التحليلات", description: "تساعدنا على معرفة الصفحات المستخدمة وأماكن الأعطال، بشكل مجمّع." },
      marketing: { label: "التسويق", description: "تقيس الحملات وتعرض إعلانات مناسبة في مواقع أخرى." },
    } as Record<string, { label: string; description: string }>,
  },
};

export type CookieConsentLabels = Omit<(typeof COOKIE_CONSENT_STRINGS)["en"], "categories"> & { categories: Record<string, { label: string; description: string }> };

export const cookieConsentStrings = (locale: string) => COOKIE_CONSENT_STRINGS[locale.startsWith("ar") ? "ar" : "en"];
