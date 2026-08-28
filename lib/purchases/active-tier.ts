import type { VipTier } from "@/lib/content";

export interface PurchaseRow {
  item_type: "vip" | "vehicle";
  item_key: string;
  expires_at: string | null;
}

const TIER_RANK: Record<VipTier, number> = { bronce: 1, plata: 2, oro: 3 };

function isVipTier(key: string): key is VipTier {
  return key in TIER_RANK;
}

export function getActiveVipTier(purchases: PurchaseRow[]): VipTier | null {
  const now = Date.now();
  const activeTiers = purchases
    .filter((p) => p.item_type === "vip" && p.expires_at !== null && new Date(p.expires_at).getTime() > now)
    .map((p) => p.item_key)
    .filter(isVipTier);

  if (activeTiers.length === 0) return null;
  return activeTiers.reduce((best, key) => (TIER_RANK[key] > TIER_RANK[best] ? key : best));
}
