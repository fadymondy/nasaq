// The connector's own words, en and ar, copied from packages/web/src/components/integration-connector/integration-connector.tsx.

export const STRINGS = {
  en: {
    title: "Connections",
    description: "Connect the services this workspace reads from or posts to.",
    list: "Services",
    connect: "Connect",
    reconnect: "Reconnect",
    disconnect: "Disconnect",
    manage: "Change permissions",
    status: { disconnected: "Not connected", connected: "Connected", "needs-reauth": "Needs sign-in again", error: "Connection problem", pending: "Connecting…" },
    connectedAs: "Signed in as",
    account: "Account",
    accountHint: (service: string) => `Which ${service} account or property to use.`,
    lastSync: "Last synced",
    never: "Not synced yet",
    permissions: "Permissions",
    permissionsCount: (n: number) => (n === 1 ? "1 permission" : `${n} permissions`),
    required: "Required",
    dialogTitle: (name: string) => `Connect ${name}`,
    dialogBody: (name: string) => `You will go to ${name} to sign in and approve access. Nasaq never sees your password.`,
    dialogPermissions: "Nasaq will be able to",
    continue: (name: string) => `Continue to ${name}`,
    cancel: "Cancel",
    disconnectTitle: (name: string) => `Disconnect ${name}?`,
    disconnectBody: "Nasaq stops reading from this service and deletes the stored access. Data already imported stays. You can connect it again later.",
    disconnectConfirm: "Disconnect",
    noPermissions: "Pick at least one permission.",
    emptyTitle: "No services to connect",
    emptyBody: "Services you can connect will appear here.",
    genericError: "Something went wrong. Try again.",
  },
  ar: {
    title: "الاتصالات",
    description: "اربط الخدمات التي تقرأ منها مساحة العمل هذه أو تنشر إليها.",
    list: "الخدمات",
    connect: "ربط",
    reconnect: "إعادة الربط",
    disconnect: "فك الربط",
    manage: "تغيير الصلاحيات",
    status: { disconnected: "غير مرتبطة", connected: "مرتبطة", "needs-reauth": "تحتاج تسجيل دخول جديد", error: "مشكلة في الاتصال", pending: "جارٍ الربط…" },
    connectedAs: "مسجَّل باسم",
    account: "الحساب",
    accountHint: (service: string) => `أي حساب أو موقع في ${service} سيُستخدم.`,
    lastSync: "آخر مزامنة",
    never: "لم تتم المزامنة بعد",
    permissions: "الصلاحيات",
    permissionsCount: (n: number) => (n === 1 ? "صلاحية واحدة" : `${n} صلاحيات`),
    required: "مطلوبة",
    dialogTitle: (name: string) => `ربط ${name}`,
    dialogBody: (name: string) => `ستنتقل إلى ${name} لتسجيل الدخول والموافقة على الوصول. لا يرى نسق كلمة مرورك أبدًا.`,
    dialogPermissions: "سيتمكن نسق من",
    continue: (name: string) => `المتابعة إلى ${name}`,
    cancel: "إلغاء",
    disconnectTitle: (name: string) => `فك ربط ${name}؟`,
    disconnectBody: "يتوقف نسق عن القراءة من هذه الخدمة ويحذف بيانات الوصول المخزّنة. تبقى البيانات المستوردة سابقًا. يمكنك الربط مجددًا لاحقًا.",
    disconnectConfirm: "فك الربط",
    noPermissions: "اختر صلاحية واحدة على الأقل.",
    emptyTitle: "لا توجد خدمات للربط",
    emptyBody: "ستظهر هنا الخدمات التي يمكنك ربطها.",
    genericError: "حدث خطأ ما. حاول مرة أخرى.",
  },
};

export type IntegrationConnectorLabels = Partial<(typeof STRINGS)["en"]>;
export type IntegrationConnectorStrings = (typeof STRINGS)["en"];

export function integrationStrings(locale: string, labels?: IntegrationConnectorLabels): IntegrationConnectorStrings {
  const ar = locale.startsWith("ar");
  return { ...STRINGS[ar ? "ar" : "en"], ...labels } as IntegrationConnectorStrings;
}
