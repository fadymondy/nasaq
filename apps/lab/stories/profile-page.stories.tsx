import { ProfileContact, ProfileHero, ProfilePage, ProfileSkills, ProfileWriting } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { demoPosts, profileData, useAr5 } from "./_x5-demo";

const meta = { title: "Components/Brand/Profile Page", component: ProfilePage, parameters: { layout: "fullscreen" } } satisfies Meta<typeof ProfilePage>;
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

export const Sections: Story = {
  args: { profile: profileData(false) },
  render: () => {
    const ar = useAr5();
    const p = profileData(ar);
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-10 p-6">
        <ProfileHero profile={p} />
        <ProfileSkills skills={p.skills ?? []} />
        <ProfileWriting posts={demoPosts(ar)} limit={2} />
        <ProfileContact email={p.email} availability="limited" />
      </div>
    );
  },
};
