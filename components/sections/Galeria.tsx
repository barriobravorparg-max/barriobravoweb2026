"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

interface GalleryPhotoRow {
  id: string;
  author_display_name: string;
  author_avatar_url: string | null;
  caption: string | null;
  storage_path: string;
  width: number;
  height: number;
  posted_at: string;
  reactions: Record<string, number>;
}

export function Galeria() {
  const supabase = useMemo(() => createClient(), []);
  const [photos, setPhotos] = useState<GalleryPhotoRow[] | null>(null);
  const [hasError, setHasError] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    // El query builder de PostgREST es un thenable, no una Promise: lo envolvemos
    // para poder encadenarle un .catch() de verdad.
    Promise.resolve(
      supabase
        .from("gallery_photos")
        .select(
          "id, author_display_name, author_avatar_url, caption, storage_path, width, height, posted_at, reactions"
        )
        // Defensa en profundidad: RLS ya filtra las ocultas, pero si alguna vez
        // quedara mal configurada, este filtro explícito falla del lado seguro.
        .eq("hidden", false)
        .order("posted_at", { ascending: false })
        .limit(60)
    )
      .then(({ data, error }: { data: GalleryPhotoRow[] | null; error: unknown }) => {
        // Un error de PostgREST (RLS, migración sin aplicar, key mala) resuelve
        // con data: null. Sin este chequeo se vería como "no hay fotos".
        if (error) {
          console.error("[Galeria] No se pudieron cargar las fotos", error);
          setHasError(true);
          return;
        }
        setPhotos(data ?? []);
      })
      .catch((err: unknown) => {
        // Fallo de red: la promesa rechaza y el skeleton giraría para siempre.
        console.error("[Galeria] No se pudieron cargar las fotos", err);
        setHasError(true);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    if (!photos) return [];
    const q = query.trim().toLowerCase();
    if (!q) return photos;
    return photos.filter(
      (p) => p.author_display_name.toLowerCase().includes(q) || (p.caption ?? "").toLowerCase().includes(q)
    );
  }, [photos, query]);

  return (
    <section id="galeria" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <div className="text-center">
        <h2 className="font-display text-4xl uppercase text-white sm:text-5xl">Galería</h2>
        <p className="mt-2 text-gray-400">Fotos de la comunidad, sincronizadas desde Discord.</p>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por autor o descripción…"
          aria-label="Buscar fotos por autor o descripción"
          className="mt-6 w-full max-w-sm rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white placeholder:text-gray-500"
        />
      </div>

      {hasError && (
        <p aria-live="polite" className="mt-10 text-center text-gray-400">
          No pudimos cargar la galería. Probá de nuevo en un momento.
        </p>
      )}

      {!hasError && photos === null && (
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="aspect-[4/3] animate-pulse rounded-xl bg-purple/10" />
          ))}
        </div>
      )}

      {!hasError && photos !== null && filtered.length === 0 && (
        <p className="mt-10 text-center text-gray-400">
          {photos.length === 0
            ? "Todavía no hay fotos — sé el primero en compartir una."
            : "No encontramos fotos para esa búsqueda."}
        </p>
      )}

      {filtered.length > 0 && (
        <div className="mt-10 columns-2 gap-4 sm:columns-3 lg:columns-4 [&>*]:mb-4">
          {filtered.map((photo) => {
            const url = supabase.storage.from("gallery").getPublicUrl(photo.storage_path).data.publicUrl;
            const reactionEntries = Object.entries(photo.reactions);
            const dateLabel = new Date(photo.posted_at).toLocaleDateString("es-AR", {
              day: "2-digit",
              month: "short",
            });

            return (
              <figure key={photo.id} className="group relative break-inside-avoid overflow-hidden rounded-xl bg-white/[0.03]">
                <Image
                  src={url}
                  alt={`Foto de ${photo.author_display_name}, ${dateLabel}${photo.caption ? `: ${photo.caption}` : ""}`}
                  width={photo.width}
                  height={photo.height}
                  className="h-auto w-full"
                  loading="lazy"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-3 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                  <div className="flex items-center gap-2">
                    {photo.author_avatar_url && (
                      <Image src={photo.author_avatar_url} alt="" width={24} height={24} className="rounded-full" />
                    )}
                    <span className="text-xs font-semibold text-white">{photo.author_display_name}</span>
                    <span className="text-xs text-gray-400">{dateLabel}</span>
                  </div>
                  {photo.caption && <p className="mt-1 text-xs text-gray-300">{photo.caption}</p>}
                  {reactionEntries.length > 0 && (
                    <div className="mt-1 flex gap-2">
                      {reactionEntries.map(([emoji, count]) => (
                        <span key={emoji} className="text-xs text-gray-300">
                          {emoji} {count}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </figure>
            );
          })}
        </div>
      )}

      <div className="mx-auto mt-10 max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
        <h3 className="font-display text-xl uppercase text-white">¿Querés aparecer acá?</h3>
        <p className="mt-2 text-sm text-gray-400">
          Entrá a nuestro Discord y compartí tus mejores fotos en el canal de la comunidad. El sistema las va a
          publicar acá automáticamente.
        </p>
      </div>
    </section>
  );
}
