"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { EmptyState } from "@/components/ui/EmptyState";

interface LeaseRow {
  id: string;
  slot_key: string;
  period: string;
  amount_ars: number;
  leased_at: string;
  expires_at: string;
}

export function MyLeases() {
  const [leases, setLeases] = useState<LeaseRow[] | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("leases")
      .select("id, slot_key, period, amount_ars, leased_at, expires_at")
      .order("leased_at", { ascending: false })
      .then(({ data }: { data: LeaseRow[] | null }) => setLeases(data ?? []));
  }, []);

  if (leases === null) return null;

  if (leases.length === 0) {
    return <EmptyState title="Mis arrendamientos" description="Todavía no arrendaste ninguna banda, negocio o propiedad." />;
  }

  return (
    <ul className="flex flex-col gap-3">
      {leases.map((l) => {
        const isActive = new Date(l.expires_at).getTime() > Date.now();
        return (
          <li key={l.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4">
            <span className="text-sm uppercase tracking-wide text-white">{l.slot_key}</span>
            <span className="text-sm text-gray-400">
              {isActive ? "Activo hasta" : "Venció el"} {new Date(l.expires_at).toLocaleDateString("es-AR")}
            </span>
            <span className="text-sm text-peach">${l.amount_ars.toLocaleString("es-AR")} ARS</span>
          </li>
        );
      })}
    </ul>
  );
}
