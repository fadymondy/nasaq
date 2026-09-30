import {
  Button,
  Drawer,
  DrawerBody,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  Field,
  FieldLabel,
  Input,
  useNasaq,
} from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = { title: "Components/Overlays/Drawer", component: Drawer } satisfies Meta<typeof Drawer>;
export default meta;
type Story = StoryObj<typeof meta>;

const COPY = {
  en: {
    open: "Open drawer",
    title: "Edit project",
    description: "Drag the handle down to dismiss. Changes save when you press Save.",
    name: "Name",
    cancel: "Cancel",
    save: "Save",
    long: "Item",
  },
  ar: {
    open: "افتح الدرج",
    title: "تعديل المشروع",
    description: "اسحب المقبض للأسفل للإغلاق. تُحفظ التغييرات عند الضغط على حفظ.",
    name: "الاسم",
    cancel: "إلغاء",
    save: "حفظ",
    long: "عنصر",
  },
};
const useCopy = () => COPY[useNasaq().locale.startsWith("ar") ? "ar" : "en"];

function Demo({ rows = 0 }: { rows?: number }) {
  const c = useCopy();
  return (
    <Drawer>
      <DrawerTrigger render={<Button variant="secondary" />}>{c.open}</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{c.title}</DrawerTitle>
          <DrawerDescription>{c.description}</DrawerDescription>
        </DrawerHeader>
        <DrawerBody className="flex flex-col gap-4 p-4">
          <Field>
            <FieldLabel>{c.name}</FieldLabel>
            <Input defaultValue="Nasaq" />
          </Field>
          {Array.from({ length: rows }, (_, i) => (
            <p key={i} className="text-body-sm text-muted-foreground">
              {c.long} {i + 1}
            </p>
          ))}
        </DrawerBody>
        <DrawerFooter className="justify-end">
          <DrawerClose render={<Button variant="ghost" />}>{c.cancel}</DrawerClose>
          <DrawerClose render={<Button variant="primary" />}>{c.save}</DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

/** Drag the handle down: past 30% of the height (or a quick flick) it closes, otherwise it snaps back. */
export const Default: Story = { render: () => <Demo /> };

/** Long content scrolls inside the body; only the handle drags, so scrolling never closes the drawer. */
export const Scrolling: Story = { render: () => <Demo rows={40} /> };

/** The same drawer forced to Arabic (RTL). */
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo /> };
