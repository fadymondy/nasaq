import { AvailabilityBadge, LocalClock, NowWidget, SkillsWidget, SocialLinks, StatsWidget, WeatherWidget } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { profileData, useAr5 } from "./_x5-demo";

const meta = { title: "Components/Brand/Personal Widgets", component: LocalClock } satisfies Meta<typeof LocalClock>;
export default meta;
type Story = StoryObj<typeof meta>;

function Widgets() {
  const ar = useAr5();
  const p = profileData(ar);
  return (
    <div className="grid w-full max-w-4xl grid-cols-1 gap-4 md:grid-cols-2">
      <div className="flex flex-col gap-3 md:col-span-2">
        <div className="flex flex-wrap gap-2">
          <AvailabilityBadge status="open" />
          <AvailabilityBadge status="limited" note={ar ? "قائمة انتظار" : "Waitlist"} />
          <AvailabilityBadge status="closed" />
        </div>
        <SocialLinks links={p.links ?? []} />
      </div>
      <LocalClock timeZone="Asia/Riyadh" city={p.location} />
      <WeatherWidget {...p.weather!} />
      <StatsWidget stats={p.stats ?? []} />
      <NowWidget items={p.now ?? []} updated={p.nowUpdated} />
      <div className="md:col-span-2">
        <SkillsWidget skills={p.skills ?? []} />
      </div>
      <SocialLinks links={p.links ?? []} layout="list" />
    </div>
  );
}

export const Default: Story = { args: { timeZone: "Asia/Riyadh" }, render: () => <Widgets /> };
export const Arabic: Story = { args: { timeZone: "Asia/Riyadh" }, globals: { locale: "ar" }, render: () => <Widgets /> };
export const ClockFarAway: Story = { args: { timeZone: "Pacific/Auckland", city: "Auckland", viewerTimeZone: "Asia/Riyadh" } };
export const Fahrenheit: Story = { args: { timeZone: "Asia/Riyadh" }, render: () => <WeatherWidget city="Austin" temperature={30} condition="storm" high={33} low={24} unit="f" /> };
