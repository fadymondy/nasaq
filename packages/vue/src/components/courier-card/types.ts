import type { CourierStatus, CourierVehicle } from "./strings";

/** One courier in `NqCourierList`: the card props plus an id. */
export interface CourierItem {
  id: string;
  name: string;
  nameAr?: string;
  avatarSrc?: string;
  status: CourierStatus;
  vehicle?: CourierVehicle;
  vehicleDetail?: string;
  distanceMeters?: number;
  etaSeconds?: number;
  cashFloatMinor?: number;
  activeOrders?: number;
  currency?: string;
  compact?: boolean;
}
