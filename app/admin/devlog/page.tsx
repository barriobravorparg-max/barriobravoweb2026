"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";

interface DevlogDraft {
  title: string;
  bullets: string[];
}

interface HistoryPost {
  id: string;
  title: string;
  bullets: string[];
  image_url: string | null;
  created_at: string;
}

type ActiveField = { type: "title" } | { type: "bullet"; index: number };

const EMOJIS = ["🐛", "✨", "⚡", "🔧", "🚀", "🎉", "❤️", "🎨"];

export default function DevlogAdminPage() {
  const [password, setPassword] = useState("");
  const [rawNotes, setRawNotes] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  const [draft, setDraft] = useState<DevlogDraft | null>(null);
  const [activeField, setActiveField] = useState<ActiveField | null>(null);

  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishedOk, setPublishedOk] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  const [history, setHistory] = useState<HistoryPost[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Doble clic rápido puede disparar el handler dos veces antes de que
  // React pinte el `disabled` — este ref bloquea la reentrada de forma
  // síncrona, sin depender del ciclo de render.
  const isGeneratingRef = useRef(false);
  const isPublishingRef = useRef(false);

  function insertEmoji(emoji: string) {
    if (!activeField || !draft) return;
    if (activeField.type === "title") {
      setDraft({ ...draft, title: draft.title + emoji });
    } else {
      const bullets = draft.bullets.map((b, i) => (i === activeField.index ? b + emoji : b));
      setDraft({ ...draft, bullets });
    }
  }

  function handleImageChange(file: File | null) {
    setImageFile(file);
    setImagePreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
  }

  async function fetchHistory() {
    setHistoryLoading(true);
    try {
      const res = await fetch("/api/devlog/history", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const json = await res.json();
      if (res.ok) setHistory(json.posts);
    } catch {
      // El historial es un extra — si falla, no interrumpe el flujo principal.
    } finally {
      setHistoryLoading(false);
    }
  }

  async function handleGenerate() {
    if (isGeneratingRef.current) return;
    isGeneratingRef.current = true;
    setError(null);
    setErrorDetail(null);
    setPublishedOk(false);
    setDraft(null);
    setGenerating(true);
    try {
      const res = await fetch("/api/devlog/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password, rawNotes }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Algo falló al generar el devlog.");
        if (json.rawResponse) {
          setErrorDetail(typeof json.rawResponse === "string" ? json.rawResponse : JSON.stringify(json.rawResponse, null, 2));
        }
        return;
      }
      setDraft({ title: json.title, bullets: json.bullets });
      fetchHistory();
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      isGeneratingRef.current = false;
      setGenerating(false);
    }
  }

  async function handlePublish() {
    if (isPublishingRef.current || !draft) return;
    isPublishingRef.current = true;
    setError(null);
    setErrorDetail(null);
    setPublishing(true);
    try {
      let imageUrl: string | undefined;

      if (imageFile) {
        const form = new FormData();
        form.set("password", password);
        form.set("file", imageFile);
        const uploadRes = await fetch("/api/devlog/upload-image", { method: "POST", body: form });
        const uploadJson = await uploadRes.json();
        if (!uploadRes.ok) {
          setError(uploadJson.error ?? "No se pudo subir la imagen.");
          return;
        }
        imageUrl = uploadJson.url;
      }

      const res = await fetch("/api/devlog/publish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password, title: draft.title, bullets: draft.bullets, imageUrl, rawNotes }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Algo falló al publicar el devlog.");
        return;
      }
      setPublishedOk(true);
      fetchHistory();
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      isPublishingRef.current = false;
      setPublishing(false);
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
            rows={8}
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white placeholder:text-gray-500"
            placeholder="Ej: arreglamos el bug de la galería, subimos el límite de tamaño de imagen a 20MB..."
          />
        </div>

        <div>
          <label htmlFor="image" className="block text-sm text-gray-400">
            Imagen (opcional)
          </label>
          <input
            id="image"
            type="file"
            accept="image/*"
            onChange={(e) => handleImageChange(e.target.files?.[0] ?? null)}
            className="mt-1 block text-sm text-gray-400 file:mr-3 file:rounded-full file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-xs file:uppercase file:text-white"
          />
          {imagePreviewUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imagePreviewUrl} alt="Preview de la imagen a publicar" className="mt-3 max-h-48 rounded-lg" />
          )}
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

        <Button variant="primary" disabled={generating || !rawNotes.trim()} onClick={handleGenerate}>
          {generating ? "Generando…" : "Generar"}
        </Button>
      </div>

      {draft && (
        <div className="mt-10 rounded-2xl border border-coral/30 bg-white/[0.03] p-6">
          <p className="text-xs uppercase tracking-wide text-coral">Preview — editable antes de publicar</p>

          <div className="mt-3 flex flex-wrap gap-2">
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => insertEmoji(emoji)}
                className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1 text-base hover:bg-white/10"
              >
                {emoji}
              </button>
            ))}
          </div>

          <input
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            onFocus={() => setActiveField({ type: "title" })}
            className="mt-4 w-full rounded-lg border border-white/10 bg-transparent px-3 py-2 font-display text-xl text-white"
          />

          <ul className="mt-4 space-y-2">
            {draft.bullets.map((bullet, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="text-coral">-</span>
                <input
                  value={bullet}
                  onChange={(e) => {
                    const bullets = draft.bullets.map((b, j) => (j === i ? e.target.value : b));
                    setDraft({ ...draft, bullets });
                  }}
                  onFocus={() => setActiveField({ type: "bullet", index: i })}
                  className="flex-1 rounded-lg border border-white/10 bg-transparent px-3 py-1.5 text-sm text-gray-300"
                />
                <button
                  type="button"
                  aria-label="Quitar bullet"
                  onClick={() => setDraft({ ...draft, bullets: draft.bullets.filter((_, j) => j !== i) })}
                  className="text-gray-500 hover:text-coral"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => setDraft({ ...draft, bullets: [...draft.bullets, ""] })}
            className="mt-3 text-xs uppercase tracking-wide text-gray-400 hover:text-white"
          >
            + Agregar bullet
          </button>

          <div className="mt-6">
            <Button variant="primary" disabled={publishing || !draft.title.trim()} onClick={handlePublish}>
              {publishing ? "Publicando…" : "Publicar en Discord"}
            </Button>
          </div>

          {publishedOk && <p className="mt-3 text-sm text-gray-400">Publicado ✅</p>}
        </div>
      )}

      <div className="mt-12">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wide text-gray-500">Historial</p>
          <button
            type="button"
            onClick={fetchHistory}
            disabled={historyLoading || !password}
            className="text-xs text-gray-400 hover:text-white disabled:opacity-40"
          >
            {historyLoading ? "Cargando…" : "Actualizar"}
          </button>
        </div>

        {history === null && <p className="mt-3 text-sm text-gray-500">Todavía no se cargó el historial.</p>}
        {history?.length === 0 && <p className="mt-3 text-sm text-gray-500">Todavía no hay devlogs publicados.</p>}

        <ul className="mt-3 space-y-3">
          {history?.map((post) => (
            <li key={post.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <p className="text-sm font-semibold text-white">{post.title}</p>
              <p className="text-xs text-gray-500">
                {new Date(post.created_at).toLocaleString("es-AR", { dateStyle: "medium", timeStyle: "short" })}
              </p>
              <ul className="mt-2 space-y-1 text-xs text-gray-400">
                {post.bullets.map((bullet, i) => (
                  <li key={i}>- {bullet}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
