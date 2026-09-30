import type { Meta, StoryObj } from "@storybook/react-vite";
import { AttendanceDemo, LeaveDemo, PayrollDemo } from "./_v2-demo";

const meta = { title: "Components/Workflow/HR Attendance", parameters: { layout: "padded" } } satisfies Meta;
export default meta;
type Story = StoryObj;

/** Clock in, take a break and clock out. Hours exclude breaks; late arrivals past the grace period are flagged. */
export const Default: Story = { render: () => <AttendanceDemo /> };

/** Balances per leave type, the request dialog (it checks overlap and balance) and the employee's own requests. */
export const LeaveSelfService: Story = { render: () => <LeaveDemo /> };

/** A manager approves or rejects with a note, from the buttons or the row's context menu. */
export const LeaveManager: Story = { render: () => <LeaveDemo manager /> };

/** Payroll runs: open one for the lines, approve the draft, then mark it paid. */
export const Payroll: Story = { render: () => <PayrollDemo /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <LeaveDemo /> };
