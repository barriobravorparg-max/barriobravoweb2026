"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { EmptyState } from "@/components/ui/EmptyState";

interface PurchaseListItem {
  id: string;
  item_type: "vip" | "vehicle";
  item_key: string;
  amount_ars: number;
  purchased_at: string;
}

export function PurchaseHistory() {
  const [purchases, setPurchases] = useState<PurchaseListItem[] | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("purchases")
      .select("id, item_type, item_key, amount_ars, purchased_at")
      .order("purchased_at", { ascending: false })
      .then(({ data }: { data: PurchaseListItem[] | null }) => setPurchases(data ?? []));
  }, []);

  if (purchases === null) return null;

  if (purchases.length === 0) {
    return <EmptyState title="Historial de compras" description="Todavía no hiciste ninguna compra en la tienda." />;
  }

  return (
    <ul className="flex flex-col gap-3">
      {purchases.map((p) => (
        <li key={p.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4">
          <span className="text-sm uppercase tracking-wide text-white">{p.item_key}</span>
          <span className="text-sm text-gray-400">{new Date(p.purchased_at).toLocaleDateString("es-AR")}</span>
          <span className="text-sm text-peach">${p.amount_ars.toLocaleString("es-AR")} ARS</span>
        </li>
      ))}
    </ul>
  );
}
