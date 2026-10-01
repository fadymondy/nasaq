/* Desktop locations: page story with a fake server. */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { LocationsDemo, useAr } from "./_explorer-demo";

const meta = { title: "Components/Apps & Platforms/Pages/Desktop Locations", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Page() {
  const ar = useAr();
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-h2 text-foreground">{ar ? "مجلدات مساحة العمل" : "Workspace folders"}</h1>
        <p className="text-body text-muted-foreground">{ar ? "اختر المجلدات التي يمكن للتطبيق قراءتها وتعديلها والبحث فيها على جهازك." : "Choose the folders this app can read, change and search on your computer."}</p>
      </header>
      <LocationsDemo />
    </main>
  );
}

export const Default: Story = { render: () => <Page /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page /> };

export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Page /> };
