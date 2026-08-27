"use client";

import { useState } from "react";
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

export default function Home() {
  const [loaded, setLoaded] = useState(false);

  if (!loaded) {
    return <LoadingScreen onFinish={() => setLoaded(true)} />;
  }

  return (
    <>
      <Navbar />
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
