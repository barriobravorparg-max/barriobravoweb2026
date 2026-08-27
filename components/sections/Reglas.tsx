import { reglas } from "@/lib/content";

const severityClasses: Record<string, string> = {
  Leve: "border-cyan text-cyan",
  Grave: "border-purple text-purple",
  "Muy grave": "border-coral text-coral",
};

export function Reglas() {
  return (
    <section id="reglas" className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
      <div className="text-center">
        <h2 className="font-display text-4xl uppercase text-white sm:text-5xl">Reglas del servidor</h2>
        <p className="mt-2 text-gray-400">Lo mínimo para que el rol funcione para todos.</p>
      </div>

      <ol className="mt-12 space-y-6">
        {reglas.map((regla, i) => (
          <li key={regla.title} className="flex gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-5">
            <span className="font-display text-2xl text-gray-600">{String(i + 1).padStart(2, "0")}</span>
            <div>
              <span className={`inline-block rounded-full border px-3 py-1 text-xs uppercase ${severityClasses[regla.severity]}`}>
                {regla.severity}
              </span>
              <h3 className="mt-2 font-display text-xl uppercase text-white">{regla.title}</h3>
              <p className="mt-1 text-sm text-gray-400">{regla.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
