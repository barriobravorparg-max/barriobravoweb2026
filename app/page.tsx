import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { toAppUser } from "@/lib/supabase/user";
import { PageShell } from "@/components/PageShell";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return (
    <Suspense fallback={null}>
      <PageShell user={session ? toAppUser(session.user) : null} />
    </Suspense>
  );
}
