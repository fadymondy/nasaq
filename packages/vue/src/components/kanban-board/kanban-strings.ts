export const STRINGS = {
  en: {
    board: "Kanban board",
    card: "draggable card",
    empty: "No cards",
    cardCount: (n: string) => `${n} cards`,
    instructions: "To pick up a card, press Space or Enter. Use the arrow keys to move it within or between columns, Space or Enter to drop it, Escape to cancel.",
    pickedUp: (card: string, col: string, pos: string, total: string) => `Picked up ${card}. It is in ${col}, position ${pos} of ${total}.`,
    movedOver: (card: string, col: string, pos: string, total: string) => `${card} is now in ${col}, position ${pos} of ${total}.`,
    dropped: (card: string, col: string, pos: string, total: string) => `Dropped ${card} in ${col}, position ${pos} of ${total}.`,
    cancelled: (card: string) => `Move cancelled. ${card} returned to its place.`,
  },
  ar: {
    board: "لوحة كانبان",
    card: "بطاقة قابلة للسحب",
    empty: "لا توجد بطاقات",
    cardCount: (n: string) => `${n} بطاقات`,
    instructions: "لالتقاط بطاقة اضغط مسافة أو إدخال. استخدم مفاتيح الأسهم لنقلها داخل العمود أو بين الأعمدة، ومسافة أو إدخال لإفلاتها، وEscape للإلغاء.",
    pickedUp: (card: string, col: string, pos: string, total: string) => `تم التقاط ${card}. موجودة في ${col} بالموضع ${pos} من ${total}.`,
    movedOver: (card: string, col: string, pos: string, total: string) => `${card} الآن في ${col} بالموضع ${pos} من ${total}.`,
    dropped: (card: string, col: string, pos: string, total: string) => `تم إفلات ${card} في ${col} بالموضع ${pos} من ${total}.`,
    cancelled: (card: string) => `أُلغي النقل. عادت ${card} إلى مكانها.`,
  },
};
export const strings = (locale: string) => STRINGS[locale.startsWith("ar") ? "ar" : "en"];
export type Strings = typeof STRINGS.en;
