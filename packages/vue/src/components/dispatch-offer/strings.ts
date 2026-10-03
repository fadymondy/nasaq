export const STRINGS = {
  en: {
    title: "New delivery offer",
    pickup: "Pick up",
    dropoff: "Drop off",
    fee: "You earn",
    cash: "Cash to collect",
    distance: "Trip",
    eta: "To pickup",
    accept: "Accept",
    decline: "Decline",
    expired: "Offer expired",
    seconds: "s",
    secondsLeft: (n: number) => (n === 1 ? "1 second left to answer" : `${n} seconds left to answer`),
    stops: (n: number) => (n === 1 ? "1 order" : `${n} orders`),
    dispatcherTitle: "Offer to a driver",
    dispatcherFee: "Driver earns",
    offerToDriver: "Offer to driver",
    cancel: "Cancel",
  },
  ar: {
    title: "عرض توصيل جديد",
    pickup: "الاستلام",
    dropoff: "التسليم",
    fee: "ربحك",
    cash: "المبلغ المطلوب تحصيله",
    distance: "الرحلة",
    eta: "إلى الاستلام",
    accept: "قبول",
    decline: "رفض",
    expired: "انتهى العرض",
    seconds: "ث",
    secondsLeft: (n: number) => (n === 1 ? "بقيت ثانية واحدة للرد" : n === 2 ? "بقيت ثانيتان للرد" : n <= 10 ? `بقيت ${n} ثوانٍ للرد` : `بقيت ${n} ثانية للرد`),
    stops: (n: number) => (n === 1 ? "طلب واحد" : n === 2 ? "طلبان" : n <= 10 ? `${n} طلبات` : `${n} طلبًا`),
    dispatcherTitle: "عرض على سائق",
    dispatcherFee: "يربح السائق",
    offerToDriver: "عرض على السائق",
    cancel: "إلغاء",
  },
};
export type DispatchOfferLabels = Partial<(typeof STRINGS)["en"]>;
export interface OfferPlace {
  name: string;
  nameAr?: string;
  address?: string;
  addressAr?: string;
}
