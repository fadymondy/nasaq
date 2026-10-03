/**
 * Pure logic for the clinic dashboard: who is on duty, room load and waiting figures. No React, no DOM.
 * Self-contained on purpose: `node --test` loads it directly.
 */

export type ClinicRoomStatus = "free" | "busy" | "cleaning" | "closed";
export type ClinicDoctorStatus = "available" | "in_visit" | "break" | "off";

export interface ClinicRoom {
  id: string;
  name: string;
  status: ClinicRoomStatus;
  doctorId?: string;
  /** The ticket in the room, "A-012". */
  ticket?: string;
  /** When the room became busy, epoch ms. */
  since?: number;
}

export interface ClinicDoctor {
  id: string;
  name: string;
  specialty: string;
  avatar?: string;
  status: ClinicDoctorStatus;
  roomId?: string;
  /** Shift, "HH:mm". */
  shift?: { start: string; end: string };
  waiting: number;
}

const hm = (v: string) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(v);
  return m ? Number(m[1]) * 60 + Number(m[2]) : Number.NaN;
};

/** Whether a doctor is inside their shift right now and not marked off. A doctor with no shift is on duty unless off. */
export function isOnDuty(doctor: ClinicDoctor, now: Date): boolean {
  if (doctor.status === "off") return false;
  if (!doctor.shift) return true;
  const minutes = now.getHours() * 60 + now.getMinutes();
  return minutes >= hm(doctor.shift.start) && minutes < hm(doctor.shift.end);
}

export const doctorsOnDuty = (doctors: readonly ClinicDoctor[], now: Date) => doctors.filter((d) => isOnDuty(d, now));

export function roomCounts(rooms: readonly ClinicRoom[]): Record<ClinicRoomStatus, number> {
  const counts: Record<ClinicRoomStatus, number> = { free: 0, busy: 0, cleaning: 0, closed: 0 };
  for (const r of rooms) counts[r.status]++;
  return counts;
}

/** Rooms in use out of the rooms that are open (closed ones do not count), 0 to 1. */
export function roomOccupancy(rooms: readonly ClinicRoom[]): number {
  const open = rooms.filter((r) => r.status !== "closed");
  return open.length === 0 ? 0 : open.filter((r) => r.status === "busy").length / open.length;
}

export interface WaitingFigures {
  waiting: number;
  /** Longest wait so far in minutes, 0 with nobody waiting. */
  longestMinutes: number;
  averageMinutes: number;
}

/** Waiting figures from the moments people joined the queue (epoch ms). */
export function waitingFigures(queuedAt: readonly number[], now: number): WaitingFigures {
  if (queuedAt.length === 0) return { waiting: 0, longestMinutes: 0, averageMinutes: 0 };
  const waits = queuedAt.map((t) => Math.max(0, (now - t) / 60000));
  return {
    waiting: waits.length,
    longestMinutes: Math.floor(Math.max(...waits)),
    averageMinutes: Math.round(waits.reduce((a, b) => a + b, 0) / waits.length),
  };
}

/** How long a room has been busy, in whole minutes. 0 when it is not busy or has no start. */
export const busyMinutes = (room: ClinicRoom, now: number) => (room.status === "busy" && room.since !== undefined ? Math.max(0, Math.floor((now - room.since) / 60000)) : 0);
