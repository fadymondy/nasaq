import {
  Button,
  ButtonGroup,
  ButtonGroupSeparator,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Icon,
  useNasaq,
} from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ChevronDown } from "lucide-react";

const meta = { title: "Components/Actions/Button Group", component: ButtonGroup } satisfies Meta<typeof ButtonGroup>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Shared borders; only the outer corners are round (inline start of the first, inline end of the last). */
export const Horizontal: Story = {
  render: function Render() {
    const ar = useNasaq().locale.startsWith("ar");
    return (
      <ButtonGroup aria-label={ar ? "الفترة" : "Period"}>
        <Button>{ar ? "يوم" : "Day"}</Button>
        <Button>{ar ? "أسبوع" : "Week"}</Button>
        <Button>{ar ? "شهر" : "Month"}</Button>
      </ButtonGroup>
    );
  },
};

export const Vertical: Story = {
  render: function Render() {
    const ar = useNasaq().locale.startsWith("ar");
    return (
      <ButtonGroup orientation="vertical" aria-label={ar ? "الإجراءات" : "Actions"}>
        <Button>{ar ? "تعديل" : "Edit"}</Button>
        <Button>{ar ? "نسخ" : "Duplicate"}</Button>
        <Button>{ar ? "أرشفة" : "Archive"}</Button>
      </ButtonGroup>
    );
  },
};

/** A split button: the main action plus a DropdownMenu, divided by `ButtonGroupSeparator`. */
export const SplitButton: Story = {
  render: function Render() {
    const ar = useNasaq().locale.startsWith("ar");
    return (
      <ButtonGroup aria-label={ar ? "نشر" : "Publish"}>
        <Button variant="primary">{ar ? "نشر" : "Publish"}</Button>
        <ButtonGroupSeparator />
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="primary" size="icon" aria-label={ar ? "خيارات النشر" : "More publish options"} />}>
            <Icon icon={ChevronDown} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>{ar ? "نشر مجدول" : "Schedule publish"}</DropdownMenuItem>
            <DropdownMenuItem>{ar ? "حفظ كمسودة" : "Save as draft"}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </ButtonGroup>
    );
  },
};
