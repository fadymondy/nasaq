import { Field, FieldDescription, FieldLabel, Slider, useNasaq } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

const meta = { title: "Components/Forms/Slider", component: Slider } satisfies Meta<typeof Slider>;
export default meta;
type Story = StoryObj<typeof meta>;

/** One thumb with a label and its formatted value. In Arabic the track fills from the right. */
export const Default: Story = {
  render: function Render() {
    const ar = useNasaq().locale.startsWith("ar");
    return (
      <div className="w-80">
        <Slider label={ar ? "مستوى الصوت" : "Volume"} defaultValue={40} />
      </div>
    );
  },
};

/** An array value gives a range with two thumbs. */
export const Range: Story = {
  render: function Render() {
    const ar = useNasaq().locale.startsWith("ar");
    const [value, setValue] = useState<number[]>([1200, 8500]);
    return (
      <div className="w-80">
        <Slider
          label={ar ? "نطاق السعر" : "Price range"}
          min={0}
          max={10000}
          step={100}
          value={value}
          onValueChange={(v) => setValue(Array.isArray(v) ? [...v] : [v])}
          format={{ style: "currency", currency: "SAR", maximumFractionDigits: 0 }}
          thumbLabels={ar ? ["الحد الأدنى", "الحد الأقصى"] : ["Minimum price", "Maximum price"]}
        />
      </div>
    );
  },
};

/** Marks under the track. Their positions mirror in RTL. */
export const Marks: Story = {
  render: function Render() {
    const ar = useNasaq().locale.startsWith("ar");
    return (
      <div className="w-80">
        <Slider
          label={ar ? "الجودة" : "Quality"}
          defaultValue={50}
          step={25}
          format={{ style: "percent", maximumFractionDigits: 0 }}
          marks={[
            { value: 0, label: ar ? "منخفضة" : "Low" },
            { value: 50, label: ar ? "متوسطة" : "Medium" },
            { value: 100, label: ar ? "عالية" : "High" },
          ]}
        />
      </div>
    );
  },
};

export const Disabled: Story = {
  render: function Render() {
    const ar = useNasaq().locale.startsWith("ar");
    return (
      <div className="w-80">
        <Slider label={ar ? "السطوع" : "Brightness"} defaultValue={65} disabled />
      </div>
    );
  },
};

/** Inside a Field the label, description and `name` come from the Field. */
export const InField: Story = {
  render: function Render() {
    const ar = useNasaq().locale.startsWith("ar");
    return (
      <Field name="seats" className="w-80">
        <FieldLabel>{ar ? "عدد المقاعد" : "Seats"}</FieldLabel>
        <Slider aria-label={ar ? "عدد المقاعد" : "Seats"} defaultValue={10} min={1} max={50} showValue />
        <FieldDescription>{ar ? "يمكنك تغييرها لاحقاً." : "You can change this later."}</FieldDescription>
      </Field>
    );
  },
};
