import type { Meta, StoryObj } from "@storybook/react-vite";
import { AchievementsDemo, LeaderboardDemo, RewardsDemo, StreakDemo } from "./_x3-demo";

const meta = { title: "Components/Data Display/Gamification" } satisfies Meta;
export default meta;
type Story = StoryObj;

/** XP and level, the badge grid with filters, the achievement card and the unlock toast. */
export const Achievements: Story = { render: () => <AchievementsDemo /> };

/** Period tabs, podium, list with movement, and your rank pinned when you are outside the visible rows. */
export const LeaderboardStory: Story = { name: "Leaderboard", render: () => <LeaderboardDemo /> };

export const Streak: Story = { render: () => <div className="max-w-sm"><StreakDemo /></div> };

/** Claim shows progress, then owned. The third card always fails to show the error. */
export const Rewards: Story = { render: () => <RewardsDemo /> };

export const Arabic: Story = {
  globals: { locale: "ar" },
  render: () => (
    <div className="flex flex-col gap-8">
      <AchievementsDemo />
      <LeaderboardDemo />
      <StreakDemo />
      <RewardsDemo />
    </div>
  ),
};
