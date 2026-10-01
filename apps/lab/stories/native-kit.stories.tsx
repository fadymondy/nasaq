import {
  AppHeader,
  Badge,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CashCollect,
  EmptyState,
  Input,
  ListRow,
  MoneyText,
  NasaqProvider,
  Notice,
  OfferCard,
  OfferCountdown,
  PinInput,
  RouteStops,
  Screen,
  SegmentedControl,
  Separator,
  Sheet,
  Skeleton,
  StepProgress,
  Switch,
  Text,
  useNasaq,
} from "@nasaq/native";
import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";
import { View } from "react-native";

// The app-facing half of @nasaq/native (cards, fields, sheets, delivery pieces), on react-native-web.
const WEB_FONTS = { latin: "Inter, system-ui", arabic: "Lusail, Alexandria, system-ui", mono: "'JetBrains Mono', monospace" };

const withNative: Decorator = (Story, { globals }) => (
  <div className="h-[720px] overflow-hidden border border-border">
    <NasaqProvider
      brand={globals.brand}
      scheme={globals.theme === "dark" || globals.theme === "light" ? globals.theme : undefined}
      locale={globals.locale ?? "en"}
      density={globals.density}
      expression={globals.expression ?? "native"}
      fonts={WEB_FONTS}
    >
      <Story />
    </NasaqProvider>
  </div>
);

const meta = {
  title: "Components/Apps & Platforms/Patterns/Mobile (Native) Kit",
  decorators: [withNative],
  parameters: { layout: "padded" },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const copy = {
  en: {
    card: "Order #1042", cardBody: "Al-Manara to Masyoun, 2.4 km", open: "Open", delivered: "Delivered", pending: "Pending", late: "Late", online: "Online",
    errorTitle: "Could not save", error: "Check your connection and try again.", sent: "A reset link is on its way.",
    email: "Email", password: "Password", emailError: "Enter a valid email", hint: "We never share it", notes: "Notes",
    lang: "Language", sheet: "Saved places", home: "Home", work: "Work", notify: "Order alerts", notifyHint: "A sound for each new offer",
    balance: "Balance", ledger: "Cash settlement", empty: "No orders yet", emptyBody: "New orders appear here as soon as they arrive.", create: "Create order",
    steps: ["Pickup", "Delivery", "Cash"], pickup: "Al-Rimawi Bakery", dropoff: "Ahmad, Al-Tireh", zone: "Ramallah centre",
    items: "Order", fee: "Delivery fee", pin: "Delivery PIN", wrong: "Wrong PIN",
  },
  ar: {
    card: "طلب رقم 1042", cardBody: "المنارة إلى مصيون، 2.4 كم", open: "فتح", delivered: "تم التسليم", pending: "قيد الانتظار", late: "متأخر", online: "متصل",
    errorTitle: "تعذر الحفظ", error: "تحقق من الاتصال وحاول مرة أخرى.", sent: "رابط إعادة التعيين في طريقه إليك.",
    email: "البريد الإلكتروني", password: "كلمة المرور", emailError: "أدخل بريدًا صحيحًا", hint: "لا نشاركه مع أحد", notes: "ملاحظات",
    lang: "اللغة", sheet: "الأماكن المحفوظة", home: "المنزل", work: "العمل", notify: "تنبيهات الطلبات", notifyHint: "صوت لكل عرض جديد",
    balance: "الرصيد", ledger: "تسوية النقد", empty: "لا توجد طلبات بعد", emptyBody: "تظهر الطلبات الجديدة هنا فور وصولها.", create: "إنشاء طلب",
    steps: ["الاستلام", "التسليم", "النقد"], pickup: "مخبز الرمّاوي", dropoff: "أحمد، الطيرة", zone: "وسط رام الله",
    items: "الطلب", fee: "رسوم التوصيل", pin: "رمز التسليم", wrong: "رمز غير صحيح",
  },
};
const useCopy = () => copy[useNasaq().script === "arabic" ? "ar" : "en"];

function Surfaces() {
  const t = useCopy();
  const [lang, setLang] = useState("a");
  const [on, setOn] = useState(true);
  return (
    <Screen scroll>
      <Card>
        <CardHeader title={t.card} description={t.cardBody} action={<Badge tone="success">{t.delivered}</Badge>} />
        <CardContent>
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            <Badge>{t.pending}</Badge>
            <Badge tone="warning" variant="outline">{t.late}</Badge>
            <Badge tone="info">{t.online}</Badge>
            <Badge tone="danger">!</Badge>
          </View>
        </CardContent>
        <CardFooter>
          <Button variant="primary" style={{ flex: 1 }}>{t.open}</Button>
        </CardFooter>
      </Card>
      <Card tone="danger" onPress={() => {}}>
        <Text variant="label">{t.late}</Text>
      </Card>
      <Notice tone="danger" title={t.errorTitle} onDismiss={() => {}}>{t.error}</Notice>
      <Notice tone="success">{t.sent}</Notice>
      <SegmentedControl value={lang} onChange={setLang} accessibilityLabel={t.lang} options={[{ value: "a", label: "العربية" }, { value: "b", label: "English" }, { value: "c", label: "System" }]} />
      <Switch value={on} onValueChange={setOn} label={t.notify} description={t.notifyHint} />
    </Screen>
  );
}
export const CardsNoticesControls: Story = { render: () => <Surfaces /> };

function Fields() {
  const t = useCopy();
  const [pin, setPin] = useState("");
  return (
    <Screen scroll>
      <Input label={t.email} placeholder="name@example.com" keyboardType="email-address" autoCapitalize="none" hint={t.hint} />
      <Input label={t.password} secureTextEntry />
      <Input label={t.email} defaultValue="nope" error={t.emailError} />
      <Input label={t.notes} multiline />
      <View style={{ gap: 8 }}>
        <Text variant="label">{t.pin}</Text>
        <PinInput value={pin} onChange={setPin} />
        <PinInput value="4821" readOnly />
        <PinInput value="12" error={t.wrong} />
      </View>
    </Screen>
  );
}
export const FieldsAndPin: Story = { render: () => <Fields /> };

function Lists() {
  const t = useCopy();
  const [open, setOpen] = useState(false);
  return (
    <View style={{ flex: 1 }}>
      <AppHeader title={t.balance} canGoBack onBack={() => {}} trailing={<Button variant="ghost" size="sm" onPress={() => setOpen(true)}>{t.sheet}</Button>} />
      <Screen scroll>
        <Card padded={false} style={{ paddingHorizontal: 16 }}>
          <ListRow title={t.ledger} subtitle={t.cardBody} trailing={<MoneyText cents={-18500} tone="sign" />} onPress={() => {}} />
          <Separator />
          <ListRow title={t.delivered} subtitle={t.card} trailing={<MoneyText cents={1500} tone="sign" showPlus />} onPress={() => {}} />
          <Separator />
          <ListRow title={t.fee} trailing={<MoneyText cents={0} tone="sign" />} />
        </Card>
        <Skeleton height={20} width="60%" />
        <Skeleton height={48} />
        <EmptyState title={t.empty} description={t.emptyBody} action={<Button variant="primary">{t.create}</Button>} />
      </Screen>
      <Sheet visible={open} onClose={() => setOpen(false)} title={t.sheet}>
        <ListRow title={t.home} subtitle={t.dropoff} onPress={() => setOpen(false)} />
        <ListRow title={t.work} subtitle={t.pickup} onPress={() => setOpen(false)} />
      </Sheet>
    </View>
  );
}
export const ListsHeaderSheet: Story = { render: () => <Lists /> };

function useTicking(total: number) {
  const [left, setLeft] = useState(total);
  useEffect(() => {
    const id = setInterval(() => setLeft((s) => (s <= 0 ? total : s - 1)), 1000);
    return () => clearInterval(id);
  }, [total]);
  return left;
}

function Delivery() {
  const t = useCopy();
  const seconds = useTicking(30);
  const [due, setDue] = useState<number | null>(null);
  return (
    <Screen scroll>
      <StepProgress steps={t.steps} current={1} />
      <OfferCard pickup={t.pickup} dropoff={t.dropoff} zone={t.zone} feeCents={1500} distanceMeters={2400} etaSeconds={540} seconds={seconds} total={30} onAccept={() => {}} onDecline={() => {}} />
      <View style={{ flexDirection: "row", gap: 16, alignItems: "center" }}>
        <OfferCountdown seconds={seconds} total={30} />
        <OfferCountdown seconds={seconds} total={30} variant="bar" style={{ flex: 1 }} />
      </View>
      <Card>
        <RouteStops
          stops={[
            { kind: "pickup", label: t.pickup, address: t.zone, done: true },
            { kind: "dropoff", label: t.dropoff, address: t.cardBody },
            { kind: "dropoff", label: t.work, address: t.cardBody },
          ]}
          onNavigate={() => {}}
        />
      </Card>
      <CashCollect
        amountDue={6500}
        breakdown={[{ label: t.items, cents: 5000 }, { label: t.fee, cents: 1500 }]}
        value={due}
        onChange={setDue}
        onConfirm={() => {}}
      />
    </Screen>
  );
}
export const DeliveryPieces: Story = { render: () => <Delivery /> };
