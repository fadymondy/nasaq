export const STRINGS = {
  en: {
    available: "Available",
    busy: "Busy",
    offline: "Offline",
    bike: "Bicycle",
    motorbike: "Motorbike",
    car: "Car",
    van: "Van",
    walk: "On foot",
    away: "away",
    eta: "ETA",
    float: "Cash float",
    orders: (n: number) => (n === 1 ? "1 active order" : `${n} active orders`),
    selected: "selected",
    couriers: "Couriers",
  },
  ar: {
    available: "متاح",
    busy: "مشغول",
    offline: "غير متصل",
    bike: "دراجة",
    motorbike: "دراجة نارية",
    car: "سيارة",
    van: "فان",
    walk: "سيرًا على الأقدام",
    away: "بعيدًا",
    eta: "الوصول",
    float: "عهدة نقدية",
    orders: (n: number) => (n === 0 ? "لا طلبات نشطة" : n === 1 ? "طلب نشط واحد" : n === 2 ? "طلبان نشطان" : n <= 10 ? `${n} طلبات نشطة` : `${n} طلبًا نشطًا`),
    selected: "محدد",
    couriers: "السائقون",
  },
};
export type CourierCardLabels = Partial<(typeof STRINGS)["en"]>;
export type CourierStatus = "available" | "busy" | "offline";
export type CourierVehicle = "bike" | "motorbike" | "car" | "van" | "walk";
