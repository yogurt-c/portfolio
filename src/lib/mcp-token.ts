import { randomBytes, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

// 평문 토큰 형식: pm_<base64url(32바이트)>. 접두사는 사람이 식별하기 쉽게.
const PREFIX = "pm_";
const RAW_BYTES = 32;

export function generatePlainToken(): string {
  return PREFIX + randomBytes(RAW_BYTES).toString("base64url");
}

export type CreatedToken = {
  id: string;
  label: string;
  plain: string;
  createdAt: Date;
};

export async function createMcpToken(label: string): Promise<CreatedToken> {
  const plain = generatePlainToken();
  const hash = await bcrypt.hash(plain, 12);
  const row = await prisma.mcpToken.create({
    data: { label, hash },
  });
  return { id: row.id, label: row.label, plain, createdAt: row.createdAt };
}

export type TokenSummary = {
  id: string;
  label: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
};

export async function listMcpTokens(): Promise<TokenSummary[]> {
  const rows = await prisma.mcpToken.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      label: true,
      createdAt: true,
      lastUsedAt: true,
      revokedAt: true,
    },
  });
  return rows;
}

export async function revokeMcpToken(id: string): Promise<boolean> {
  try {
    await prisma.mcpToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
    return true;
  } catch {
    return false;
  }
}

// 평문 토큰 검증. 접두사로 사전 필터 후 활성 토큰 전체를 bcrypt 로 비교.
// 활성 토큰이 N 개이면 O(N) 비교. 단일 사용자/기기 수준이라 N 은 한 자리.
export async function verifyMcpToken(
  rawHeader: string | null,
): Promise<{ ok: false } | { ok: true; tokenId: string }> {
  if (!rawHeader) return { ok: false };
  const m = /^Bearer\s+(\S+)$/i.exec(rawHeader);
  if (!m) return { ok: false };
  const plain = m[1]!;

  // 접두사 timing-safe 비교 — 평문 노출되지 않음.
  const prefixBuf = Buffer.from(PREFIX);
  const headBuf = Buffer.from(plain.slice(0, PREFIX.length));
  if (
    headBuf.length !== prefixBuf.length ||
    !timingSafeEqual(headBuf, prefixBuf)
  ) {
    return { ok: false };
  }

  const candidates = await prisma.mcpToken.findMany({
    where: { revokedAt: null },
    select: { id: true, hash: true },
  });
  for (const c of candidates) {
    if (await bcrypt.compare(plain, c.hash)) {
      // best-effort lastUsedAt 갱신. 실패해도 검증 결과는 유효.
      void prisma.mcpToken
        .update({ where: { id: c.id }, data: { lastUsedAt: new Date() } })
        .catch(() => {});
      return { ok: true, tokenId: c.id };
    }
  }
  return { ok: false };
}
