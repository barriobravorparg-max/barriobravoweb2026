"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

interface DevlogResult {
  title: string;
  bullets: string[];
  dbError?: string;
}

export default function DevlogAdminPage() {
  const [password, setPassword] = useState("");
  const [rawNotes, setRawNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [result, setResult] = useState<DevlogResult | null>(null);

  async function handleSubmit() {
    setError(null);
    setErrorDetail(null);
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch("/api/devlog", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password, rawNotes }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Algo falló al publicar el devlog.");
        if (json.rawResponse) {
          setErrorDetail(typeof json.rawResponse === "string" ? json.rawResponse : JSON.stringify(json.rawResponse, null, 2));
        }
        return;
      }
      setResult(json);
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 py-16 sm:px-6">
      <h1 className="font-display text-3xl uppercase text-white">Devlog</h1>
      <p className="mt-2 text-sm text-gray-400">Pegá notas crudas, se convierten en devlog y se publican en Discord.</p>

      <div className="mt-8 space-y-4">
        <div>
          <label htmlFor="password" className="block text-sm text-gray-400">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white placeholder:text-gray-500"
          />
        </div>

        <div>
          <label htmlFor="rawNotes" className="block text-sm text-gray-400">
            Notas crudas
          </label>
          <textarea
            id="rawNotes"
            value={rawNotes}
            onChange={(e) => setRawNotes(e.target.value)}
            rows={10}
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white placeholder:text-gray-500"
            placeholder="Ej: arreglamos el bug de la galería, subimos el límite de tamaño de imagen a 20MB..."
          />
        </div>

        {error && (
          <div role="alert">
            <p className="text-sm text-coral">{error}</p>
            {errorDetail && (
              <pre className="mt-2 max-h-48 overflow-auto rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs text-gray-400">
                {errorDetail}
              </pre>
            )}
          </div>
        )}

        <Button variant="primary" disabled={loading || !rawNotes.trim()} onClick={handleSubmit}>
          {loading ? "Publicando…" : "Publicar en Discord"}
        </Button>
      </div>

      {result && (
        <div className="mt-10 rounded-2xl border border-coral/30 bg-white/[0.03] p-6">
          <p className="text-xs uppercase tracking-wide text-coral">Preview</p>
          <h2 className="mt-2 font-display text-2xl text-white">{result.title} ⚡</h2>
          <ul className="mt-4 space-y-1.5 text-sm text-gray-300">
            {result.bullets.map((bullet, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-coral">-</span>
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
          {result.dbError && (
            <p className="mt-4 text-xs text-gray-500">
              Se publicó en Discord, pero no se pudo guardar el registro: {result.dbError}
            </p>
          )}
        </div>
      )}
    </main>
  );
}
