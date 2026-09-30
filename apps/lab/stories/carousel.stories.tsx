import {
  Carousel,
  CarouselContent,
  CarouselDots,
  CarouselItem,
  CarouselNext,
  CarouselPlayPause,
  CarouselPrevious,
  NasaqProvider,
  useNasaq,
} from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";

const meta = { title: "Components/Data Display/Carousel", component: Carousel } satisfies Meta<typeof Carousel>;
export default meta;
type Story = StoryObj<typeof meta>;

const useAr = () => useNasaq().locale.startsWith("ar");

function ArabicScope({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useNasaq();
  return (
    <NasaqProvider target="scope" locale="ar" theme={resolvedTheme} className="contents">
      {children}
    </NasaqProvider>
  );
}

const TAGS = ["teal", "violet", "amber", "pink", "blue", "green"] as const;
const NAMES = {
  en: ["Dunes", "Orchard", "Harbour", "Market", "Lagoon", "Meadow"],
  ar: ["الكثبان", "البستان", "الميناء", "السوق", "الشاطئ", "المرج"],
};

/** CSS gradient placeholders stand in for photos, so the lab needs no network. */
function Slide({ tag, next, name }: { tag: string; next: string; name: string }) {
  return (
    <div
      role="img"
      aria-label={name}
      style={{ backgroundImage: `linear-gradient(135deg, var(--nq-tag-${tag}), var(--nq-tag-${next}))` }}
      className="flex aspect-[16/9] items-end rounded-card p-4"
    >
      <span className="rounded-md bg-card/90 px-2 py-1 text-body-sm font-medium text-foreground">{name}</span>
    </div>
  );
}

function Gallery({ autoplay = false, loop = false }: { autoplay?: boolean; loop?: boolean }) {
  const ar = useAr();
  const names = NAMES[ar ? "ar" : "en"];
  return (
    <div className="w-full max-w-xl">
      <Carousel label={ar ? "معرض الصور" : "Image gallery"} autoplay={autoplay ? 3000 : false} loop={loop}>
        <CarouselContent>
          {names.map((name, i) => (
            <CarouselItem key={name}>
              <Slide tag={TAGS[i]!} next={TAGS[(i + 1) % TAGS.length]!} name={name} />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
        <div className="flex items-center justify-center gap-2">
          <CarouselDots />
          <CarouselPlayPause className="mt-3" />
        </div>
      </Carousel>
    </div>
  );
}

/** Drag, use the arrow buttons, the dots, or focus the carousel and press Left / Right. */
export const Default: Story = { render: () => <Gallery /> };

/** Under an Arabic provider the first slide is at the right, chevrons flip and Left goes to the next slide. */
export const Arabic: Story = {
  render: () => (
    <ArabicScope>
      <Gallery />
    </ArabicScope>
  ),
};

function Multi() {
  const ar = useAr();
  const names = NAMES[ar ? "ar" : "en"];
  return (
    <div className="w-full max-w-2xl">
      <Carousel label={ar ? "المجموعات" : "Collections"} align="start" opts={{ slidesToScroll: 1 }}>
        <CarouselContent>
          {names.map((name, i) => (
            <CarouselItem key={name} className="basis-1/2 md:basis-1/3">
              <Slide tag={TAGS[i]!} next={TAGS[(i + 2) % TAGS.length]!} name={name} />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </div>
  );
}

/** Several slides per view with `basis-*` on the items (English and Arabic). */
export const MultiplePerView: Story = {
  render: () => (
    <div className="flex flex-col gap-8">
      <Multi />
      <ArabicScope>
        <Multi />
      </ArabicScope>
    </div>
  ),
};

/** Autoplay every 3 seconds, looping. Pauses on hover and focus, stops after a drag and is off under reduced motion. */
export const Autoplay: Story = {
  render: () => (
    <div className="flex flex-col gap-8">
      <Gallery autoplay loop />
      <ArabicScope>
        <Gallery autoplay loop />
      </ArabicScope>
    </div>
  ),
};
