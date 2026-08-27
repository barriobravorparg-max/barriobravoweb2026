import { comunidadStats } from "@/lib/content";

export function Comunidad() {
  return (
    <section id="comunidad" className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
      <h2 className="font-display text-4xl uppercase text-white sm:text-5xl">Comunidad</h2>
      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-8">
          <p className="font-display text-4xl text-peach">{comunidadStats.jugadoresOnline}</p>
          <p className="mt-1 text-sm text-gray-400">Jugadores online</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-8">
          <p className="font-display text-4xl text-peach">{comunidadStats.miembrosDiscord}</p>
          <p className="mt-1 text-sm text-gray-400">Miembros en Discord</p>
        </div>
      </div>
    </section>
  );
}
