import { bandas, negocios, propiedades, type LeaseSlotDef, type Period } from "@/lib/content";

const ALL_SLOTS: LeaseSlotDef[] = [...bandas, ...negocios, ...propiedades];

export function findLeaseSlot(slotKey: string): LeaseSlotDef | null {
  return ALL_SLOTS.find((s) => s.slotKey === slotKey) ?? null;
}

export function getLeasePrice(slot: LeaseSlotDef, period: Period): number | null {
  return period === "mensual" ? slot.priceMensual : slot.priceSemestral;
}

export const PERIOD_DAYS: Record<Period, number> = {
  mensual: 30,
  semestral: 180,
};
