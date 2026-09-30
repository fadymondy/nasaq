/* The notifications side-over used by the App Shell pattern. */
import {
  Badge,
  Button,
  NotificationItem,
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Tooltip,
  useNasaq,
} from "@nasaq/web";
import { Bell, CheckCheck, GitPullRequest, Settings, Timer } from "lucide-react";
import { useState, type ReactNode } from "react";

const COPY = {
  en: {
    title: "Notifications",
    description: "Mentions, reviews and project activity.",
    markAll: "Mark all as read",
    settings: "Notification settings",
    unread: "Unread",
    close: "Close",
    empty: "You're all caught up.",
  },
  ar: {
    title: "الإشعارات",
    description: "الإشارات والمراجعات ونشاط المشاريع.",
    markAll: "تعليم الكل كمقروء",
    settings: "إعدادات الإشعارات",
    unread: "غير مقروء",
    close: "إغلاق",
    empty: "لا جديد، أنت على اطلاع بكل شيء.",
  },
};

type Item = {
  id: number;
  actor?: { name: string };
  icon?: ReactNode;
  en: [string, string];
  ar: [string, string];
  ago: [number, Intl.RelativeTimeFormatUnit];
};

const ITEMS: Item[] = [
  { id: 1, actor: { name: "Nour Adel" }, en: ["Nour Adel mentioned you on MH-728", "Can we ship the rail tooltips today?"], ar: ["أشارت إليك نور عادل في MH-728", "هل يمكننا إطلاق تلميحات الشريط اليوم؟"], ago: [2, "minute"] },
  { id: 2, icon: <GitPullRequest />, en: ["Review requested: App shell v2", "fadymondy/nasaq #12"], ar: ["طُلبت مراجعتك: App shell v2", "fadymondy/nasaq #12"], ago: [18, "minute"] },
  { id: 3, actor: { name: "Omar Samy" }, en: ["Omar Samy moved MH-722 to In progress", "React Native package"], ar: ["نقل عمر سامي MH-722 إلى قيد التنفيذ", "حزمة React Native"], ago: [1, "hour"] },
  { id: 4, icon: <Timer />, en: ["Timer running for 3 hours", "MH-728 · App shell v2"], ar: ["المؤقت يعمل منذ 3 ساعات", "MH-728 · App shell v2"], ago: [3, "hour"] },
  { id: 5, actor: { name: "Mona Hany" }, en: ["Mona Hany commented on the registry plan", "Blocked on the docs domain, see thread."], ar: ["علّقت منى هاني على خطة السجل", "متوقف على نطاق التوثيق، راجع النقاش."], ago: [1, "day"] },
];

export function NotificationsSheet() {
  const { locale } = useNasaq();
  const lang = locale.startsWith("ar") ? "ar" : "en";
  const t = COPY[lang];
  const rtf = new Intl.RelativeTimeFormat(locale, { style: "narrow", numeric: "always", numberingSystem: "latn" } as Intl.RelativeTimeFormatOptions);
  const [unread, setUnread] = useState(new Set([1, 2, 3]));

  return (
    <Sheet>
      <Tooltip content={t.title}>
        <SheetTrigger
          render={<Button variant="ghost" size="icon-sm" className="relative text-muted-foreground" />}
          aria-label={unread.size ? `${t.title} (${unread.size})` : t.title}
        >
          <Bell />
          {unread.size ? <span aria-hidden className="absolute end-1.5 top-1.5 size-1.5 rounded-full bg-nq-accent" /> : null}
        </SheetTrigger>
      </Tooltip>
      <SheetContent closeLabel={t.close}>
        <SheetHeader>
          <div className="flex items-center gap-2">
            <SheetTitle>{t.title}</SheetTitle>
            {unread.size ? <Badge variant="accent">{unread.size}</Badge> : null}
          </div>
          <SheetDescription>{t.description}</SheetDescription>
        </SheetHeader>
        <SheetBody className="divide-y divide-border">
          {ITEMS.map((n) => (
            <NotificationItem
              key={n.id}
              actor={n.actor}
              icon={n.icon}
              title={n[lang][0]}
              description={n[lang][1]}
              time={rtf.format(-n.ago[0], n.ago[1])}
              unread={unread.has(n.id)}
              unreadLabel={t.unread}
              onClick={() => setUnread((prev) => new Set([...prev].filter((id) => id !== n.id)))}
            />
          ))}
        </SheetBody>
        <SheetFooter className="justify-between">
          <Button variant="ghost" size="sm" disabled={!unread.size} onClick={() => setUnread(new Set())}>
            <CheckCheck />
            {t.markAll}
          </Button>
          <Tooltip content={t.settings}>
            <Button variant="ghost" size="icon-sm" aria-label={t.settings} className="text-muted-foreground">
              <Settings />
            </Button>
          </Tooltip>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
