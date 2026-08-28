import { vipTiers, vehicles, type ItemType } from "@/lib/content";

export interface CatalogItem {
  label: string;
  priceArs: number;
}

export function findCatalogItem(itemType: ItemType, itemKey: string): CatalogItem | null {
  if (itemType === "vip") {
    const tier = vipTiers.find((t) => t.key === itemKey);
    return tier ? { label: tier.label, priceArs: tier.priceArs } : null;
  }
  const vehicle = vehicles.find((v) => v.key === itemKey);
  return vehicle ? { label: vehicle.label, priceArs: vehicle.priceArs } : null;
}
