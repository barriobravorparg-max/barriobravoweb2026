"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import type { AppUser } from "@/lib/supabase/user";

interface AccountDetailsProps {
  user: AppUser;
}

export function AccountDetails({ user }: AccountDetailsProps) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
      {user.avatarUrl ? (
        <Image src={user.avatarUrl} alt="" width={80} height={80} className="rounded-full" />
      ) : (
        <div className="h-20 w-20 shrink-0 rounded-full bg-purple/10" />
      )}
      <div>
        <p className="font-display text-2xl uppercase text-white">{user.displayName}</p>
        {user.email && <p className="text-sm text-gray-400">{user.email}</p>}
        <Button variant="outline-purple" onClick={handleLogout} className="mt-4">
          Salir
        </Button>
      </div>
    </div>
  );
}
