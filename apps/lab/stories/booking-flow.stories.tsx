import type { Meta, StoryObj } from "@storybook/react-vite";
import { BookingFlow } from "@nasaq/web";
import { makeGetSlots, NOW_DATE, tr, useCatalogue, wait } from "./_seatfor-demo";

const meta = { title: "Components/Bookings/Booking Flow", parameters: { layout: "padded" } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Demo({ single = false, signedIn = false, failing = false }: { single?: boolean; signedIn?: boolean; failing?: boolean }) {
  const { ar, locations, services, providers } = useCatalogue();
  const getSlots = makeGetSlots(services);
  return (
    <div className="mx-auto max-w-5xl">
      <BookingFlow
        locations={single ? locations.slice(0, 1) : locations}
        services={services}
        providers={providers}
        getSlots={(q) => getSlots(q)}
        now={NOW_DATE}
        signedIn={signedIn ? { name: tr(ar, "Nour Hassan", "نور حسن"), phone: "+20 100 123 4567", email: "nour@example.com" } : undefined}
        onSubmit={async () => {
          await wait(600);
          if (failing) return { error: tr(ar, "That time was just taken. Pick another.", "تم حجز هذا الوقت للتو. اختر وقتًا آخر.") };
          return { code: "BK-7F3Q9K" };
        }}
      />
    </div>
  );
}

export const Default: Story = { render: () => <Demo /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo /> };
export const SingleBranch: Story = { render: () => <Demo single /> };
export const SignedIn: Story = { render: () => <Demo single signedIn /> };
export const SubmitFails: Story = { render: () => <Demo single failing /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Demo /> };
