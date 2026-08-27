import { ImagePlaceholder } from "@/components/ui/ImagePlaceholder";

const SLOTS = Array.from({ length: 8 }, (_, i) => i + 1);

export function Galeria() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <div className="text-center">
        <h2 className="font-display text-4xl uppercase text-white sm:text-5xl">Galería</h2>
        <p className="mt-2 text-gray-400">Capturas y clips de la comunidad, muy pronto.</p>
      </div>

      <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {SLOTS.map((n) => (
          // TODO: imagen — galeria-{n}.jpg, 1200x900px, ver spec §3.7
          <ImagePlaceholder key={n} aspectClassName="aspect-[4/3]" label={`Galería ${n}`} todo={`galeria-${n}.jpg, 1200x900px`} />
        ))}
      </div>
    </section>
  );
}
