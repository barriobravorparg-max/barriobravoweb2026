import { tiendaTiers } from "@/lib/content";
import { Button } from "@/components/ui/Button";
import { ImagePlaceholder } from "@/components/ui/ImagePlaceholder";

export function TiendaPreview() {
  return (
    <section id="tienda" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="text-center">
        <h2 className="font-display text-4xl uppercase text-white sm:text-5xl">Tienda</h2>
        <p className="mt-2 text-gray-400">Founder packs y VIP, disponibles apenas abramos la pre-venta.</p>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
        {tiendaTiers.map((tier) => (
          <div key={tier.name} className="relative rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            {"popular" in tier && tier.popular && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-gradient px-3 py-1 text-xs font-semibold uppercase text-base">
                Más popular
              </span>
            )}
            {/* TODO: imagen — tienda-{tier-name}.jpg, 900x600px, ver spec §3.7 */}
            <ImagePlaceholder aspectClassName="aspect-[3/2]" label={`Imagen ${tier.name}`} todo={`tienda-${tier.name.toLowerCase().replace(/\s+/g, "-")}.jpg, 900x600px`} />
            <h3 className="mt-4 font-display text-2xl uppercase text-white">{tier.name}</h3>
            <p className="mt-1 font-display text-xl text-peach">{tier.price}</p>
            <Button variant="primary" disabled className="mt-4 w-full">
              Muy pronto
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}
