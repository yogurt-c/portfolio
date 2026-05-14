import { createHmac, timingSafeEqual } from "node:crypto";

// /api/upload/direct 의 일회용 업로드 URL 서명.
// SESSION_PASSWORD 를 키로 재사용하되 컨텍스트 태그로 분리해 다른 용도와 충돌하지 않게 한다.
const CONTEXT = "upload-direct/v1";
const TTL_MS = 10 * 60 * 1000;

function getSecret(): string {
  const s = process.env.SESSION_PASSWORD;
  if (!s || s.length < 32) {
    throw new Error("SESSION_PASSWORD must be set (32+ chars)");
  }
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret())
    .update(`${CONTEXT}:${payload}`)
    .digest("base64url");
}

export type SignedUpload = { mime: string; exp: number; sig: string };

export function createSignedUpload(mime: string): SignedUpload {
  const exp = Date.now() + TTL_MS;
  return { mime, exp, sig: sign(`${mime}|${exp}`) };
}

export function verifySignedUpload(input: {
  mime: string;
  exp: number;
  sig: string;
}): boolean {
  if (!Number.isFinite(input.exp) || Date.now() > input.exp) return false;
  const expected = Buffer.from(sign(`${input.mime}|${input.exp}`));
  const given = Buffer.from(input.sig);
  if (expected.length !== given.length) return false;
  return timingSafeEqual(expected, given);
}
