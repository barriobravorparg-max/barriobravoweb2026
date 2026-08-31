import { NextResponse, type NextRequest } from "next/server";
import { checkDevlogPassword } from "@/lib/devlog/auth";

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_MODEL = "claude-sonnet-5";

const DEVLOG_SYSTEM_PROMPT = `Sos un asistente que convierte notas crudas de desarrollo en un devlog para Discord.
Escribí en español rioplatense (voseo), tono directo, sin relleno ni marketing.
No inventes cambios que no estén explícitamente en las notas — si algo es ambiguo, dejalo afuera.
Respondé ÚNICAMENTE con un JSON válido, sin texto extra, sin markdown, sin backticks, con esta forma exacta:
{"title": string, "bullets": string[]}`;

interface DevlogContent {
  title: string;
  bullets: string[];
}

function parseDevlogContent(raw: string): DevlogContent | null {
  // A pesar de la instrucción de responder solo JSON, el modelo a veces le
  // agrega texto alrededor (una intro, un cierre, backticks). En vez de
  // exigir que TODO el texto sea JSON puro, buscamos el primer objeto
  // { ... } dentro de la respuesta y parseamos solo eso.
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;

  try {
    const parsed = JSON.parse(match[0]);
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

  if (!checkDevlogPassword(password)) {
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
    return NextResponse.json({ error: `La API de Anthropic respondió ${anthropicRes.status}` }, { status: 502 });
  }

  const anthropicJson = await anthropicRes.json();
  // No asumir que la respuesta está en content[0]: cuando el modelo piensa
  // antes de responder, ese bloque "thinking" ocupa la posición 0 y el
  // texto real queda más adelante. Buscamos el primer bloque type: "text".
  const textBlock = Array.isArray(anthropicJson?.content)
    ? anthropicJson.content.find((block: { type?: string }) => block?.type === "text")
    : undefined;
  const rawText = textBlock?.text;
  const content = typeof rawText === "string" ? parseDevlogContent(rawText) : null;

  if (!content) {
    return NextResponse.json(
      {
        error: "No se pudo interpretar la respuesta de Anthropic",
        rawResponse: typeof rawText === "string" ? rawText.slice(0, 2000) : anthropicJson,
      },
      { status: 502 }
    );
  }

  return NextResponse.json(content);
}
