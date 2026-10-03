import type { StatusTone } from "../status";
import type { DeliveryStatus } from "./format";

export const statusTone: Record<DeliveryStatus, StatusTone> = { success: "success", failed: "danger", pending: "info" };
