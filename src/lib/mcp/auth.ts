import { getSession } from "@/lib/session";
import { verifyMcpToken } from "@/lib/mcp-token";
import {
  checkLoginRate,
  recordLoginFailure,
  recordLoginSuccess,
  getClientIp,
} from "@/lib/rate-limit";

export type AuthResult =
  | { ok: true; via: "token" | "session"; tokenId?: string }
  | { ok: false; status: number; message: string; retryAfter?: number };

// 두 가지 인증 모두 허용: (1) Authorization: Bearer <token> 또는 (2) iron-session authed.
// rate-limit 은 로그인 라우트와 동일한 카운터를 공유 — 무차별 대입에 더 좁아짐.
export async function authenticateMcp(req: Request): Promise<AuthResult> {
  const ip = getClientIp(req);

  const gate = checkLoginRate(ip);
  if (!gate.ok) {
    return {
      ok: false,
      status: 429,
      message: "too many attempts",
      retryAfter: gate.retryAfterSec,
    };
  }

  // 1) Bearer 토큰.
  const authHeader = req.headers.get("authorization");
  if (authHeader) {
    const result = await verifyMcpToken(authHeader);
    if (result.ok) {
      recordLoginSuccess(ip);
      return { ok: true, via: "token", tokenId: result.tokenId };
    }
    // 토큰이 헤더로 왔는데 실패 → 카운터 증가.
    const after = recordLoginFailure(ip);
    if (!after.ok) {
      return {
        ok: false,
        status: 429,
        message: "too many attempts",
        retryAfter: after.retryAfterSec,
      };
    }
    return { ok: false, status: 401, message: "invalid token" };
  }

  // 2) 어드민 세션 쿠키 (브라우저 디버깅용).
  try {
    const session = await getSession();
    if (session.authed) {
      return { ok: true, via: "session" };
    }
  } catch {
    // SESSION_PASSWORD 미설정 등 — 토큰 인증이 없으면 그냥 401.
  }

  return { ok: false, status: 401, message: "unauthorized" };
}
