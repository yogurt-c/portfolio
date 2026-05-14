import { NextResponse } from "next/server";
import { authenticateMcp } from "@/lib/mcp/auth";
import { PROTOCOL_VERSION, SERVER_INFO } from "@/lib/mcp/protocol";

export const dynamic = "force-dynamic";

// 클라이언트 셋업 검증용 헬스 체크 — Authorization 헤더로 토큰을 빠르게 검증.
export async function GET(req: Request) {
  const auth = await authenticateMcp(req);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.message },
      { status: auth.status },
    );
  }
  return NextResponse.json({
    ok: true,
    via: auth.via,
    server: SERVER_INFO,
    protocolVersion: PROTOCOL_VERSION,
  });
}
