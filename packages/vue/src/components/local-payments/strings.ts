// Built-in English and Arabic strings of the local payments components, copied from the React source.
export const LOCAL_PAYMENTS_STRINGS = {
  en: {
    title: "Pay by transfer",
    description: (total: string) => `Send exactly ${total}, then add your receipt so we can verify it.`,
    method: "Payment method",
    kinds: { "instant-transfer": "Instant transfer", "mobile-wallet": "Mobile wallet", "bank-transfer": "Bank transfer", "cash-deposit": "Cash deposit" },
    fee: (fee: string) => `Fee ${fee}`,
    noFee: "No fee",
    steps: "How to pay",
    details: "Send it to",
    copy: "Copy",
    amount: "Amount",
    feeRow: "Method fee",
    total: "Total to send",
    scan: "Scan to pay",
    reference: "Transfer reference",
    referenceHint: "The reference number shown in your banking or wallet app after the transfer.",
    receipt: "Receipt",
    receiptHint: "A photo or PDF of the transfer. Up to 5 MB.",
    receiptDrop: "Drop the receipt here or browse",
    submit: "I have paid, send for verification",
    cancel: "Cancel",
    failed: "That did not go through. Try again.",
    problems: {
      empty: "Enter the transfer reference.",
      short: "That reference looks too short.",
      chars: "Use letters, digits and dashes only.",
      receipt: "Add the receipt.",
      min: (min: string) => `This method needs at least ${min}.`,
      max: (max: string) => `This method allows up to ${max}.`,
      method: "Choose a payment method.",
    },
    empty: "No payment methods",
    emptyDescription: "Add a method to start taking payments.",
    verification: "Verification",
    stages: { submitted: "Receipt sent", verifying: "Under review", verified: "Payment verified" },
    stageHelp: {
      submitted: "We have your receipt.",
      verifying: "Someone on the team is matching it with the bank.",
      verified: "Your payment is confirmed.",
    },
    statuses: { unpaid: "Awaiting payment", submitted: "Receipt sent", verifying: "Under review", verified: "Verified", rejected: "Rejected" },
    submittedAt: "Sent",
    rejectedTitle: "We could not verify this payment",
    rejectedHelp: "Send a new receipt and we will look again.",
    resubmit: "Send a new receipt",
    viaMethod: (name: string) => `Paid with ${name}`,
    queue: "Payments to verify",
    customer: "Customer",
    methodCol: "Method",
    amountCol: "Amount",
    referenceCol: "Reference",
    sent: "Sent",
    statusCol: "Status",
    search: "Search payments",
    verify: "Verify",
    reject: "Reject",
    viewReceipt: "View receipt",
    rejectTitle: "Reject this payment?",
    rejectDescription: (who: string) => `${who} will be asked to send a new receipt.`,
    reason: "Reason",
    reasonHint: "Say what did not match: amount, date or reference.",
    confirmReject: "Reject payment",
    emptyQueue: "Nothing to verify",
    emptyQueueDescription: "Submitted receipts will show here.",
    queueLabel: "Payments waiting for verification",
    close: "Close",
  },
  ar: {
    title: "الدفع بالتحويل",
    description: (total: string) => `حوّل ${total} بالضبط، ثم أرفق الإيصال لنتحقق منه.`,
    method: "طريقة الدفع",
    kinds: { "instant-transfer": "تحويل فوري", "mobile-wallet": "محفظة إلكترونية", "bank-transfer": "تحويل بنكي", "cash-deposit": "إيداع نقدي" },
    fee: (fee: string) => `الرسوم ${fee}`,
    noFee: "بدون رسوم",
    steps: "طريقة الدفع",
    details: "حوّل إلى",
    copy: "نسخ",
    amount: "المبلغ",
    feeRow: "رسوم الطريقة",
    total: "الإجمالي المطلوب",
    scan: "امسح للدفع",
    reference: "مرجع التحويل",
    referenceHint: "الرقم المرجعي الذي يظهر في تطبيق البنك أو المحفظة بعد التحويل.",
    receipt: "الإيصال",
    receiptHint: "صورة أو ملف PDF للتحويل. حتى 5 ميجابايت.",
    receiptDrop: "أفلت الإيصال هنا أو تصفّح",
    submit: "لقد دفعت، أرسل للتحقق",
    cancel: "إلغاء",
    failed: "لم تتم العملية. حاول مرة أخرى.",
    problems: {
      empty: "أدخل مرجع التحويل.",
      short: "المرجع يبدو قصيرًا جدًا.",
      chars: "استخدم الأحرف والأرقام والشرطات فقط.",
      receipt: "أرفق الإيصال.",
      min: (min: string) => `تتطلب هذه الطريقة ${min} على الأقل.`,
      max: (max: string) => `تسمح هذه الطريقة بحد أقصى ${max}.`,
      method: "اختر طريقة الدفع.",
    },
    empty: "لا توجد طرق دفع",
    emptyDescription: "أضف طريقة لبدء استقبال المدفوعات.",
    verification: "التحقق",
    stages: { submitted: "أُرسل الإيصال", verifying: "قيد المراجعة", verified: "تم التحقق من الدفع" },
    stageHelp: {
      submitted: "استلمنا إيصالك.",
      verifying: "أحد أعضاء الفريق يطابقه مع البنك.",
      verified: "تم تأكيد دفعتك.",
    },
    statuses: { unpaid: "بانتظار الدفع", submitted: "أُرسل الإيصال", verifying: "قيد المراجعة", verified: "تم التحقق", rejected: "مرفوضة" },
    submittedAt: "أُرسل",
    rejectedTitle: "تعذّر التحقق من هذه الدفعة",
    rejectedHelp: "أرسل إيصالًا جديدًا وسننظر فيه مرة أخرى.",
    resubmit: "إرسال إيصال جديد",
    viaMethod: (name: string) => `الدفع عبر ${name}`,
    queue: "مدفوعات بانتظار التحقق",
    customer: "العميل",
    methodCol: "الطريقة",
    amountCol: "المبلغ",
    referenceCol: "المرجع",
    sent: "أُرسلت",
    statusCol: "الحالة",
    search: "ابحث في المدفوعات",
    verify: "تحقق",
    reject: "رفض",
    viewReceipt: "عرض الإيصال",
    rejectTitle: "رفض هذه الدفعة؟",
    rejectDescription: (who: string) => `سيُطلب من ${who} إرسال إيصال جديد.`,
    reason: "السبب",
    reasonHint: "اذكر ما لم يتطابق: المبلغ أو التاريخ أو المرجع.",
    confirmReject: "رفض الدفعة",
    emptyQueue: "لا شيء للتحقق منه",
    emptyQueueDescription: "ستظهر الإيصالات المرسلة هنا.",
    queueLabel: "مدفوعات بانتظار التحقق",
    close: "إغلاق",
  },
};

type Strings = typeof LOCAL_PAYMENTS_STRINGS.en;

/** Override any built-in string. */
export type LocalPaymentsLabels = Partial<Omit<Strings, "kinds" | "problems" | "stages" | "stageHelp" | "statuses">> & {
  kinds?: Partial<Strings["kinds"]>;
  problems?: Partial<Strings["problems"]>;
  stages?: Partial<Strings["stages"]>;
  stageHelp?: Partial<Strings["stageHelp"]>;
  statuses?: Partial<Strings["statuses"]>;
};

/** Merges the built-in strings for `locale` with the caller's overrides. */
export function localPaymentsStrings(locale: string, labels?: LocalPaymentsLabels): Strings {
  const base = LOCAL_PAYMENTS_STRINGS[locale.startsWith("ar") ? "ar" : "en"];
  return {
    ...base,
    ...labels,
    kinds: { ...base.kinds, ...labels?.kinds },
    problems: { ...base.problems, ...labels?.problems },
    stages: { ...base.stages, ...labels?.stages },
    stageHelp: { ...base.stageHelp, ...labels?.stageHelp },
    statuses: { ...base.statuses, ...labels?.statuses },
  } as Strings;
}

export type LocalPaymentKind = "instant-transfer" | "mobile-wallet" | "bank-transfer" | "cash-deposit";

export interface LocalPaymentDetail {
  label: string;
  value: string;
  /** Show a copy button. Default true. */
  copyable?: boolean;
}
