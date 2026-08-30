import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
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

const thenMock = vi.fn((cb: (result: { data: unknown[] }) => void) => cb({ data: [PHOTO] }));
const limitMock = vi.fn(() => ({ then: thenMock }));
const orderMock = vi.fn(() => ({ limit: limitMock }));
const selectMock = vi.fn(() => ({ order: orderMock }));
const fromMock = vi.fn(() => ({ select: selectMock }));
const getPublicUrlMock = vi.fn(() => ({ data: { publicUrl: "https://x.supabase.co/gallery/msg-1.png" } }));
const storageFromMock = vi.fn(() => ({ getPublicUrl: getPublicUrlMock }));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ from: fromMock, storage: { from: storageFromMock } }),
}));

describe("Galeria", () => {
  beforeEach(() => {
    thenMock.mockImplementation((cb: (result: { data: unknown[] }) => void) => cb({ data: [PHOTO] }));
  });

  it("shows the empty state when there are no photos yet", async () => {
    thenMock.mockImplementationOnce((cb: (result: { data: unknown[] }) => void) => cb({ data: [] }));
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

  it("shows the CTA to join Discord", async () => {
    render(<Galeria />);
    await waitFor(() => expect(screen.getByText(/Querés aparecer acá/i)).toBeInTheDocument());
  });
});
