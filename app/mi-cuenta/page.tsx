import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { toAppUser } from "@/lib/supabase/user";
import { AccountTabs } from "@/components/account/AccountTabs";

export default async function MiCuentaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
      <h1 className="font-display text-4xl uppercase text-white sm:text-5xl">Mi cuenta</h1>
      <div className="mt-10">
        <AccountTabs user={toAppUser(user)} />
      </div>
    </main>
  );
}
