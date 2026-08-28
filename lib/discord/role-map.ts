import type { VipTier } from "@/lib/content";

export function getVipRoleId(tier: VipTier): string | undefined {
  const map: Record<VipTier, string | undefined> = {
    bronce: process.env.DISCORD_ROLE_VIP_BRONCE,
    plata: process.env.DISCORD_ROLE_VIP_PLATA,
    oro: process.env.DISCORD_ROLE_VIP_ORO,
  };
  return map[tier];
}
