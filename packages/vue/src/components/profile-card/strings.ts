// Same strings as the React ProfileCard (packages/web/src/components/profile-card/profile-card.tsx).
export const STRINGS = {
  en: {
    online: "Online",
    away: "Away",
    busy: "Busy",
    offline: "Offline",
    localTime: "Local time",
    sameTime: "Same time as you",
    ahead: "{time} ahead of you",
    behind: "{time} behind you",
    night: "It is night there",
    team: "Team",
    teams: "Teams",
    email: "Email",
    message: "Message",
    mention: "Mention",
    viewProfile: "View profile",
    hours: "{n}h",
    hoursMinutes: "{h}h {m}m",
    minutes: "{m}m",
    profileOf: "Profile of {name}",
  },
  ar: {
    online: "متصل",
    away: "بعيد",
    busy: "مشغول",
    offline: "غير متصل",
    localTime: "الوقت المحلي",
    sameTime: "نفس توقيتك",
    ahead: "يسبقك بـ {time}",
    behind: "يتأخر عنك بـ {time}",
    night: "الوقت ليلًا عنده",
    team: "الفريق",
    teams: "الفرق",
    email: "البريد الإلكتروني",
    message: "مراسلة",
    mention: "إشارة",
    viewProfile: "عرض الملف",
    hours: "{n} س",
    hoursMinutes: "{h} س {m} د",
    minutes: "{m} د",
    profileOf: "ملف {name}",
  },
};

export type ProfileCardLabels = (typeof STRINGS)["en"];

export const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ""));

export function offsetText(t: ProfileCardLabels, o: { direction: "same" | "ahead" | "behind"; hours: number; minutes: number }) {
  if (o.direction === "same") return t.sameTime;
  const time = o.minutes === 0 ? fill(t.hours, { n: o.hours }) : o.hours === 0 ? fill(t.minutes, { m: o.minutes }) : fill(t.hoursMinutes, { h: o.hours, m: o.minutes });
  return fill(o.direction === "ahead" ? t.ahead : t.behind, { time });
}
