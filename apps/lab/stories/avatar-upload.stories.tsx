import { AvatarUpload } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { ArabicScope, demoPhoto, useAr, wait } from "./_profile-demo";

const meta = { title: "Components/Account/Avatar Upload", component: AvatarUpload } satisfies Meta<typeof AvatarUpload>;
export default meta;
type Story = StoryObj;

/** Fake save: ramps progress, then shows the cropped file as the new photo. */
function Demo({ initial, shape }: { initial?: string; shape?: "circle" | "square" }) {
  const ar = useAr();
  const [src, setSrc] = useState(initial);
  return (
    <AvatarUpload
      name={ar ? "سارة الحربي" : "Sara Alharbi"}
      src={src}
      shape={shape}
      outputSize={256}
      onChange={async (file, { onProgress }) => {
        for (let p = 0; p <= 100; p += 20) {
          onProgress(p);
          await wait(200);
        }
        setSrc(URL.createObjectURL(file));
      }}
      onRemove={async () => {
        await wait(500);
        setSrc(undefined);
      }}
    />
  );
}

export const Default: Story = { render: () => <Demo /> };
export const WithPhoto: Story = { render: () => <Demo initial={demoPhoto} /> };
export const Square: Story = { render: () => <Demo initial={demoPhoto} shape="square" /> };
export const Arabic: Story = {
  render: () => (
    <ArabicScope>
      <Demo initial={demoPhoto} />
    </ArabicScope>
  ),
};
/** The save always fails, to show the error state with the editor kept open. */
export const SaveFails: Story = {
  render: () => (
    <AvatarUpload
      name="Sara Alharbi"
      onChange={async () => {
        await wait(600);
        throw new Error("The server rejected the image. Try another one.");
      }}
    />
  ),
};
