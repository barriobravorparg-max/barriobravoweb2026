import { NextResponse, type NextRequest } from "next/server";
import { checkDevlogPassword } from "@/lib/devlog/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const password = body?.password as string | undefined;
  const title = body?.title as string | undefined;
  const bullets = body?.bullets as string[] | undefined;
  const imageUrl = body?.imageUrl as string | undefined;

  if (!title || typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "Falta title" }, { status: 400 });
  }
  if (!Array.isArray(bullets) || bullets.length === 0 || !bullets.every((b) => typeof b === "string")) {
    return NextResponse.json({ error: "bullets inválido" }, { status: 400 });
  }

  if (!checkDevlogPassword(password)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    return NextResponse.json({ error: "Falta DISCORD_WEBHOOK_URL" }, { status: 500 });
  }

  const discordRes = await fetch(webhookUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      embeds: [
        {
          author: { name: "BarrioBravo RP -" },
          title: `${title} ⚡`,
          description: bullets.map((b) => `- ${b}`).join("\n"),
          color: 0xff6b8a,
          timestamp: new Date().toISOString(),
          ...(imageUrl ? { image: { url: imageUrl } } : {}),
        },
      ],
    }),
  });

  if (!discordRes.ok) {
    return NextResponse.json({ error: `Discord respondió ${discordRes.status} al publicar el embed` }, { status: 502 });
  }

  const admin = createAdminClient();
  const { error: insertError } = await admin.from("devlog_posts").insert({
    title,
    bullets,
    raw_notes: body?.rawNotes ?? "",
    image_url: imageUrl ?? null,
  });

  if (insertError) {
    // El post ya salió en Discord — no lo tratamos como fallo total, pero
    // avisamos que no quedó guardado.
    return NextResponse.json({ dbError: insertError.message });
  }

  return NextResponse.json({ ok: true });
}
