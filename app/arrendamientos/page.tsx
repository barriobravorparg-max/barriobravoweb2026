import { createClient } from "@/lib/supabase/server";
import { toAppUser } from "@/lib/supabase/user";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ArrendamientosCatalog } from "@/components/sections/ArrendamientosCatalog";

export default async function ArrendamientosPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const user = session ? toAppUser(session.user) : null;

  return (
    <>
      <Navbar user={user} />
      <ArrendamientosCatalog user={user} />
      <Footer />
    </>
  );
}
