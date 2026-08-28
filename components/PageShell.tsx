"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LoadingScreen } from "@/components/loading/LoadingScreen";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { Hero } from "@/components/sections/Hero";
import { Features } from "@/components/sections/Features";
import { Facciones } from "@/components/sections/Facciones";
import { Staff } from "@/components/sections/Staff";
import { TiendaPreview } from "@/components/sections/TiendaPreview";
import { Reglas } from "@/components/sections/Reglas";
import { Faq } from "@/components/sections/Faq";
import { Testimonios } from "@/components/sections/Testimonios";
import { Galeria } from "@/components/sections/Galeria";
import { Comunidad } from "@/components/sections/Comunidad";
import { Newsletter } from "@/components/sections/Newsletter";
import type { AppUser } from "@/lib/supabase/user";

interface PageShellProps {
  user: AppUser | null;
}

export function PageShell({ user }: PageShellProps) {
  const [loaded, setLoaded] = useState(false);
  const searchParams = useSearchParams();
  const hasAuthError = searchParams.get("auth_error") === "1";

  useEffect(() => {
    document.body.style.overflow = loaded ? "" : "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [loaded]);

  return (
    <>
      {!loaded && <LoadingScreen onFinish={() => setLoaded(true)} />}
      <Navbar user={user} />
      {hasAuthError && (
        <div role="alert" className="bg-coral/10 px-4 py-3 text-center text-sm text-coral">
          No pudimos conectarte con Discord. Probá de nuevo.
        </div>
      )}
      <main>
        <Hero />
        <AnimatedSection>
          <Features />
        </AnimatedSection>
        <AnimatedSection>
          <Facciones />
        </AnimatedSection>
        <AnimatedSection>
          <Staff />
        </AnimatedSection>
        <AnimatedSection>
          <TiendaPreview />
        </AnimatedSection>
        <AnimatedSection>
          <Reglas />
        </AnimatedSection>
        <AnimatedSection>
          <Faq />
        </AnimatedSection>
        <AnimatedSection>
          <Testimonios />
        </AnimatedSection>
        <AnimatedSection>
          <Galeria />
        </AnimatedSection>
        <AnimatedSection>
          <Comunidad />
        </AnimatedSection>
        <AnimatedSection>
          <Newsletter />
        </AnimatedSection>
      </main>
      <Footer />
    </>
  );
}
