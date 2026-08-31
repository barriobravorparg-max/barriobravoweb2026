import { NextResponse, type NextRequest } from "next/server";
import { checkDevlogPassword } from "@/lib/devlog/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const password = formData.get("password");
  if (!checkDevlogPassword(typeof password === "string" ? password : undefined)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "El archivo tiene que ser una imagen" }, { status: 400 });
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "La imagen pesa más de 10MB" }, { status: 400 });
  }

  const admin = createAdminClient();
  const extension = file.type.split("/")[1] ?? "png";
  const path = `${crypto.randomUUID()}.${extension}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await admin.storage
    .from("devlog-images")
    .upload(path, buffer, { contentType: file.type, upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data } = admin.storage.from("devlog-images").getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
