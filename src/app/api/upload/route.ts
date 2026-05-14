import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { randomUUID } from "node:crypto";
import { requireAdmin } from "@/lib/session";
import { ALLOWED_MIME, MAX_UPLOAD_BYTES, extByMime } from "@/lib/blob";

export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (guard !== true) return guard;

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }

  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json(
      { error: "unsupported type", type: file.type },
      { status: 415 },
    );
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: "file too large", maxBytes: MAX_UPLOAD_BYTES },
      { status: 413 },
    );
  }

  const ext = extByMime(file.type);
  const key = `projects/${randomUUID()}.${ext}`;

  const result = await put(key, file, {
    access: "public",
    contentType: file.type,
    // 동일 키 충돌 시 Vercel 이 임의 접미사를 붙여 새 URL 발급.
    addRandomSuffix: false,
  });

  return NextResponse.json({ url: result.url });
}
