// The English and Arabic words of AnalyticsConnect and AnalyticsPageFrame, copied from the React components.
export const CONNECT_STRINGS = {
  en: {
    title: (name: string) => `Connect ${name}`,
    description: (name: string) => `Nasaq reads your ${name} data to build this page. It never changes anything in your account.`,
    reauth: (name: string) => `Sign in to ${name} again`,
    reauthDescription: "The connection expired, so the data below is out of date until you reconnect.",
    benefits: "What you will see",
    readOnly: "Read-only access. You can disconnect at any time.",
  },
  ar: {
    title: (name: string) => `ربط ${name}`,
    description: (name: string) => `يقرأ نسق بيانات ${name} لبناء هذه الصفحة. ولا يغيّر شيئًا في حسابك أبدًا.`,
    reauth: (name: string) => `سجّل الدخول إلى ${name} مجددًا`,
    reauthDescription: "انتهت صلاحية الاتصال، لذا تبقى البيانات قديمة حتى تعيد الربط.",
    benefits: "ما الذي ستراه",
    readOnly: "وصول للقراءة فقط. يمكنك فك الربط في أي وقت.",
  },
};

export type AnalyticsConnectLabels = typeof CONNECT_STRINGS.en;

export const FRAME_STRINGS = {
  en: {
    refresh: "Refresh",
    updated: "Updated",
    connected: "Connected",
    disconnect: "Disconnect",
    disconnectTitle: (name: string) => `Disconnect ${name}?`,
    disconnectBody: "This page goes back to the connect screen. Nothing is deleted from your account.",
    connectedTo: "Connected to",
    errorTitle: "Could not load the report",
    retry: "Try again",
  },
  ar: {
    refresh: "تحديث",
    updated: "آخر تحديث",
    connected: "مرتبط",
    disconnect: "فك الربط",
    disconnectTitle: (name: string) => `فك ربط ${name}؟`,
    disconnectBody: "تعود هذه الصفحة إلى شاشة الربط. لا يُحذف شيء من حسابك.",
    connectedTo: "مرتبط بـ",
    errorTitle: "تعذّر تحميل التقرير",
    retry: "أعد المحاولة",
  },
};

export type AnalyticsPageFrameLabels = typeof FRAME_STRINGS.en;
