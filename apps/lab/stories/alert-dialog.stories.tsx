import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  ConfirmButton,
  useNasaq,
} from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

const meta = { title: "Components/Overlays/Alert Dialog", component: AlertDialog } satisfies Meta<typeof AlertDialog>;
export default meta;
type Story = StoryObj<typeof meta>;

const useAr = () => useNasaq().locale.startsWith("ar");

/** The parts, composed by hand. There is no × and an outside press does not close it: the user answers. */
export const Default: Story = {
  render: () => {
    const ar = useAr();
    return (
      <AlertDialog>
        <AlertDialogTrigger render={<Button variant="danger" />}>{ar ? "حذف المشروع" : "Delete project"}</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{ar ? "حذف هذا المشروع؟" : "Delete this project?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {ar ? "ستُحذف المهام وسجلات الوقت والملفات. لا يمكن التراجع." : "Issues, time entries and files are removed. This cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{ar ? "إبقاء المشروع" : "Keep project"}</AlertDialogCancel>
            <AlertDialogAction>{ar ? "حذف" : "Delete"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  },
};

/** The shorthand: a Button that asks first. Labels default from the locale. */
export const Confirm: Story = {
  render: () => {
    const ar = useAr();
    return (
      <ConfirmButton
        title={ar ? "حذف هذا المشروع؟" : "Delete this project?"}
        description={ar ? "ستُحذف المهام والملفات. لا يمكن التراجع." : "Issues and files are removed. This cannot be undone."}
        onConfirm={() => {}}
      >
        {ar ? "حذف المشروع" : "Delete project"}
      </ConfirmButton>
    );
  },
};

/** A promise from `onConfirm` keeps the dialog open with a loading button until it settles. */
export const AsyncConfirm: Story = {
  render: () => {
    const ar = useAr();
    const [done, setDone] = useState(false);
    return (
      <div className="flex items-center gap-3">
        <ConfirmButton
          variant="primary"
          title={ar ? "نشر الإصدار؟" : "Publish this release?"}
          description={ar ? "سيظهر الإصدار لجميع العملاء." : "Every customer will see it."}
          confirmLabel={ar ? "نشر" : "Publish"}
          onConfirm={() => new Promise((resolve) => setTimeout(() => (setDone(true), resolve(null)), 1200))}
        >
          {ar ? "نشر الإصدار" : "Publish release"}
        </ConfirmButton>
        <span className="text-body-sm text-muted-foreground">{done ? (ar ? "تم النشر" : "Published") : ""}</span>
      </div>
    );
  },
};
