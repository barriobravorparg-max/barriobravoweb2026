import { testimonios } from "@/lib/content";
import { ImagePlaceholder } from "@/components/ui/ImagePlaceholder";

export function Testimonios() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
      <div className="text-center">
        <h2 className="font-display text-4xl uppercase text-white sm:text-5xl">Lo que dice la comunidad</h2>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
        {testimonios.map((t) => (
          <div key={t.name} className="flex gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-5">
            {/* TODO: imagen — avatar-testimonio-{name}.jpg, 200x200px, ver spec §3.7 */}
            <ImagePlaceholder aspectClassName="aspect-square" label={`Avatar de ${t.name}`} todo="avatar-testimonio.jpg, 200x200px" className="w-16 shrink-0 rounded-full" />
            <div>
              <p className="text-sm italic text-gray-300">&ldquo;{t.quote}&rdquo;</p>
              <p className="mt-2 text-xs uppercase tracking-wide text-gray-500">{t.name}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
