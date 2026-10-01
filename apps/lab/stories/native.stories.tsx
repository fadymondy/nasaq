import { Button, NasaqProvider, ProductMark, Screen, Text, type TextVariant, useNasaq } from "@nasaq/native";
import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { ChevronRight } from "lucide-react";
import { useState } from "react";
import { View } from "react-native";

// @nasaq/native rendered through react-native-web. It reads the same toolbar globals as the web stories;
// "system" theme follows the OS here, as it does on a phone.
// On a phone these are the family names registered with expo-font; on web a CSS stack works.
const WEB_FONTS = { latin: "Inter, system-ui", arabic: "Lusail, Alexandria, system-ui", mono: "'JetBrains Mono', monospace" };

const withNative: Decorator = (Story, { globals }) => (
  <div className="h-[640px] overflow-hidden border border-border">
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
  title: "Components/Apps & Platforms/Patterns/Mobile (Native) Foundation",
  decorators: [withNative],
  parameters: { layout: "padded" },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const copy = {
  en: { eyebrow: "Nasaq native", title: "Order in every screen", body: "Plain StyleSheet, tokens from @nasaq/tokens, RTL through I18nManager.", primary: "Continue", secondary: "Later", danger: "Delete", ghost: "Details", saving: "Saving" },
  ar: { eyebrow: "نسق للجوال", title: "نظام في كل شاشة", body: "أنماط بسيطة، ورموز من ‎@nasaq/tokens، واتجاه من اليمين عبر I18nManager.", primary: "متابعة", secondary: "لاحقًا", danger: "حذف", ghost: "التفاصيل", saving: "جارٍ الحفظ" },
};

function useCopy() {
  return copy[useNasaq().script === "arabic" ? "ar" : "en"];
}

function Row({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>{children}</View>;
}

function Foundation() {
  const t = useCopy();
  const nq = useNasaq();
  const [busy, setBusy] = useState(false);
  return (
    <Screen scroll>
      <Row>
        <ProductMark size={32} />
        <Text variant="eyebrow" tone="muted">
          {t.eyebrow}
        </Text>
      </Row>
      <Text variant="h1">{t.title}</Text>
      <Text>{t.body}</Text>
      <Row>
        <Button
          variant="primary"
          loading={busy}
          onPress={() => {
            setBusy(true);
            setTimeout(() => setBusy(false), 900);
          }}
        >
          {busy ? t.saving : t.primary}
        </Button>
        <Button>{t.secondary}</Button>
        <Button variant="ghost" icon={
            <View style={nq.flip}>
              <ChevronRight size={16} color={nq.colors.fg} />
            </View>
          }>
          {t.ghost}
        </Button>
        <Button variant="danger" size="sm">
          {t.danger}
        </Button>
        <Button disabled>{t.secondary}</Button>
      </Row>
    </Screen>
  );
}

export const Overview: Story = { render: () => <Foundation /> };

const ROLES: TextVariant[] = ["display", "h1", "h2", "h3", "body", "body-sm", "label", "caption", "eyebrow", "code"];

function Roles() {
  const nq = useNasaq();
  const sample = nq.script === "arabic" ? "نسق يرتّب الواجهة" : "Nasaq orders the interface";
  return (
    <Screen scroll>
      {ROLES.map((role) => (
        <View key={role} style={{ gap: 2 }}>
          <Text variant="caption" tone="muted" script="latin">
            {role}
          </Text>
          <Text variant={role}>{sample}</Text>
        </View>
      ))}
    </Screen>
  );
}

export const TextRoles: Story = { render: () => <Roles /> };

function Marks() {
  return (
    <Screen>
      <Row>
        {(["nasaq", "fadymondy", "mahaam", "zekra"] as const).map((brand) => (
          <ProductMark key={brand} brand={brand} size={48} />
        ))}
      </Row>
      <Row>
        {[16, 20, 32, 64].map((size) => (
          <ProductMark key={size} size={size} />
        ))}
      </Row>
    </Screen>
  );
}

export const ProductMarks: Story = { render: () => <Marks /> };
