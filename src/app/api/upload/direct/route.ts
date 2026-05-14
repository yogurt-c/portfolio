import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { randomUUID } from "node:crypto";
import { ALLOWED_MIME, MAX_UPLOAD_BYTES, extByMime } from "@/lib/blob";
import { verifySignedUpload } from "@/lib/upload-sig";

// 사전 서명된 일회용 업로드 엔드포인트.
// /api/mcp 의 create_upload_url 도구로 발급된 URL 만 통과한다.
// 인증은 쿼리스트링 HMAC 으로 갈음 — admin 세션 / Bearer 토큰 모두 필요 없음.
export async function POST(req: Request) {
  const url = new URL(req.url);
  const sig = url.searchParams.get("sig");
  const expRaw = url.searchParams.get("exp");
  const mime = url.searchParams.get("mime");

  if (!sig || !expRaw || !mime) {
    return NextResponse.json({ error: "missing sig/exp/mime" }, { status: 400 });
  }
  if (!ALLOWED_MIME.has(mime)) {
    return NextResponse.json({ error: "unsupported type", mime }, { status: 415 });
  }
  const exp = Number(expRaw);
  if (!verifySignedUpload({ mime, exp, sig })) {
    return NextResponse.json(
      { error: "invalid or expired signature" },
      { status: 401 },
    );
  }

  // content-type 은 서명된 mime 과 일치하거나 application/octet-stream 만 허용.
  // (curl --data-binary 의 기본 content-type 호환)
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType !== mime && contentType !== "application/octet-stream") {
    return NextResponse.json(
      {
        error: "content-type must match mime or be application/octet-stream",
        got: contentType,
      },
      { status: 415 },
    );
  }

  const buf = Buffer.from(await req.arrayBuffer());
  if (buf.byteLength === 0) {
    return NextResponse.json({ error: "empty body" }, { status: 400 });
  }
  if (buf.byteLength > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: "file too large", maxBytes: MAX_UPLOAD_BYTES },
      { status: 413 },
    );
  }

  const key = `projects/${randomUUID()}.${extByMime(mime)}`;
  const result = await put(key, buf, {
    access: "public",
    contentType: mime,
    addRandomSuffix: false,
  });

  return NextResponse.json({ url: result.url });
}
