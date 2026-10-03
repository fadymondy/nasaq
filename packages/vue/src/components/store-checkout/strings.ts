// Strings for the checkout parts (English and Arabic with plurals), same keys as the React kit.
import { computed, type ComputedRef } from "vue";
import { useNasaq } from "../../provider";
import { minorToMajor } from "../currency-input/currency-input-logic";
import { formatNumber } from "../numeric";
import type { RegionKind } from "./address-rules";

const en = {
  title: "Checkout",
  secure: "Secure checkout",
  backToCart: "Back to cart",
  emptyTitle: "There is nothing to check out",
  emptyDescription: "Your cart is empty. Add something and come back.",
  emptyAction: "Back to the shop",
  steps: { contact: "Contact", address: "Delivery address", delivery: "Delivery", payment: "Payment" },
  stepOf: (i: string, total: string) => `Step ${i} of ${total}`,
  edit: "Edit",
  continue: "Continue",
  done: "Done",

  // contact
  guest: "Guest",
  signIn: "Sign in",
  accountTab: "My account",
  email: "Email",
  emailHint: "Your receipt and tracking updates go here.",
  marketing: "Email me news and offers",
  guestNote: "No account needed. You can create one after your order.",
  signInNote: "Sign in to use your saved addresses and follow your orders.",
  signedInAs: (name: string) => `Signed in as ${name}`,

  // address
  savedAddresses: "Saved addresses",
  newAddress: "Use a new address",
  country: "Country",
  fullName: "Full name",
  phone: "Phone",
  line1: "Address",
  line2: "Apartment, floor or landmark (optional)",
  city: "City",
  region: { district: "District", emirate: "Emirate", state: "State", province: "Province", county: "County", governorate: "Governorate", none: "Region" } satisfies Record<RegionKind, string>,
  optional: "(optional)",
  postalCode: "Postal code",
  choose: "Choose",
  billingSame: "Billing address is the same as the delivery address",
  billingTitle: "Billing address",
  problems: {
    required: "This field is required.",
    tooShort: "This is too short.",
    tooLong: "This is too long.",
    postalCode: (example: string) => (example ? `Enter a valid postal code, for example ${example}.` : "Enter a valid postal code."),
    phone: (example: string) => (example ? `Enter a valid phone number, for example ${example}.` : "Enter a valid phone number."),
    region: "Choose one from the list.",
    email: "Enter a valid email address, like name@example.com.",
    signIn: "Sign in to continue, or choose Guest.",
  },

  // delivery
  shippingMethod: "Shipping method",
  free: "Free",
  arrives: (range: string) => `Arrives ${range}`,
  arrivesToday: "Ready for pickup today or tomorrow",
  giftTitle: "Gift options",
  giftToggle: "This order is a gift",
  giftMessage: "Gift message",
  giftMessageHint: (left: string) => `${left} characters left`,
  giftWrap: "Gift wrap",
  giftWrapFee: (money: string) => `Gift wrap, ${money}`,
  hidePrices: "Leave prices off the packing slip",
  notes: "Order notes (optional)",
  notesPlaceholder: "Delivery instructions, a preferred time, a landmark.",
  notesHint: (left: string) => `${left} characters left`,
  methodProblems: { required: "Choose how you want it delivered.", unavailable: "That shipping method is not available. Choose another." },

  // payment
  paymentMethod: "Payment method",
  card: "Credit or debit card",
  cardDescription: "Pay now. Your card details are sent securely and never stored here.",
  cod: "Cash on delivery",
  codDescription: (fee: string) => (fee ? `Pay the courier when it arrives. A ${fee} fee applies.` : "Pay the courier when it arrives."),
  local: "Bank transfer or mobile wallet",
  localDescription: "Send the money, then add the transfer reference. We check it before shipping.",
  wallet: "Wallet balance",
  walletDescription: (balance: string) => `Use your balance, ${balance} available.`,
  unavailable: {
    "not-offered": "Not available for this store.",
    "cod-limit": (max: string) => `Cash on delivery is for orders up to ${max}.`,
    "cod-country": "Cash on delivery is not offered in this country.",
    "wallet-balance": (short: string) => `Your balance is ${short} short.`,
    "local-limit": "This order is outside the limits of these methods.",
  },
  localSent: (reference: string) => `Reference ${reference} sent. We verify it before shipping.`,
  localChange: "Change",
  paymentProblems: {
    required: "Choose how you want to pay.",
    unavailable: "That payment method is not available for this order. Choose another.",
    card: "Complete your card details.",
    local: "Send the transfer reference to use this method.",
  },
  cardRequired: "This field is required.",
  invalidCard: "Enter a valid card number.",
  invalidExpiry: "Enter a valid expiry date, like 08/29.",
  invalidCvc: "Enter the 3 or 4 digit security code.",

  // summary
  summary: "Order summary",
  showSummary: "Show order summary",
  hideSummary: "Hide order summary",
  items: (n: string, count: number) => `${n} ${count === 1 ? "item" : "items"}`,
  subtotal: "Subtotal",
  discount: "Discount",
  shipping: "Shipping",
  shippingPending: "Choose a method",
  tax: "Tax",
  codFee: "Cash on delivery fee",
  giftWrapRow: "Gift wrap",
  total: "Total",
  saving: (money: string) => `You are saving ${money}`,
  quantityShort: (n: string) => `Quantity ${n}`,
  editCart: "Edit cart",

  // place order
  placeOrder: "Place order",
  placing: "Placing your order",
  placeOrderTotal: (money: string) => `Place order, ${money}`,
  terms: "By placing your order you agree to the store terms and the return policy.",
  incomplete: "Finish the sections above to place your order.",
  failedTitle: "We could not place your order",
  failedGeneric: "Something went wrong and your order was not placed. You were not charged. Try again.",
  retry: "Try again",
  dismiss: "Dismiss",
  needsAttention: (section: string) => `Check the ${section} section.`,
  attempts: (n: string) => `Attempt ${n}`,

  // confirmation
  thanks: (name: string) => (name ? `Thank you, ${name}` : "Thank you"),
  confirmed: "Your order is confirmed",
  orderNumber: "Order number",
  emailed: (email: string) => `A confirmation was sent to ${email}.`,
  placedOn: "Placed on",
  deliveryTo: "Delivering to",
  deliveryMethod: "Delivery",
  paymentLabel: "Payment",
  paymentKind: { card: "Paid by card", cod: "Pay on delivery", local: "Waiting for your transfer to be verified", wallet: "Paid from your wallet" },
  itemsTitle: "Your items",
  nextTitle: "What happens next",
  next: ["We are getting your order ready.", "You get an email and a message when it ships, with a tracking number.", "Pay the courier when it arrives."],
  nextPrepaid: ["We are getting your order ready.", "You get an email and a message when it ships, with a tracking number.", "Check the parcel when it arrives and contact us if anything is wrong."],
  nextLocal: ["We check your transfer, usually within a few hours.", "Once it is verified we pack and ship your order.", "You get an email and a message with a tracking number."],
  trackOrder: "Track order",
  continueShopping: "Continue shopping",
  print: "Print receipt",
  giftOrder: "This order is a gift",
  fees: "Fees",
};

export type StoreCheckoutStrings = typeof en;

const ar: StoreCheckoutStrings = {
  title: "إتمام الشراء",
  secure: "دفع آمن",
  backToCart: "العودة إلى السلة",
  emptyTitle: "لا توجد منتجات لإتمام شرائها",
  emptyDescription: "سلتك فارغة. أضف بعض المنتجات ثم عد إلينا.",
  emptyAction: "العودة إلى المتجر",
  steps: { contact: "بيانات التواصل", address: "عنوان التوصيل", delivery: "التوصيل", payment: "الدفع" },
  stepOf: (i, total) => `الخطوة ${i} من ${total}`,
  edit: "تعديل",
  continue: "متابعة",
  done: "تم",

  guest: "زائر",
  signIn: "تسجيل الدخول",
  accountTab: "حسابي",
  email: "البريد الإلكتروني",
  emailHint: "سنرسل إليه إيصالك وتحديثات الشحن.",
  marketing: "أرسلوا لي الأخبار والعروض بالبريد",
  guestNote: "لا تحتاج إلى حساب، ويمكنك إنشاء حساب بعد إتمام الطلب.",
  signInNote: "سجّل الدخول لاستخدام عناوينك المحفوظة ومتابعة طلباتك.",
  signedInAs: (name) => `تم تسجيل الدخول باسم ${name}`,

  savedAddresses: "العناوين المحفوظة",
  newAddress: "استخدام عنوان جديد",
  country: "الدولة",
  fullName: "الاسم الكامل",
  phone: "رقم الجوال",
  line1: "العنوان",
  line2: "الشقة أو الدور أو علامة مميزة (اختياري)",
  city: "المدينة",
  region: { district: "الحي", emirate: "الإمارة", state: "الولاية", province: "المقاطعة", county: "المنطقة", governorate: "المحافظة", none: "المنطقة" },
  optional: "(اختياري)",
  postalCode: "الرمز البريدي",
  choose: "اختر",
  billingSame: "عنوان الفواتير هو نفسه عنوان التوصيل",
  billingTitle: "عنوان الفواتير",
  problems: {
    required: "هذا الحقل مطلوب.",
    tooShort: "القيمة قصيرة جدًا.",
    tooLong: "القيمة طويلة جدًا.",
    postalCode: (example) => (example ? `أدخل رمزًا بريديًا صحيحًا، مثل ${example}.` : "أدخل رمزًا بريديًا صحيحًا."),
    phone: (example) => (example ? `أدخل رقم جوال صحيحًا، مثل ${example}.` : "أدخل رقم جوال صحيحًا."),
    region: "اختر من القائمة.",
    email: "أدخل بريدًا إلكترونيًا صحيحًا، مثل name@example.com.",
    signIn: "سجّل الدخول للمتابعة، أو اختر «زائر».",
  },

  shippingMethod: "طريقة الشحن",
  free: "مجاني",
  arrives: (range) => `يصل ${range}`,
  arrivesToday: "جاهز للاستلام اليوم أو غدًا",
  giftTitle: "خيارات الهدية",
  giftToggle: "هذا الطلب هدية",
  giftMessage: "رسالة الهدية",
  giftMessageHint: (left) => `متبقٍ ${left} حرفًا`,
  giftWrap: "تغليف هدايا",
  giftWrapFee: (money) => `تغليف هدايا، ${money}`,
  hidePrices: "إخفاء الأسعار من قائمة التعبئة",
  notes: "ملاحظات الطلب (اختياري)",
  notesPlaceholder: "تعليمات التوصيل أو وقت مفضّل أو علامة مميزة.",
  notesHint: (left) => `متبقٍ ${left} حرفًا`,
  methodProblems: { required: "اختر طريقة التوصيل.", unavailable: "طريقة الشحن هذه غير متاحة. اختر طريقة أخرى." },

  paymentMethod: "طريقة الدفع",
  card: "بطاقة ائتمان أو خصم",
  cardDescription: "ادفع الآن. تُرسل بيانات بطاقتك بأمان ولا تُخزَّن هنا.",
  cod: "الدفع عند الاستلام",
  codDescription: (fee) => (fee ? `ادفع للمندوب عند وصول الطلب. تُضاف رسوم ${fee}.` : "ادفع للمندوب عند وصول الطلب."),
  local: "تحويل بنكي أو محفظة إلكترونية",
  localDescription: "حوّل المبلغ ثم أضف رقم المرجع. نتحقق منه قبل الشحن.",
  wallet: "رصيد المحفظة",
  walletDescription: (balance) => `استخدم رصيدك، المتاح ${balance}.`,
  unavailable: {
    "not-offered": "غير متاح في هذا المتجر.",
    "cod-limit": (max) => `الدفع عند الاستلام للطلبات حتى ${max}.`,
    "cod-country": "الدفع عند الاستلام غير متاح في هذه الدولة.",
    "wallet-balance": (short) => `رصيدك أقل من المطلوب بمقدار ${short}.`,
    "local-limit": "قيمة الطلب خارج حدود هذه الطرق.",
  },
  localSent: (reference) => `تم إرسال المرجع ${reference}. نتحقق منه قبل الشحن.`,
  localChange: "تغيير",
  paymentProblems: {
    required: "اختر طريقة الدفع.",
    unavailable: "طريقة الدفع هذه غير متاحة لهذا الطلب. اختر طريقة أخرى.",
    card: "أكمل بيانات بطاقتك.",
    local: "أرسل مرجع التحويل لاستخدام هذه الطريقة.",
  },
  cardRequired: "هذا الحقل مطلوب.",
  invalidCard: "أدخل رقم بطاقة صحيحًا.",
  invalidExpiry: "أدخل تاريخ انتهاء صحيحًا، مثل 08/29.",
  invalidCvc: "أدخل رمز الأمان المكوّن من 3 أو 4 أرقام.",

  summary: "ملخص الطلب",
  showSummary: "عرض ملخص الطلب",
  hideSummary: "إخفاء ملخص الطلب",
  items: (n, count) => (count === 1 ? "منتج واحد" : count === 2 ? "منتجان" : count >= 3 && count <= 10 ? `${n} منتجات` : `${n} منتجًا`),
  subtotal: "المجموع الفرعي",
  discount: "الخصم",
  shipping: "الشحن",
  shippingPending: "اختر طريقة الشحن",
  tax: "الضريبة",
  codFee: "رسوم الدفع عند الاستلام",
  giftWrapRow: "تغليف الهدايا",
  total: "الإجمالي",
  saving: (money) => `وفّرت ${money}`,
  quantityShort: (n) => `الكمية ${n}`,
  editCart: "تعديل السلة",

  placeOrder: "تأكيد الطلب",
  placing: "جارٍ تأكيد طلبك",
  placeOrderTotal: (money) => `تأكيد الطلب، ${money}`,
  terms: "بتأكيد طلبك فإنك توافق على شروط المتجر وسياسة الإرجاع.",
  incomplete: "أكمل الأقسام أعلاه لتأكيد طلبك.",
  failedTitle: "تعذّر تأكيد طلبك",
  failedGeneric: "حدث خطأ ولم يتم تأكيد طلبك. لم يُخصم منك أي مبلغ. حاول مرة أخرى.",
  retry: "حاول مرة أخرى",
  dismiss: "إغلاق",
  needsAttention: (section) => `راجع قسم «${section}».`,
  attempts: (n) => `المحاولة ${n}`,

  thanks: (name) => (name ? `شكرًا لك، ${name}` : "شكرًا لك"),
  confirmed: "تم تأكيد طلبك",
  orderNumber: "رقم الطلب",
  emailed: (email) => `أرسلنا تأكيدًا إلى ${email}.`,
  placedOn: "تاريخ الطلب",
  deliveryTo: "التوصيل إلى",
  deliveryMethod: "التوصيل",
  paymentLabel: "الدفع",
  paymentKind: { card: "تم الدفع بالبطاقة", cod: "الدفع عند الاستلام", local: "بانتظار التحقق من تحويلك", wallet: "تم الدفع من المحفظة" },
  itemsTitle: "منتجاتك",
  nextTitle: "ما الخطوة التالية",
  next: ["نجهّز طلبك الآن.", "ستصلك رسالة بريدية ورسالة نصية عند الشحن ومعها رقم التتبع.", "ادفع للمندوب عند وصول الطلب."],
  nextPrepaid: ["نجهّز طلبك الآن.", "ستصلك رسالة بريدية ورسالة نصية عند الشحن ومعها رقم التتبع.", "افحص الطرد عند وصوله وتواصل معنا إذا وجدت أي مشكلة."],
  nextLocal: ["نتحقق من تحويلك، وغالبًا يستغرق ذلك بضع ساعات.", "بعد التحقق نجهّز طلبك ونشحنه.", "ستصلك رسالة بريدية ورسالة نصية ومعها رقم التتبع."],
  trackOrder: "تتبع الطلب",
  continueShopping: "متابعة التسوق",
  print: "طباعة الإيصال",
  giftOrder: "هذا الطلب هدية",
  fees: "الرسوم",
};

export const STORE_CHECKOUT_STRINGS = { en, ar } as const;

type Deep<T> = { [K in keyof T]?: T[K] extends readonly unknown[] ? T[K] : T[K] extends (...args: never[]) => unknown ? T[K] : T[K] extends object ? Deep<T[K]> : T[K] };
export type StoreCheckoutLabels = Deep<StoreCheckoutStrings>;

const isPlain = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
function merge<T>(base: T, over: unknown): T {
  if (!isPlain(over) || !isPlain(base)) return base;
  const out: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(over)) out[key] = isPlain(value) && isPlain(out[key]) ? merge(out[key], value) : (value ?? out[key]);
  return out as T;
}

/** Strings, number and money formatting for the checkout parts. The Nasaq locale picks en or ar; `labels` overrides any key. */
export function useStoreCheckoutStrings(labels: () => StoreCheckoutLabels | undefined = () => undefined) {
  const nq = useNasaq();
  const ar = computed(() => nq.locale.value.startsWith("ar"));
  const t: ComputedRef<StoreCheckoutStrings> = computed(() => {
    const base = STORE_CHECKOUT_STRINGS[ar.value ? "ar" : "en"];
    const l = labels();
    return l ? merge<StoreCheckoutStrings>(base, l) : base;
  });
  const n = (value: number) => formatNumber(value, nq.locale.value);
  const money = (minor: number, currency: string) => {
    const major = minorToMajor(minor, currency);
    const digits = Number.isInteger(major) ? 0 : 2;
    return formatNumber(major, nq.locale.value, { style: "currency", currency, minimumFractionDigits: digits, maximumFractionDigits: digits });
  };
  return { t, n, money, locale: nq.locale, ar };
}
