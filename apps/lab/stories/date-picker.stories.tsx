import { DatePicker, DateRangePicker, Field, FieldDescription, FieldError, FieldLabel, TimePicker } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = { title: "Components/Pickers/DatePicker", component: DatePicker } satisfies Meta<typeof DatePicker>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="w-72 p-6">
      <DatePicker aria-label="Due date" />
    </div>
  ),
};

export const InField: Story = {
  render: () => (
    <div className="flex w-72 flex-col gap-5 p-6">
      <Field>
        <FieldLabel>Start date</FieldLabel>
        <DatePicker defaultValue={new Date(2026, 8, 15)} />
        <FieldDescription>Work begins on this day.</FieldDescription>
      </Field>
      <Field invalid>
        <FieldLabel>End date</FieldLabel>
        <DatePicker />
        <FieldError match>Pick an end date.</FieldError>
      </Field>
    </div>
  ),
};

export const Range: Story = {
  render: () => (
    <div className="w-80 p-6">
      <Field>
        <FieldLabel>Reporting period</FieldLabel>
        <DateRangePicker defaultValue={{ from: new Date(2026, 8, 10), to: new Date(2026, 8, 16) }} />
      </Field>
    </div>
  ),
};

export const Time: Story = {
  render: () => (
    <div className="flex flex-col gap-5 p-6">
      <Field>
        <FieldLabel>Meeting time (locale default)</FieldLabel>
        <TimePicker defaultValue="14:30" />
      </Field>
      <Field>
        <FieldLabel>24-hour, 15-minute steps</FieldLabel>
        <TimePicker hourCycle={24} minuteStep={15} defaultValue="09:00" />
      </Field>
    </div>
  ),
};

/** Arabic: Arabic month and weekday names, Western digits, mirrored layout, ص/م day periods. */
export const Arabic: Story = {
  render: () => (
    <div className="flex w-80 flex-col gap-5 p-6" lang="ar" dir="rtl">
      <Field>
        <FieldLabel>تاريخ البدء</FieldLabel>
        <DatePicker locale="ar-SA" defaultValue={new Date(2026, 8, 15)} />
        <FieldDescription>يبدأ العمل في هذا اليوم.</FieldDescription>
      </Field>
      <Field>
        <FieldLabel>الفترة</FieldLabel>
        <DateRangePicker locale="ar-SA" />
      </Field>
      <Field>
        <FieldLabel>وقت الاجتماع</FieldLabel>
        <TimePicker locale="ar-SA" defaultValue="14:30" />
      </Field>
    </div>
  ),
};

export const Hijri: Story = {
  render: () => (
    <div className="w-80 p-6" lang="ar" dir="rtl">
      <DatePicker locale="ar-SA" calendar="islamic-umalqura" defaultValue={new Date(2026, 8, 15)} aria-label="التاريخ الهجري" />
    </div>
  ),
};
