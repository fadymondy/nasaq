import type { ProxyHostError, TlsMode } from "./proxy-format";

export const PROXY_STRINGS = {
  en: {
    add: "Add proxy host",
    table: "Proxy hosts",
    search: "Search hosts",
    cols: { hosts: "Domains", upstream: "Forwards to", tls: "TLS", websockets: "WebSockets", status: "Status", enabled: "Enabled" },
    tlsModes: { off: "Off (HTTP only)", auto: "Automatic certificate", custom: "Custom certificate", passthrough: "Passthrough" } satisfies Record<TlsMode, string>,
    tlsShort: { off: "Off", auto: "Auto", custom: "Custom", passthrough: "Passthrough" } satisfies Record<TlsMode, string>,
    tlsHint: {
      off: "Traffic between visitors and the proxy is not encrypted.",
      auto: "A certificate is issued and renewed for you.",
      custom: "You upload the certificate and key on the certificates page.",
      passthrough: "Encrypted traffic goes to the upstream untouched. The upstream must hold the certificate.",
    } satisfies Record<TlsMode, string>,
    on: "On",
    off: "Off",
    states: { online: "Online", offline: "Unreachable", unknown: "Not checked" },
    edit: "Edit",
    remove: "Delete",
    empty: "No proxy hosts yet. Add one to forward a domain to an app.",
    dialogNew: "New proxy host",
    dialogEdit: "Edit proxy host",
    dialogBody: "Requests to these domains are forwarded to the upstream.",
    hosts: "Domain names",
    hostsHint: "One or more, separated by spaces, commas or new lines.",
    upstream: "Upstream address",
    upstreamHint: "Where requests are sent, like http://10.0.0.5:3000.",
    tls: "TLS",
    websockets: "WebSocket support",
    websocketsHint: "Keeps upgraded connections open. Turn on for live apps and chat.",
    enabled: "Enabled",
    errors: { hosts: "Enter valid domain names, like app.example.com.", upstream: "Enter an address like http://10.0.0.5:3000." } satisfies Record<ProxyHostError, string>,
    save: "Save proxy host",
    cancel: "Cancel",
    deleteTitle: (name: string) => `Delete the proxy host for ${name}?`,
    deleteBody: "Requests to these domains stop being forwarded. The app itself is not touched.",
    toggleFor: (name: string) => `Enable ${name}`,
    genericError: "Something went wrong. Try again.",
  },
  ar: {
    add: "إضافة مضيف وكيل",
    table: "مضيفو الوكيل",
    search: "بحث في المضيفين",
    cols: { hosts: "النطاقات", upstream: "يُحوَّل إلى", tls: "TLS", websockets: "WebSockets", status: "الحالة", enabled: "مفعّل" },
    tlsModes: { off: "متوقف (HTTP فقط)", auto: "شهادة تلقائية", custom: "شهادة مخصصة", passthrough: "تمرير مباشر" } satisfies Record<TlsMode, string>,
    tlsShort: { off: "متوقف", auto: "تلقائي", custom: "مخصص", passthrough: "تمرير" } satisfies Record<TlsMode, string>,
    tlsHint: {
      off: "حركة الزوار نحو الوكيل غير مشفرة.",
      auto: "تُصدر الشهادة وتُجدَّد تلقائيًا.",
      custom: "ترفع الشهادة والمفتاح من صفحة الشهادات.",
      passthrough: "تصل الحركة المشفرة إلى الخادم الخلفي كما هي، ويجب أن تكون الشهادة عنده.",
    } satisfies Record<TlsMode, string>,
    on: "مفعّل",
    off: "متوقف",
    states: { online: "متصل", offline: "لا يمكن الوصول", unknown: "لم يُفحص" },
    edit: "تعديل",
    remove: "حذف",
    empty: "لا يوجد مضيفو وكيل بعد. أضف واحدًا لتحويل نطاق إلى تطبيق.",
    dialogNew: "مضيف وكيل جديد",
    dialogEdit: "تعديل مضيف الوكيل",
    dialogBody: "تُحوَّل الطلبات إلى هذه النطاقات نحو الخادم الخلفي.",
    hosts: "أسماء النطاقات",
    hostsHint: "واحد أو أكثر، تفصل بينها مسافات أو فواصل أو أسطر.",
    upstream: "عنوان الخادم الخلفي",
    upstreamHint: "الوجهة التي تُرسل إليها الطلبات مثل http://10.0.0.5:3000.",
    tls: "TLS",
    websockets: "دعم WebSocket",
    websocketsHint: "يُبقي الاتصالات المرقّاة مفتوحة. فعّله للتطبيقات الحية والدردشة.",
    enabled: "مفعّل",
    errors: { hosts: "أدخل أسماء نطاقات صحيحة مثل app.example.com.", upstream: "أدخل عنوانًا مثل http://10.0.0.5:3000." } satisfies Record<ProxyHostError, string>,
    save: "حفظ مضيف الوكيل",
    cancel: "إلغاء",
    deleteTitle: (name: string) => `حذف مضيف الوكيل لـ ${name}؟`,
    deleteBody: "يتوقف تحويل الطلبات إلى هذه النطاقات. لا يتأثر التطبيق نفسه.",
    toggleFor: (name: string) => `تفعيل ${name}`,
    genericError: "حدث خطأ ما. حاول مرة أخرى.",
  },
};

export type ProxyHostsStrings = typeof PROXY_STRINGS.en;
export type ProxyHostsLabels = Partial<ProxyHostsStrings>;
export type ProxyHostsResult = void | { error?: string };

export interface ProxyHost {
  id: string;
  /** Domain names served. The first is the main one. */
  hosts: string[];
  /** Where requests go, like `http://10.0.0.5:3000`. */
  upstream: string;
  tlsMode: TlsMode;
  websockets: boolean;
  enabled: boolean;
  status?: "online" | "offline" | "unknown";
}

export type ProxyHostInput = Omit<ProxyHost, "id" | "status">;
