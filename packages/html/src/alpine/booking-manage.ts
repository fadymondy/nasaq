// nqBookingManage: a patient's own booking page. The markup is the React BookingManage's (see the Blade component); the state lives here.
// There is no backend: reschedule and cancel dispatch a bubbling event and update the page at once. The event detail carries `fail(message)`:
// call it to put the page back and show the message. The server-rendered ticket is not redrawn: render it again from your response.
//
//   <div data-slot="booking-manage" x-data="nqBookingManage('confirmed', { start: '2030-01-05T10:00', failed: 'That did not work.' })">…</div>
//
// Events: "reschedule" { start, fail } and "cancel-booking" { fail }. State: status (requested … cancelled), open (the reschedule dialog),
// choice (the chosen time, "YYYY-MM-DDTHH:mm"), error. Options: start, failed (the message when fail() is called without one).

import type { Magics, Register } from "./types";

export interface BookingManageOptions {
  start?: string;
  failed?: string;
}

interface ManageState extends Magics {
  status: string;
  open: boolean;
  choice: string | null;
  error: string | null;
  start: string | undefined;
  failed: string;
  root: HTMLElement;
}

export const bookingManage: Register = (Alpine) => {
  Alpine.data("nqBookingManage", (status = "confirmed", options: BookingManageOptions = {}) => ({
    status,
    open: false,
    choice: null as string | null,
    error: null as string | null,
    start: options.start,
    failed: options.failed ?? "",
    root: null as unknown as HTMLElement,
    init(this: ManageState) {
      this.root = this.$el;
    },
    openDialog(this: ManageState) {
      this.choice = null;
      this.error = null;
      this.open = true;
    },
    move(this: ManageState) {
      if (!this.choice) return;
      const start = this.choice;
      const before = this.start;
      this.error = null;
      this.start = start;
      this.open = false;
      const fail = (message?: string) => {
        this.start = before;
        this.error = message || this.failed;
        this.choice = start;
        this.open = true;
      };
      this.root.dispatchEvent(new CustomEvent("reschedule", { bubbles: true, detail: { start, fail } }));
    },
    cancel(this: ManageState) {
      const before = this.status;
      this.error = null;
      this.status = "cancelled";
      const fail = (message?: string) => {
        this.status = before;
        this.error = message || this.failed;
      };
      this.root.dispatchEvent(new CustomEvent("cancel-booking", { bubbles: true, detail: { fail } }));
    },
  }));
};
