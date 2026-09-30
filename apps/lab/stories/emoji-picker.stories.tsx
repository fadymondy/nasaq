import { Button, EmojiPicker, EmojiPickerPanel, Field, FieldLabel, Input, Popover, PopoverContent, PopoverTrigger } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

const meta = { title: "Components/Pickers/EmojiPicker", component: EmojiPicker } satisfies Meta<typeof EmojiPicker>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Follows the lab locale toolbar: Arabic flips the grid and swaps the arrow keys. */
export const Default: Story = {
  render: () => {
    const [text, setText] = useState("");
    return (
      <div className="flex max-w-sm items-end gap-2 p-6">
        <Field className="flex-1">
          <FieldLabel>Message</FieldLabel>
          <Input value={text} onChange={(e) => setText(e.target.value)} />
        </Field>
        <EmojiPicker onEmojiSelect={({ emoji }) => setText((t) => t + emoji)} />
      </div>
    );
  },
};

export const Arabic: Story = {
  render: () => {
    const [text, setText] = useState("");
    return (
      <div lang="ar" dir="rtl" className="flex max-w-sm items-end gap-2 p-6">
        <Field className="flex-1">
          <FieldLabel>الرسالة</FieldLabel>
          <Input value={text} onChange={(e) => setText(e.target.value)} />
        </Field>
        <EmojiPicker onEmojiSelect={({ emoji }) => setText((t) => t + emoji)} />
      </div>
    );
  },
};

/** A custom trigger, skin tone fixed to medium, ten columns. */
export const CustomTrigger: Story = {
  render: () => {
    const [picked, setPicked] = useState("👍");
    return (
      <div className="p-6">
        <EmojiPicker
          skinTone="medium"
          columns={10}
          className="w-[22rem]"
          trigger={<Button variant="secondary">React with {picked}</Button>}
          onEmojiSelect={({ emoji }) => setPicked(emoji)}
        />
      </div>
    );
  },
};

/** The bare panel, for a side sheet or an inline composer. */
export const Inline: Story = {
  render: () => (
    <div className="p-6">
      <EmojiPickerPanel className="rounded-card border border-border" />
    </div>
  ),
};

/** The panel inside your own Popover when you need control over the surface. */
export const InOwnPopover: Story = {
  render: () => (
    <div className="p-6">
      <Popover>
        <PopoverTrigger render={<Button />}>Open</PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <EmojiPickerPanel />
        </PopoverContent>
      </Popover>
    </div>
  ),
};
