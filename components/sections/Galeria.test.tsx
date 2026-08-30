import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { Galeria } from "./Galeria";

const PHOTO = {
  id: "p1",
  author_display_name: "Chapita",
  author_avatar_url: "https://cdn.discordapp.com/embed/avatars/0.png",
  caption: "Qué noche en el casino",
  storage_path: "msg-1.png",
  width: 800,
  height: 600,
  posted_at: "2026-08-29T10:00:00.000Z",
  reactions: { "❤️": 2 },
};

type QueryResult = { data: unknown[] | null; error: unknown };

// La cadena termina en una promesa real para que el componente pueda encadenar
// .then().catch() igual que contra supabase-js — así los casos de error de
// PostgREST y de red se pueden ejercitar de verdad.
let queryResult: Promise<QueryResult>;

const limitMock = vi.fn(() => queryResult);
const orderMock = vi.fn(() => ({ limit: limitMock }));
const eqMock = vi.fn(() => ({ order: orderMock }));
const selectMock = vi.fn(() => ({ eq: eqMock }));
const fromMock = vi.fn(() => ({ select: selectMock }));
const getPublicUrlMock = vi.fn(() => ({ data: { publicUrl: "https://x.supabase.co/gallery/msg-1.png" } }));
const storageFromMock = vi.fn(() => ({ getPublicUrl: getPublicUrlMock }));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ from: fromMock, storage: { from: storageFromMock } }),
}));

describe("Galeria", () => {
  beforeEach(() => {
    queryResult = Promise.resolve({ data: [PHOTO], error: null });
    eqMock.mockClear();
  });

  it("shows the empty state when there are no photos yet", async () => {
    queryResult = Promise.resolve({ data: [], error: null });
    render(<Galeria />);
    await waitFor(() => expect(screen.getByText(/Todavía no hay fotos/i)).toBeInTheDocument());
  });

  it("renders a synced photo with author, caption and reactions", async () => {
    render(<Galeria />);
    await waitFor(() => expect(screen.getByText("Chapita")).toBeInTheDocument());
    expect(screen.getByText("Qué noche en el casino")).toBeInTheDocument();
    expect(screen.getByText(/❤️ 2/)).toBeInTheDocument();
    expect(screen.getByAltText(/Foto de Chapita, .*: Qué noche en el casino/i)).toBeInTheDocument();
  });

  it("filters photos by the search box", async () => {
    const user = userEvent.setup();
    render(<Galeria />);
    await waitFor(() => expect(screen.getByText("Chapita")).toBeInTheDocument());

    await user.type(screen.getByPlaceholderText(/Buscar/i), "nadie-existe");

    expect(screen.queryByText("Chapita")).not.toBeInTheDocument();
    expect(screen.getByText(/No encontramos fotos/i)).toBeInTheDocument();
  });

  it("gives the search input an accessible name that survives typing", async () => {
    const user = userEvent.setup();
    render(<Galeria />);
    await waitFor(() => expect(screen.getByText("Chapita")).toBeInTheDocument());

    const input = screen.getByRole("textbox", { name: /Buscar fotos por autor o descripción/i });
    await user.type(input, "chapa");

    expect(screen.getByRole("textbox", { name: /Buscar fotos por autor o descripción/i })).toBe(input);
  });

  it("filters out hidden photos in the query itself, not only via RLS", async () => {
    render(<Galeria />);
    await waitFor(() => expect(screen.getByText("Chapita")).toBeInTheDocument());

    expect(eqMock).toHaveBeenCalledWith("hidden", false);
  });

  it("shows the CTA to join Discord", async () => {
    render(<Galeria />);
    await waitFor(() => expect(screen.getByText(/Querés aparecer acá/i)).toBeInTheDocument());
  });

  describe("when the gallery can't be loaded", () => {
    let errorSpy: { mockRestore: () => void };

    beforeEach(() => {
      errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
      errorSpy.mockRestore();
    });

    it("shows an error message instead of the empty state when PostgREST returns an error", async () => {
      queryResult = Promise.resolve({
        data: null,
        error: { message: "permission denied for table gallery_photos", code: "42501" },
      });

      render(<Galeria />);

      await waitFor(() => expect(screen.getByText(/No pudimos cargar la galería/i)).toBeInTheDocument());
      expect(screen.queryByText(/Todavía no hay fotos/i)).not.toBeInTheDocument();
    });

    it("shows an error message instead of spinning forever when the request rejects", async () => {
      queryResult = Promise.reject(new Error("Failed to fetch"));

      render(<Galeria />);

      await waitFor(() => expect(screen.getByText(/No pudimos cargar la galería/i)).toBeInTheDocument());
      // El skeleton de carga desapareció: no queda girando para siempre.
      expect(document.querySelectorAll(".animate-pulse")).toHaveLength(0);
    });
  });
});
