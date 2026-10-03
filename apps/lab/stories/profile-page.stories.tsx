import { Badge, type ProfileAccountDetail, type ProfileApp, ProfileContact, ProfileHero, ProfilePage, ProfileSidebar, ProfileSkills, ProfileWriting } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { demoPosts, profileData, useAr5 } from "./_x5-demo";

const meta = { title: "Components/Website/Profile Page", component: ProfilePage, parameters: { layout: "fullscreen" } } satisfies Meta<typeof ProfilePage>;
export default meta;
type Story = StoryObj<typeof meta>;

const NOW = Date.UTC(2026, 8, 30, 9, 0);

function Full({ widgets = true }: { widgets?: boolean }) {
  const ar = useAr5();
  return <ProfilePage profile={profileData(ar)} now={NOW} widgets={widgets} blogHref="#blog" onContact={() => {}} />;
}

export const Default: Story = { args: { profile: profileData(false) }, render: () => <Full /> };
export const Arabic: Story = { args: { profile: profileData(true) }, globals: { locale: "ar" }, render: () => <Full /> };
export const WithoutWidgets: Story = { args: { profile: profileData(false) }, render: () => <Full widgets={false} /> };
export const Mobile: Story = { args: { profile: profileData(false) }, globals: { viewport: { value: "mobile" } }, render: () => <Full /> };

/** The apps the owner uses, as the host (CircleXO) knows them: official marks, role, organisation, last use. */
function ownerApps(ar: boolean): ProfileApp[] {
  return [
    { id: "mahaam", brand: "mahaam", name: ar ? "مهام" : "Mahaam", description: ar ? "المشاريع والمهام والوقت" : "Projects, issues, time", href: "#mahaam", role: ar ? "مالك" : "Owner", plan: "Pro", org: "3x1", lastUsed: "2026-09-30", badge: 3 },
    { id: "zekra", brand: "zekra", name: ar ? "ذكرى" : "Zekra", description: ar ? "ذاكرة لوكلاء الذكاء الاصطناعي" : "Memory for AI agents", href: "#zekra", role: ar ? "مشرف" : "Admin", org: "3x1", lastUsed: "2026-09-28" },
    { id: "nasaq", brand: "nasaq", name: ar ? "نسق" : "Nasaq", description: ar ? "نظام التصميم" : "Design system", href: "#nasaq", role: ar ? "عضو" : "Member", org: "3x1", lastUsed: "2026-09-21" },
    { id: "seatfor", brand: "seatfor", name: "SeatFor", description: ar ? "الحجوزات" : "Bookings", href: "#seatfor", role: ar ? "عضو" : "Member", org: "CircleXO", lastUsed: "2026-08-02" },
  ];
}

function ownerAccount(ar: boolean): ProfileAccountDetail[] {
  return [
    {
      label: ar ? "البريد الأساسي" : "Primary email",
      value: (
        <span className="inline-flex items-center gap-2">
          <bdi dir="ltr">layla@example.com</bdi>
          <Badge variant="success">{ar ? "مؤكَّد" : "verified"}</Badge>
        </span>
      ),
    },
    { label: ar ? "اللغة" : "Language", value: ar ? "العربية" : "English" },
    { label: ar ? "المنطقة الزمنية" : "Time zone", value: <bdi dir="ltr">Africa/Cairo</bdi> },
    { label: ar ? "المؤسسات" : "Organizations", value: "3x1, CircleXO" },
    { label: ar ? "التحقق بخطوتين" : "Two-step sign-in", value: <Badge variant="success">{ar ? "مفعّل" : "on"}</Badge> },
  ];
}

/** The owner's own page: "Edit profile" replaces contact, and their apps and account come first. */
function Owner({ fresh = false }: { fresh?: boolean }) {
  const ar = useAr5();
  const p = profileData(ar);
  const profile = fresh ? { name: p.name, handle: p.handle, headline: p.headline, joined: p.joined, location: p.location, links: p.links?.filter((l) => l.kind !== "email") } : p;
  return (
    <ProfilePage
      profile={profile}
      now={NOW}
      onEdit={() => {}}
      apps={fresh ? [] : ownerApps(ar)}
      appsHref="#apps"
      account={ownerAccount(ar)}
      widgets={!fresh}
    />
  );
}

export const OwnerView: Story = { name: "Owner view", args: { profile: profileData(false) }, render: () => <Owner /> };
export const OwnerViewArabic: Story = { name: "Owner view (Arabic)", args: { profile: profileData(true) }, globals: { locale: "ar" }, render: () => <Owner /> };
export const OwnerViewNew: Story = { name: "Owner view, new account", args: { profile: profileData(false) }, render: () => <Owner fresh /> };

export const Sections: Story = {
  args: { profile: profileData(false) },
  render: () => {
    const ar = useAr5();
    const p = profileData(ar);
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-10 p-6">
        <ProfileSidebar profile={p} />
        <ProfileHero profile={p} />
        <ProfileSkills skills={p.skills ?? []} />
        <ProfileWriting posts={demoPosts(ar)} limit={2} />
        <ProfileContact email={p.email} availability="limited" />
      </div>
    );
  },
};
