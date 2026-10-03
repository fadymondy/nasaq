// The booking helpers (generateSlots, bookingTotals ...) live in booking-math.ts; this folder keeps its own copy and exports only the component and its types.
export { default as NqBookingFlow } from "./NqBookingFlow.vue";
export type { BookingFlowLabels, BookingStepId } from "./strings";
export type { BookingFlowProps, BookingDetailsValue, BookingSlotQuery, BookingSubmission } from "./flow-types";
// BookingPayment and BookingRecord are exported by booking-manage.
export type { BookingLocation, BookingProvider, BookingService } from "./types";
