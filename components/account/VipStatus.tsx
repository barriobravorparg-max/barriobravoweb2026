"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { EmptyState } from "@/components/ui/EmptyState";
import { getActiveVipTier, type PurchaseRow } from "@/lib/purchases/active-tier";
import { vipTiers } from "@/lib/content";

export function VipStatus() {
  const [purchases, setPurchases] = useState<PurchaseRow[] | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("purchases")
      .select("item_type, item_key, expires_at")
      .then(({ data }: { data: PurchaseRow[] | null }) => setPurchases(data ?? []));
  }, []);

  if (purchases === null) return null;

  const activeTier = getActiveVipTier(purchases);

  if (!activeTier) {
    return <EmptyState title="VIP activo" description="No tenés un plan VIP activo por el momento." />;
  }

  const tierDef = vipTiers.find((t) => t.key === activeTier)!;
  const expiresAt = purchases
    .filter((p) => p.item_type === "vip" && p.item_key === activeTier && p.expires_at)
    .map((p) => p.expires_at as string)
    .sort()
    .reverse()[0];

  return (
    <div className="rounded-xl border border-cyan bg-cyan/5 px-6 py-8 text-center">
      <p className="font-display text-2xl uppercase text-white">{tierDef.label}</p>
      {expiresAt && <p className="mt-2 text-sm text-gray-400">Vence el {new Date(expiresAt).toLocaleDateString("es-AR")}</p>}
    </div>
  );
}
