import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_MODEL = "claude-sonnet-5";

const DEVLOG_SYSTEM_PROMPT = `Sos un asistente que convierte notas crudas de desarrollo en un devlog para Discord.
Escribí en español rioplatense (voseo), tono directo, sin relleno ni marketing.
No inventes cambios que no estén explícitamente en las notas — si algo es ambiguo, dejalo afuera.
Respondé ÚNICAMENTE con un JSON válido, sin texto extra, sin markdown, sin backticks, con esta forma exacta:
{"title": string, "bullets": string[]}`;

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

interface DevlogContent {
  title: string;
  bullets: string[];
}

function parseDevlogContent(raw: string): DevlogContent | null {
  const cleaned = raw.trim().replace(/^```(?:json)?/, "").replace(/```$/, "").trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (
      typeof parsed?.title === "string" &&
      Array.isArray(parsed?.bullets) &&
      parsed.bullets.every((b: unknown) => typeof b === "string")
    ) {
      return { title: parsed.title, bullets: parsed.bullets };
    }
    return null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const password = body?.password as string | undefined;
  const rawNotes = body?.rawNotes as string | undefined;

  if (!rawNotes || typeof rawNotes !== "string" || !rawNotes.trim()) {
    return NextResponse.json({ error: "Falta rawNotes" }, { status: 400 });
  }

  const adminPassword = process.env.ADMIN_DEVLOG_PASSWORD;
  if (!adminPassword || !password || !safeEqual(password, adminPassword)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicApiKey) {
    return NextResponse.json({ error: "Falta ANTHROPIC_API_KEY" }, { status: 500 });
  }

  const anthropicRes = await fetch(ANTHROPIC_API, {
    method: "POST",
    headers: {
      "x-api-key": anthropicApiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 1024,
      system: DEVLOG_SYSTEM_PROMPT,
      messages: [{ role: "user", content: rawNotes }],
    }),
  });

  if (!anthropicRes.ok) {
    return NextResponse.json(
      { error: `La API de Anthropic respondió ${anthropicRes.status}` },
      { status: 502 }
    );
  }

  const anthropicJson = await anthropicRes.json();
  const rawText = anthropicJson?.content?.[0]?.text;
  const content = typeof rawText === "string" ? parseDevlogContent(rawText) : null;

  if (!content) {
    return NextResponse.json({ error: "No se pudo interpretar la respuesta de Anthropic" }, { status: 502 });
  }

  const { title, bullets } = content;
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    return NextResponse.json({ error: "Falta DISCORD_WEBHOOK_URL", title, bullets }, { status: 500 });
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
        },
      ],
    }),
  });

  if (!discordRes.ok) {
    return NextResponse.json(
      { error: `Discord respondió ${discordRes.status} al publicar el embed`, title, bullets },
      { status: 502 }
    );
  }

  const admin = createAdminClient();
  const { error: insertError } = await admin.from("devlog_posts").insert({
    title,
    bullets,
    raw_notes: rawNotes,
  });

  if (insertError) {
    // El post ya salió en Discord — no lo tratamos como fallo total, pero
    // avisamos que no quedó guardado.
    return NextResponse.json({ title, bullets, dbError: insertError.message });
  }

  return NextResponse.json({ title, bullets });
}
